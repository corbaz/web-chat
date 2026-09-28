#!/usr/bin/env bun
// Bridge local: chatea con Claude usando la suscripción de Claude Code del
// usuario (`claude -p` headless) en vez de una API key. Ver
// odd/tasks/claude-subscription-bridge.md.
//
// Arranque manual únicamente: `bun run claude:bridge`. Sin autostart, sin
// servicio, sin carpeta Inicio/LaunchAgent (a diferencia de OpenCode Free).

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  buildAllowResponse,
  buildDenyResponse,
  buildDynamicSystemPrompt,
  buildStreamChatArgv,
  buildStreamChatStdin,
  type ChatImageInput,
  checkBasicAuth,
  type ClaudeCodeModel,
  formatPermissionLog,
  isAllowedOrigin,
  isValidEffort,
  isValidImages,
  isValidModel,
  isValidSessionId,
  MAX_BODY_BYTES,
  MAX_BODY_BYTES_WITH_IMAGES,
  parseStreamChatResult,
  parseStreamLine,
  policyForTool,
} from './args'

const HOSTNAME = '127.0.0.1'
const PORT = Number(process.env.CLAUDE_BRIDGE_PORT) || 4098
const BASIC_AUTH_USER = 'claude'
const CORS_ORIGINS = [
  'https://localhost:5173',
  'https://prompting-chat.vercel.app',
]
const CHAT_TIMEOUT_MS = 180_000

const MODELS_RESPONSE: Array<{ id: ClaudeCodeModel; name: string }> = [
  { id: 'haiku', name: 'Claude Haiku' },
  { id: 'sonnet', name: 'Claude Sonnet' },
  { id: 'opus', name: 'Claude Opus' },
  { id: 'fable', name: 'Claude Fable' },
]

function bridgeDataDir(): string {
  if (process.platform === 'win32') {
    const base =
      process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    return join(base, 'prompting', 'claude-bridge')
  }
  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'prompting',
      'claude-bridge',
    )
  }
  const base = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  return join(base, 'prompting', 'claude-bridge')
}

const DATA_DIR = bridgeDataDir()
const PASSWORD_PATH = join(DATA_DIR, 'password.txt')

// Se necesita como cwd del proceso `claude` (runClaude) sin importar de
// dónde salga la password: con CLAUDE_BRIDGE_PASSWORD seteada, ensurePassword
// nunca la crearía y el spawn fallaría con ENOENT (el cwd no existe).
if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

/** Password de env, o generada una sola vez y reutilizada (ver password.ts
 * de scripts/opencode-free para el mismo patrón). */
function ensurePassword(): string {
  const fromEnv = process.env.CLAUDE_BRIDGE_PASSWORD?.trim()
  if (fromEnv) return fromEnv

  if (existsSync(PASSWORD_PATH)) {
    const existing = readFileSync(PASSWORD_PATH, 'utf8').trim()
    if (existing) return existing
  }
  const password = randomBytes(18).toString('hex')
  writeFileSync(PASSWORD_PATH, password, 'utf8')
  return password
}

const PASSWORD = ensurePassword()

const INSTALL_INSTRUCTIONS =
  'No se encontró el comando "claude". Instalá Claude Code (https://claude.com/claude-code) y ejecutá "claude" y luego "/login" para iniciar sesión con tu suscripción antes de usar este bridge.'

async function findClaudeVersion(): Promise<string | null> {
  try {
    const proc = Bun.spawn(['claude', '--version'], {
      stdout: 'pipe',
      stderr: 'pipe',
    })
    const output = await new Response(proc.stdout).text()
    const exitCode = await proc.exited
    if (exitCode !== 0) return null
    return output.trim() || null
  } catch {
    return null
  }
}

function corsHeaders(origin: string | null): Record<string, string> {
  if (!isAllowedOrigin(origin, CORS_ORIGINS)) return {}
  return {
    'Access-Control-Allow-Origin': origin as string,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Authorization, Content-Type',
    Vary: 'Origin',
  }
}

function jsonResponse(
  body: unknown,
  init: ResponseInit = {},
  origin: string | null = null,
): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...(init.headers as Record<string, string> | undefined),
    },
  })
}

interface RunResult {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

/** Corre `claude` con un argv array (nunca un string de shell). */
// Variables que hacen que Claude Code use otra autenticación (API key,
// gateway, Bedrock, Vertex) en lugar del login de la suscripción. Si están
// definidas, `claude -p` puede cobrar la API o colgarse esperando ese
// backend (visto en macOS el 2026-09-28). Se quitan solo para el proceso
// hijo; el entorno del usuario no cambia.
const NON_SUBSCRIPTION_AUTH_VARS = [
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'ANTHROPIC_BASE_URL',
  'CLAUDE_CODE_USE_BEDROCK',
  'CLAUDE_CODE_USE_VERTEX',
  'CLAUDE_CODE_USE_FOUNDRY',
]

function subscriptionEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env }
  for (const name of NON_SUBSCRIPTION_AUTH_VARS) delete env[name]
  return env
}

// ─── T7: permisos pendientes (Bash pregunta al usuario) ─────────────────────
//
// Mapa en memoria: vive mientras el proceso del bridge esté arriba, se pierde
// al reiniciar (igual que las sesiones de OpenCode Free). `id` es el
// `request_id` que manda Claude Code en el control_request: ya es único por
// pedido, no hace falta inventar otro.
interface PendingPermissionInfo {
  id: string
  sessionId: string
  tool: string
  command?: string
  description?: string
}

interface PendingPermissionEntry extends PendingPermissionInfo {
  resolve: (decision: 'allow' | 'deny') => void
}

const pendingPermissions = new Map<string, PendingPermissionEntry>()

function listPendingPermissions(): PendingPermissionInfo[] {
  return [...pendingPermissions.values()].map(
    ({ resolve: _resolve, ...info }) => info,
  )
}

/** true si encontró y resolvió el permiso; false si ya no existía (resuelto
 * dos veces, vencido, o id inválido). */
function resolvePendingPermission(
  id: string,
  decision: 'allow' | 'deny',
): boolean {
  const entry = pendingPermissions.get(id)
  if (!entry) return false
  pendingPermissions.delete(id)
  entry.resolve(decision)
  return true
}

/** Deniega y limpia los permisos pendientes de UN pedido (desconexión del
 * cliente HTTP, timeout, o fin del proceso). `ids` son los request_id de ese
 * pedido específico, nunca de otro /chat concurrente. */
function denyPendingPermissions(ids: Iterable<string>): void {
  for (const id of ids) resolvePendingPermission(id, 'deny')
}

/** Corre `claude` en modo stream-json manteniendo stdin abierto: T7 necesita
 * poder mandar `control_response` (permisos) mientras el proceso sigue
 * corriendo, así que ya no alcanza con escribir todo el stdin de una vez y
 * cerrar (ver runClaudeWithStdin en T5, reemplazado acá). Lee stdout línea
 * por línea; ante un control_request `can_use_tool` responde solo según la
 * política (auto-aprueba WebSearch/WebFetch o YOLO) o espera la decisión del
 * usuario vía `pendingPermissions` (resuelta desde POST /permission/:id).
 * Cierra stdin recién cuando llega la línea "result". El timeout de 180s se
 * pausa mientras haya un permiso pendiente (el usuario puede tardar en
 * decidir) pero un techo total de ~10 min corta cualquier sesión colgada. Si
 * el cliente HTTP se desconecta (`signal`), deniega lo pendiente y mata el
 * proceso.
 */
const HARD_CAP_MS = 10 * 60 * 1000

interface InteractiveOptions {
  autoApprove: boolean
  signal?: AbortSignal
  onPermissionLog?: (line: string) => void
}

async function runClaudeInteractive(
  argv: string[],
  stdinLine: string,
  options: InteractiveOptions,
): Promise<RunResult> {
  const proc = Bun.spawn(['claude', ...argv], {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const stderrPromise = new Response(proc.stderr).text()

  const myPermissionIds = new Set<string>()
  let sessionId = ''
  let resultRaw = ''
  let timedOut = false
  let idleTimer: ReturnType<typeof setTimeout> | null = null

  function pauseIdleTimeout(): void {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }
  function resumeIdleTimeout(): void {
    pauseIdleTimeout()
    idleTimer = setTimeout(() => {
      timedOut = true
      denyPendingPermissions(myPermissionIds)
      proc.kill()
    }, CHAT_TIMEOUT_MS)
  }

  const hardCapTimer = setTimeout(() => {
    timedOut = true
    denyPendingPermissions(myPermissionIds)
    proc.kill()
  }, HARD_CAP_MS)

  const onAbort = () => {
    timedOut = true
    denyPendingPermissions(myPermissionIds)
    proc.kill()
  }
  options.signal?.addEventListener('abort', onAbort)

  resumeIdleTimeout()

  function writeStdinLine(line: string): void {
    try {
      proc.stdin.write(line)
    } catch {
      // El proceso puede haber muerto (timeout/abort) justo antes de escribir.
    }
  }

  writeStdinLine(stdinLine)

  const reader = proc.stdout.getReader()
  const decoder = new TextDecoder()
  let buffer = ''

  try {
    readLoop: while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      let newlineIndex: number
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex)
        buffer = buffer.slice(newlineIndex + 1)
        const event = parseStreamLine(line)

        if (event.kind === 'session_init') {
          sessionId = event.sessionId
          continue
        }

        if (event.kind === 'result') {
          resultRaw = event.raw
          break readLoop
        }

        if (event.kind === 'can_use_tool') {
          const policy = policyForTool(event.toolName, options.autoApprove)
          if (policy === 'auto-allow') {
            writeStdinLine(buildAllowResponse(event.requestId, event.input))
            options.onPermissionLog?.(
              formatPermissionLog(
                event.toolName,
                event.input,
                'allow',
                options.autoApprove ? 'yolo' : 'auto',
              ),
            )
            continue
          }

          myPermissionIds.add(event.requestId)
          pauseIdleTimeout()
          const decision = await new Promise<'allow' | 'deny'>((resolve) => {
            pendingPermissions.set(event.requestId, {
              id: event.requestId,
              sessionId,
              tool: event.toolName,
              command:
                typeof event.input.command === 'string'
                  ? event.input.command
                  : undefined,
              description:
                typeof event.input.description === 'string'
                  ? event.input.description
                  : undefined,
              resolve,
            })
          })
          myPermissionIds.delete(event.requestId)
          resumeIdleTimeout()

          options.onPermissionLog?.(
            formatPermissionLog(event.toolName, event.input, decision, 'ask'),
          )
          writeStdinLine(
            decision === 'allow'
              ? buildAllowResponse(event.requestId, event.input)
              : buildDenyResponse(
                  event.requestId,
                  'El usuario denegó este comando.',
                ),
          )
          continue
        }

        // 'other' y 'other_control_request' (p. ej. un futuro "initialize"):
        // no requieren respuesta para que el flujo de chat siga andando.
      }
    }
  } finally {
    pauseIdleTimeout()
    clearTimeout(hardCapTimer)
    options.signal?.removeEventListener('abort', onAbort)
    denyPendingPermissions(myPermissionIds)
  }

  try {
    await proc.stdin.end()
  } catch {
    // Proceso ya cerrado (timeout/abort); no hay stdin que cerrar.
  }

  const [stderr, exitCode] = await Promise.all([stderrPromise, proc.exited])
  return { stdout: resultRaw, stderr, exitCode, timedOut }
}

interface ChatRequestBody {
  model?: unknown
  message?: unknown
  sessionId?: unknown
  effort?: unknown
  images?: unknown
  autoApprove?: unknown
}

// Datos de un pedido para el registro en consola. Nunca incluye el texto del
// mensaje, las imágenes ni la contraseña.
interface RequestLog {
  model?: string
  effort?: string
  images?: number
  autoApprove?: boolean
  tokensIn?: number
  tokensOut?: number
  error?: string
}

function formatLog(
  req: Request,
  url: URL,
  status: number,
  ms: number,
  info: RequestLog,
): string {
  const hora = new Date().toLocaleTimeString('es-AR', { hour12: false })
  const parts = [`[${hora}]`, req.method, url.pathname, String(status), `${(ms / 1000).toFixed(1)}s`]
  if (info.model) parts.push(info.model)
  if (info.effort) parts.push(`effort=${info.effort}`)
  if (info.images) parts.push(`imágenes=${info.images}`)
  if (info.autoApprove) parts.push('YOLO')
  if (info.tokensIn !== undefined) parts.push(`tokens=${info.tokensIn}→${info.tokensOut ?? 0}`)
  if (info.error) parts.push(`error: ${info.error.slice(0, 160)}`)
  return parts.join(' ')
}

async function handleChat(
  req: Request,
  origin: string | null,
  log: RequestLog,
): Promise<Response> {
  // El límite chico (MAX_BODY_BYTES) es el que aplica en el caso normal (sin
  // imágenes); acá solo se descarta lo absurdamente grande de entrada. El
  // límite exacto para el pedido sin imágenes se aplica más abajo, una vez
  // que se sabe si vino `images` o no.
  const contentLength = Number(req.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_BYTES_WITH_IMAGES) {
    return jsonResponse(
      { error: 'Cuerpo de la solicitud demasiado grande.' },
      { status: 413 },
      origin,
    )
  }

  const rawBody = await req.text()
  if (rawBody.length > MAX_BODY_BYTES_WITH_IMAGES) {
    return jsonResponse(
      { error: 'Cuerpo de la solicitud demasiado grande.' },
      { status: 413 },
      origin,
    )
  }

  let body: ChatRequestBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'JSON inválido.' }, { status: 400 }, origin)
  }

  if (!isValidModel(body.model)) {
    return jsonResponse(
      {
        error:
          'Modelo inválido. Usa un id completo de Claude (ej. claude-sonnet-4-6) o uno de los alias haiku, sonnet, opus, fable.',
      },
      { status: 400 },
      origin,
    )
  }
  const hasImages = Array.isArray(body.images) && body.images.length > 0
  if (
    typeof body.message !== 'string' ||
    (!body.message.trim() && !hasImages)
  ) {
    return jsonResponse({ error: 'Falta el mensaje.' }, { status: 400 }, origin)
  }
  // Solo imágenes: pedido por defecto (el CLI necesita algo de texto).
  const imageCount = hasImages ? (body.images as unknown[]).length : 0
  const message: string =
    body.message.trim() ||
    (imageCount > 1 ? 'Describe las imágenes.' : 'Describe la imagen.')
  if (body.sessionId !== undefined && !isValidSessionId(body.sessionId)) {
    return jsonResponse(
      { error: 'sessionId inválido (debe ser un UUID).' },
      { status: 400 },
      origin,
    )
  }
  if (body.effort !== undefined && !isValidEffort(body.effort)) {
    return jsonResponse(
      {
        error:
          'Nivel de esfuerzo inválido. Usa low, medium, high, xhigh o max.',
      },
      { status: 400 },
      origin,
    )
  }
  if (body.images !== undefined && !isValidImages(body.images)) {
    return jsonResponse(
      {
        error:
          'Imagen inválida. Usa PNG, JPEG, WEBP o GIF en base64 (máximo 4 imágenes).',
      },
      { status: 400 },
      origin,
    )
  }

  const images: ChatImageInput[] | undefined = isValidImages(body.images)
    ? body.images
    : undefined

  // Sin imágenes, el límite normal (chico) rige igual que antes de T5: el
  // techo grande de arriba solo existe para no cortar imágenes válidas.
  if (!images && rawBody.length > MAX_BODY_BYTES) {
    return jsonResponse(
      { error: 'Cuerpo de la solicitud demasiado grande.' },
      { status: 413 },
      origin,
    )
  }

  const model = body.model
  const sessionId =
    typeof body.sessionId === 'string' ? body.sessionId : undefined
  const effort = isValidEffort(body.effort) ? body.effort : undefined
  // YOLO (user request 2026-09-28): la app manda autoApprove cuando el
  // toggle está prendido. Nunca cambia qué herramientas están disponibles
  // (--tools sigue sin Edit/Write/Read/NotebookEdit), solo salta el modal.
  const autoApprove = body.autoApprove === true
  log.model = model
  log.effort = effort
  log.images = images?.length
  log.autoApprove = autoApprove

  // T7: todo pedido pasa por stream-json (antes solo las imágenes, T5) para
  // que las herramientas con permiso (Bash) funcionen. Sin imágenes, el
  // array simplemente viaja vacío en el content de buildStreamChatStdin.
  const argv = buildStreamChatArgv({
    model,
    sessionId,
    effort,
    systemPrompt: buildDynamicSystemPrompt(),
  })
  const stdinLine = buildStreamChatStdin({ message, images: images ?? [] })

  try {
    const { stdout, stderr, exitCode, timedOut } = await runClaudeInteractive(
      argv,
      stdinLine,
      {
        autoApprove,
        signal: req.signal,
        onPermissionLog: (line) => console.log(line),
      },
    )
    if (timedOut) {
      return jsonResponse(
        { error: 'Claude Code no respondió a tiempo (timeout o cliente desconectado).' },
        { status: 504 },
        origin,
      )
    }
    if (exitCode !== 0) {
      return jsonResponse(
        {
          error: `claude terminó con código ${exitCode}: ${
            stderr.trim() || 'sin detalle'
          }`,
        },
        { status: 502 },
        origin,
      )
    }
    const parsed = parseStreamChatResult(stdout, model)
    log.tokensIn = parsed.tokens?.input
    log.tokensOut = parsed.tokens?.output
    if (parsed.isError) log.error = parsed.error ?? parsed.text
    return jsonResponse(parsed, {}, origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message.includes('ENOENT')) {
      return jsonResponse({ error: INSTALL_INSTRUCTIONS }, { status: 500 }, origin)
    }
    return jsonResponse({ error: message }, { status: 500 }, origin)
  }
}

async function main(): Promise<void> {
  const claudeVersion = await findClaudeVersion()
  const ignored = NON_SUBSCRIPTION_AUTH_VARS.filter((name) => process.env[name])
  if (ignored.length > 0) {
    console.log(
      `Se ignoran para usar tu suscripción: ${ignored.join(', ')} (solo en este bridge).`,
    )
  }
  if (!claudeVersion) {
    console.warn(INSTALL_INSTRUCTIONS)
  }

  const server = Bun.serve({
    hostname: HOSTNAME,
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url)
      const origin = req.headers.get('origin')

      // La preflight de CORS es el único endpoint sin auth (fetch nunca le
      // manda Authorization; el navegador la dispara antes del request real).
      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) })
      }

      if (!checkBasicAuth(req.headers.get('authorization'), BASIC_AUTH_USER, PASSWORD)) {
        console.log(formatLog(req, url, 401, 0, { error: 'contraseña incorrecta' }))
        return jsonResponse(
          { error: 'No autorizado.' },
          {
            status: 401,
            headers: { 'WWW-Authenticate': 'Basic realm="claude-bridge"' },
          },
          origin,
        )
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        const version = await findClaudeVersion()
        return jsonResponse(
          { healthy: version !== null, claudeVersion: version },
          {},
          origin,
        )
      }

      if (url.pathname === '/models' && req.method === 'GET') {
        return jsonResponse(MODELS_RESPONSE, {}, origin)
      }

      // T7: permisos pendientes (Bash preguntándole al usuario). La app
      // sondea GET /permission cada ~1s mientras un /chat está en curso.
      if (url.pathname === '/permission' && req.method === 'GET') {
        return jsonResponse(listPendingPermissions(), {}, origin)
      }

      if (url.pathname.startsWith('/permission/') && req.method === 'POST') {
        const id = decodeURIComponent(url.pathname.slice('/permission/'.length))
        if (!id) {
          return jsonResponse({ error: 'Falta el id del permiso.' }, { status: 400 }, origin)
        }
        let body: { decision?: unknown }
        try {
          body = JSON.parse(await req.text())
        } catch {
          return jsonResponse({ error: 'JSON inválido.' }, { status: 400 }, origin)
        }
        if (body.decision !== 'allow' && body.decision !== 'deny') {
          return jsonResponse(
            { error: 'decision inválida. Usa "allow" o "deny".' },
            { status: 400 },
            origin,
          )
        }
        const resolved = resolvePendingPermission(id, body.decision)
        if (!resolved) {
          return jsonResponse(
            { error: 'Permiso no encontrado (ya resuelto, vencido, o id incorrecto).' },
            { status: 404 },
            origin,
          )
        }
        return jsonResponse({ ok: true }, {}, origin)
      }

      if (url.pathname === '/chat' && req.method === 'POST') {
        const started = Date.now()
        const log: RequestLog = {}
        const response = await handleChat(req, origin, log)
        if (response.status >= 400 && !log.error) {
          try {
            const data = (await response.clone().json()) as { error?: string }
            log.error = data.error
          } catch {
            // Sin cuerpo JSON: el código de estado alcanza.
          }
        }
        console.log(formatLog(req, url, response.status, Date.now() - started, log))
        return response
      }

      return jsonResponse({ error: 'No encontrado.' }, { status: 404 }, origin)
    },
  })

  console.log(`Claude bridge escuchando en http://${server.hostname}:${server.port}`)
  console.log(`Usuario: ${BASIC_AUTH_USER}`)
  console.log(
    process.env.CLAUDE_BRIDGE_PASSWORD
      ? 'Password: la de CLAUDE_BRIDGE_PASSWORD'
      : `Password: ${PASSWORD}`,
  )
  console.log('Registro: una línea por mensaje (sin el texto ni la contraseña).')
  if (claudeVersion) {
    console.log(`claude detectado: ${claudeVersion}`)
  }
  console.log(
    'Requiere Claude Code instalado y con sesión iniciada (ejecutá "claude" y luego "/login").',
  )
}

void main()

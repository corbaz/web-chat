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
  buildChatArgv,
  buildStreamChatArgv,
  buildStreamChatStdin,
  type ChatImageInput,
  checkBasicAuth,
  type ClaudeCodeModel,
  isAllowedOrigin,
  isValidEffort,
  isValidImages,
  isValidModel,
  isValidSessionId,
  MAX_BODY_BYTES,
  MAX_BODY_BYTES_WITH_IMAGES,
  parseClaudeResult,
  parseStreamChatResult,
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
async function runClaude(argv: string[]): Promise<RunResult> {
  const proc = Bun.spawn(['claude', ...argv], {
    cwd: DATA_DIR,
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, CHAT_TIMEOUT_MS)

  try {
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return { stdout, stderr, exitCode, timedOut }
  } finally {
    clearTimeout(timer)
  }
}

/** Igual que runClaude, pero escribe una línea en stdin y la cierra antes de
 * esperar la salida (T5, modo `--input-format stream-json` para imágenes). */
async function runClaudeWithStdin(
  argv: string[],
  stdinLine: string,
): Promise<RunResult> {
  const proc = Bun.spawn(['claude', ...argv], {
    cwd: DATA_DIR,
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  let timedOut = false
  const timer = setTimeout(() => {
    timedOut = true
    proc.kill()
  }, CHAT_TIMEOUT_MS)

  try {
    proc.stdin.write(stdinLine)
    await proc.stdin.end()
    const [stdout, stderr, exitCode] = await Promise.all([
      new Response(proc.stdout).text(),
      new Response(proc.stderr).text(),
      proc.exited,
    ])
    return { stdout, stderr, exitCode, timedOut }
  } finally {
    clearTimeout(timer)
  }
}

interface ChatRequestBody {
  model?: unknown
  message?: unknown
  sessionId?: unknown
  webSearch?: unknown
  effort?: unknown
  images?: unknown
}

// Datos de un pedido para el registro en consola. Nunca incluye el texto del
// mensaje, las imágenes ni la contraseña.
interface RequestLog {
  model?: string
  effort?: string
  images?: number
  webSearch?: boolean
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
  if (info.webSearch) parts.push('web')
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
  const webSearch = body.webSearch === true
  const effort = isValidEffort(body.effort) ? body.effort : undefined
  log.model = model
  log.effort = effort
  log.images = images?.length
  log.webSearch = webSearch

  try {
    const { stdout, stderr, exitCode, timedOut } = images
      ? await runClaudeWithStdin(
          buildStreamChatArgv({ model, sessionId, webSearch, effort }),
          buildStreamChatStdin({ message, images }),
        )
      : await runClaude(
          buildChatArgv({
            model,
            message,
            sessionId,
            webSearch,
            effort,
          }),
        )
    if (timedOut) {
      return jsonResponse(
        { error: 'Claude Code no respondió a tiempo (timeout de 180s).' },
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
    const parsed = images
      ? parseStreamChatResult(stdout, model)
      : parseClaudeResult(stdout, model)
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

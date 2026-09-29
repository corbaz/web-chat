#!/usr/bin/env bun
// Bridge local: chatea con OpenAI usando la suscripción de ChatGPT del
// usuario (`codex app-server` headless, JSON-RPC sobre stdio) en vez de una
// API key. Ver odd/tasks/openai-subscription-bridge.md. Espejo de
// scripts/claude-bridge/server.ts, adaptado al protocolo de `codex
// app-server` (proceso único y persistente, multiplexado por threadId, en
// vez de un `claude -p` por pedido).
//
// Arranque manual únicamente: `bun run codex:bridge`. Sin autostart.

import { randomBytes } from 'node:crypto'
import {
  existsSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  buildRequestLine,
  buildServerResponseLine,
  checkBasicAuth,
  type CodexTurn,
  codexApprovalDecision,
  diffTokenUsage,
  extractFinalAgentText,
  isAllowedOrigin,
  isValidEffort,
  isValidImages,
  isValidModel,
  isValidSessionId,
  MAX_BODY_BYTES,
  MAX_BODY_BYTES_WITH_IMAGES,
  parseCodexLine,
  type TokenUsageBreakdown,
  ZERO_TOKEN_USAGE,
} from './args'

const HOSTNAME = '127.0.0.1'
const PORT = Number(process.env.CODEX_BRIDGE_PORT) || 4094
const BASIC_AUTH_USER = 'codex'
const CORS_ORIGINS = [
  'https://localhost:5173',
  'https://prompting-chat.vercel.app',
]
const CHAT_TIMEOUT_MS = 180_000
const HARD_CAP_MS = 10 * 60 * 1000

function bridgeDataDir(): string {
  if (process.platform === 'win32') {
    const base =
      process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    return join(base, 'prompting', 'codex-bridge')
  }
  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'prompting',
      'codex-bridge',
    )
  }
  const base = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  return join(base, 'prompting', 'codex-bridge')
}

const DATA_DIR = bridgeDataDir()
const IMAGES_DIR = join(DATA_DIR, 'images')
const PASSWORD_PATH = join(DATA_DIR, 'password.txt')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })
if (!existsSync(IMAGES_DIR)) mkdirSync(IMAGES_DIR, { recursive: true })

function ensurePassword(): string {
  const fromEnv = process.env.CODEX_BRIDGE_PASSWORD?.trim()
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
  'No se encontró el comando "codex". Instalá Codex CLI (https://developers.openai.com/codex/cli) y ejecutá "codex" para iniciar sesión con tu suscripción de ChatGPT antes de usar este bridge.'

// Variables que hacen que Codex use una API key en vez del login de la
// suscripción de ChatGPT (mismo criterio que NON_SUBSCRIPTION_AUTH_VARS de
// claude-bridge). Se quitan solo para el proceso hijo.
const NON_SUBSCRIPTION_AUTH_VARS = ['OPENAI_API_KEY', 'OPENAI_BASE_URL']

function subscriptionEnv(): Record<string, string | undefined> {
  const env: Record<string, string | undefined> = { ...process.env }
  for (const name of NON_SUBSCRIPTION_AUTH_VARS) delete env[name]
  return env
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

// ─── Proceso único y persistente de `codex app-server` ────────────────────
//
// A diferencia de claude-bridge (un `claude -p` por pedido), acá se levanta
// UN SOLO proceso `codex app-server` al arrancar el bridge y se reusa para
// todos los chats: cada turno de cada chat viaja por la misma conexión
// JSON-RPC (multiplexada por `threadId`). Esto evita pagar de nuevo, en cada
// mensaje, el contexto fijo del agente Codex (~38k tokens de entrada,
// verificado en vivo) que sí se paga una vez por *thread* nuevo.

let codexProc: ReturnType<typeof Bun.spawn> | null = null
let nextRequestId = 1
const pendingRequests = new Map<
  number,
  { resolve: (v: { result?: unknown; error?: unknown }) => void }
>()

// Aprobaciones pendientes del lado del servidor (item/commandExecution/
// requestApproval, mismo contrato HTTP que claude-bridge: GET /permission +
// POST /permission/:id). El id acá es el que mandó `codex app-server`
// (número propio, ver Verified facts), nunca uno inventado por el bridge.
interface PendingPermissionInfo {
  id: string
  sessionId: string
  tool: string
  command?: string
  description?: string
}
interface PendingPermissionEntry extends PendingPermissionInfo {
  serverRequestId: number | string
  resolve: (decision: 'allow' | 'deny') => void
}
const pendingPermissions = new Map<string, PendingPermissionEntry>()
let permissionCounter = 0

function listPendingPermissions(): PendingPermissionInfo[] {
  return [...pendingPermissions.values()].map(
    ({ resolve: _resolve, serverRequestId: _sid, ...info }) => info,
  )
}

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

// Última lectura acumulada de tokens por thread (`thread/tokenUsage/
// updated`, `tokenUsage.total`): permite calcular el delta de UN turno
// (diffTokenUsage), ver args.ts.
const threadCumulativeTokens = new Map<string, TokenUsageBreakdown>()

// Resolvers de turnos en curso: cuando llega `turn/completed` con un
// `turn.id` que coincide, se resuelve la promesa que espera ese turno
// (permite que /chat espere sin bloquear la lectura de stdout de otros
// chats concurrentes).
const pendingTurns = new Map<
  string,
  { resolve: (turn: CodexTurn) => void; sessionId: string }
>()

function writeToCodex(line: string): void {
  if (!codexProc) return
  try {
    codexProc.stdin.write(line)
  } catch {
    // El proceso puede haber muerto; se reintenta en el próximo pedido
    // (startCodexProcess se llama de nuevo desde ensureCodexProcess).
  }
}

function callCodex(method: string, params?: unknown): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const id = nextRequestId++
    pendingRequests.set(id, {
      resolve: ({ result, error }) => {
        if (error) reject(new Error(formatRpcError(error)))
        else resolve(result)
      },
    })
    writeToCodex(buildRequestLine(id, method, params))
  })
}

function formatRpcError(error: unknown): string {
  if (error && typeof error === 'object') {
    const record = error as { message?: unknown }
    if (typeof record.message === 'string') return record.message
  }
  try {
    return JSON.stringify(error)
  } catch {
    return 'Error desconocido de codex app-server'
  }
}

async function findCodexVersion(): Promise<string | null> {
  try {
    const proc = Bun.spawn(['codex', '--version'], {
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

function handleServerRequest(id: number | string, method: string, params: unknown): void {
  // Verificado en vivo: `item/commandExecution/requestApproval` (protocolo
  // actual). Se responde igual ante el nombre legado `execCommandApproval`
  // por si un `codex` más viejo lo manda (mismo shape de `decision`).
  if (
    method === 'item/commandExecution/requestApproval' ||
    method === 'execCommandApproval'
  ) {
    const p = (params ?? {}) as {
      threadId?: string
      command?: string
      commandActions?: Array<{ command?: string }>
    }
    const permissionId = `perm_${++permissionCounter}`
    const commandText =
      p.command || p.commandActions?.[0]?.command || undefined
    pendingPermissions.set(permissionId, {
      id: permissionId,
      serverRequestId: id,
      sessionId: p.threadId || '',
      tool: 'command',
      command: commandText,
      resolve: (decision) => {
        writeToCodex(
          buildServerResponseLine(id, {
            decision: codexApprovalDecision(decision),
          }),
        )
      },
    })
    return
  }

  // Otros tipos de aprobación (cambios de archivo, permisos MCP, etc.): sin
  // ruta interactiva implementada todavía (ver Progress en el feature doc,
  // riesgo conocido). Se niegan en el momento (fail-safe cerrado) para no
  // colgar el turno esperando una respuesta que nunca llega.
  if (
    method === 'item/fileChange/requestApproval' ||
    method === 'applyPatchApproval' ||
    method === 'item/permissions/requestApproval'
  ) {
    writeToCodex(buildServerResponseLine(id, { decision: 'decline' }))
    return
  }

  // Pedido del servidor sin manejador conocido: se responde con un error
  // JSON-RPC en vez de dejarlo colgado (algunos, como account/
  // chatgptAuthTokens/refresh, no deberían aparecer en este flujo).
  writeToCodex(
    `${JSON.stringify({
      jsonrpc: '2.0',
      id,
      error: { code: -32601, message: `Método no manejado: ${method}` },
    })}\n`,
  )
}

function handleNotification(method: string, params: unknown): void {
  if (method === 'thread/tokenUsage/updated') {
    const p = params as { threadId?: string; tokenUsage?: { total?: TokenUsageBreakdown } }
    if (p.threadId && p.tokenUsage?.total) {
      threadCumulativeTokens.set(p.threadId, p.tokenUsage.total)
    }
    return
  }

  if (method === 'turn/completed') {
    const p = params as { threadId?: string; turn?: CodexTurn }
    const turn = p.turn
    if (turn?.id && pendingTurns.has(turn.id)) {
      const entry = pendingTurns.get(turn.id)
      if (entry) {
        pendingTurns.delete(turn.id)
        entry.resolve(turn)
      }
    }
    return
  }
  // El resto de las notificaciones (item/started, item/agentMessage/delta,
  // hook/*, mcpServer/startupStatus/updated, account/*, etc.) no hace falta
  // procesarlas: el bridge solo necesita el texto final y el uso de tokens.
}

function startCodexProcess(): void {
  codexProc = Bun.spawn(['codex', 'app-server'], {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })

  void (async () => {
    const text = await new Response(codexProc?.stderr as ReadableStream).text()
    if (text.trim()) console.error('[codex app-server stderr]', text.trim())
  })()

  void (async () => {
    if (!codexProc) return
    const reader = codexProc.stdout.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        let newlineIndex: number
        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          const line = buffer.slice(0, newlineIndex)
          buffer = buffer.slice(newlineIndex + 1)
          const event = parseCodexLine(line)
          if (event.kind === 'clientResponse') {
            const entry = pendingRequests.get(event.id)
            if (entry) {
              pendingRequests.delete(event.id)
              entry.resolve({ result: event.result, error: event.error })
            }
          } else if (event.kind === 'serverRequest') {
            handleServerRequest(event.id, event.method, event.params)
          } else if (event.kind === 'notification') {
            handleNotification(event.method, event.params)
          }
        }
      }
    } catch (error) {
      console.error('[codex app-server] error leyendo stdout:', error)
    }
  })()

  codexProc.exited.then((code) => {
    console.error(`[codex app-server] proceso terminado (código ${code}); reintentando en 2s`)
    codexProc = null
    for (const [, entry] of pendingRequests) {
      entry.resolve({ error: { message: 'codex app-server se cerró' } })
    }
    pendingRequests.clear()
    setTimeout(() => void ensureCodexProcess(), 2000)
  })
}

let initializePromise: Promise<void> | null = null

async function ensureCodexProcess(): Promise<void> {
  if (codexProc) return
  startCodexProcess()
  initializePromise = callCodex('initialize', {
    clientInfo: { name: 'codex-bridge', version: '0.1.0' },
  }).then(() => undefined)
  await initializePromise
}

// ─── /models ────────────────────────────────────────────────────────────

interface CodexModelInfo {
  id: string
  name: string
  vision: boolean
  effortLevels: string[]
  defaultEffort: string
  isDefault: boolean
}

async function fetchModels(): Promise<CodexModelInfo[]> {
  await ensureCodexProcess()
  const result = (await callCodex('model/list', {})) as {
    data?: Array<{
      id: string
      displayName?: string
      model?: string
      inputModalities?: string[]
      supportedReasoningEfforts?: Array<{ reasoningEffort: string }>
      defaultReasoningEffort?: string
      isDefault?: boolean
      hidden?: boolean
    }>
  }
  const data = result?.data ?? []
  return data
    .filter((m) => !m.hidden)
    .map((m) => ({
      id: m.id,
      name: m.displayName || m.id,
      vision: (m.inputModalities ?? []).includes('image'),
      effortLevels: (m.supportedReasoningEfforts ?? []).map((e) => e.reasoningEffort),
      defaultEffort: m.defaultReasoningEffort || '',
      isDefault: m.isDefault === true,
    }))
}

// ─── /chat ──────────────────────────────────────────────────────────────

interface ChatRequestBody {
  model?: unknown
  message?: unknown
  sessionId?: unknown
  effort?: unknown
  images?: unknown
  autoApprove?: unknown
}

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

/** Extensión de archivo a partir del mimetype (para el nombre del temporal). */
function extensionFor(mimeType: string): string {
  if (mimeType === 'image/jpeg') return 'jpg'
  if (mimeType === 'image/png') return 'png'
  if (mimeType === 'image/webp') return 'webp'
  if (mimeType === 'image/gif') return 'gif'
  return 'bin'
}

/** Escribe cada imagen a un archivo temporal (verificado en vivo: `codex
 * app-server` no acepta base64 embebido en `turn/start`, solo rutas vía
 * `localImage`, ver Verified facts). Devuelve las rutas para borrarlas
 * después de la respuesta. */
function writeTempImages(
  images: Array<{ mimeType: string; data: string }>,
): string[] {
  const paths: string[] = []
  for (const image of images) {
    const filename = `${randomBytes(8).toString('hex')}.${extensionFor(image.mimeType)}`
    const path = join(IMAGES_DIR, filename)
    writeFileSync(path, Buffer.from(image.data, 'base64'))
    paths.push(path)
  }
  return paths
}

function cleanupTempFiles(paths: string[]): void {
  for (const path of paths) {
    try {
      rmSync(path, { force: true })
    } catch {
      // No es crítico: se acumula en IMAGES_DIR si falla, sin datos
      // sensibles más allá de lo que ya mandó el usuario a este bridge.
    }
  }
}

async function resolveThreadId(
  sessionId: string | undefined,
  cwd: string,
  sandbox: 'read-only' | 'workspace-write',
  approvalPolicy: 'untrusted' | 'never',
): Promise<string> {
  if (sessionId) {
    try {
      const resumed = (await callCodex('thread/resume', {
        threadId: sessionId,
        excludeTurns: true,
      })) as { thread?: { id?: string } }
      if (resumed?.thread?.id) return resumed.thread.id
    } catch {
      // El thread pudo haberse perdido (proceso reiniciado sin persistir, o
      // id de otra corrida): se cae a crear uno nuevo.
    }
  }
  const started = (await callCodex('thread/start', {
    cwd,
    sandbox,
    approvalPolicy,
  })) as { thread?: { id?: string } }
  const threadId = started?.thread?.id
  if (!threadId) throw new Error('codex app-server no devolvió threadId en thread/start')
  return threadId
}

async function handleChat(
  req: Request,
  origin: string | null,
  log: RequestLog,
): Promise<Response> {
  const contentLength = Number(req.headers.get('content-length') || '0')
  if (contentLength > MAX_BODY_BYTES_WITH_IMAGES) {
    return jsonResponse({ error: 'Cuerpo de la solicitud demasiado grande.' }, { status: 413 }, origin)
  }

  const rawBody = await req.text()
  if (rawBody.length > MAX_BODY_BYTES_WITH_IMAGES) {
    return jsonResponse({ error: 'Cuerpo de la solicitud demasiado grande.' }, { status: 413 }, origin)
  }

  let body: ChatRequestBody
  try {
    body = JSON.parse(rawBody)
  } catch {
    return jsonResponse({ error: 'JSON inválido.' }, { status: 400 }, origin)
  }

  if (!isValidModel(body.model)) {
    return jsonResponse({ error: 'Modelo inválido.' }, { status: 400 }, origin)
  }
  const hasImages = Array.isArray(body.images) && body.images.length > 0
  if (typeof body.message !== 'string' || (!body.message.trim() && !hasImages)) {
    return jsonResponse({ error: 'Falta el mensaje.' }, { status: 400 }, origin)
  }
  const imageCount = hasImages ? (body.images as unknown[]).length : 0
  const message: string =
    body.message.trim() ||
    (imageCount > 1 ? 'Describe las imágenes.' : 'Describe la imagen.')

  if (body.sessionId !== undefined && !isValidSessionId(body.sessionId)) {
    return jsonResponse({ error: 'sessionId inválido (debe ser un UUID).' }, { status: 400 }, origin)
  }
  if (body.effort !== undefined && !isValidEffort(body.effort)) {
    return jsonResponse({ error: 'Nivel de esfuerzo inválido.' }, { status: 400 }, origin)
  }
  if (body.images !== undefined && !isValidImages(body.images)) {
    return jsonResponse(
      { error: 'Imagen inválida. Usa PNG, JPEG, WEBP o GIF en base64 (máximo 4 imágenes).' },
      { status: 400 },
      origin,
    )
  }

  const images = isValidImages(body.images) ? body.images : undefined
  if (!images && rawBody.length > MAX_BODY_BYTES) {
    return jsonResponse({ error: 'Cuerpo de la solicitud demasiado grande.' }, { status: 413 }, origin)
  }

  const model = body.model
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined
  const effort = isValidEffort(body.effort) ? body.effort : undefined
  const autoApprove = body.autoApprove === true
  log.model = model
  log.effort = effort
  log.images = images?.length
  log.autoApprove = autoApprove

  const sandbox = autoApprove ? 'workspace-write' : 'read-only'
  // 'never': modo full-auto (comandos corren sin preguntar, solo dentro del
  // sandbox workspace-write). 'untrusted': pregunta antes de cada comando
  // (verificado en vivo con sandbox read-only, ver Verified facts). No hay
  // forma de deshabilitar herramientas por completo en este protocolo (a
  // diferencia de claude-bridge, sin `--tools`): el sandbox es el único
  // control de alcance (ver Riesgos en el feature doc).
  const approvalPolicy = autoApprove ? 'never' : 'untrusted'

  let tempImagePaths: string[] = []
  try {
    await ensureCodexProcess()

    const threadId = await resolveThreadId(sessionId, DATA_DIR, sandbox, approvalPolicy)

    const input: unknown[] = []
    if (images && images.length > 0) {
      tempImagePaths = writeTempImages(images)
      for (const path of tempImagePaths) input.push({ type: 'localImage', path })
    }
    input.push({ type: 'text', text: message })

    const beforeTokens = threadCumulativeTokens.get(threadId) ?? ZERO_TOKEN_USAGE

    const startResult = (await callCodex('turn/start', {
      threadId,
      input,
      ...(effort ? { effort } : {}),
    })) as { turn?: { id?: string } }
    const turnId = startResult?.turn?.id
    if (!turnId) throw new Error('codex app-server no devolvió turnId en turn/start')

    const myPermissionIds: string[] = []
    for (const [id, entry] of pendingPermissions) {
      if (entry.sessionId === threadId) myPermissionIds.push(id)
    }

    const completedTurn = await new Promise<CodexTurn>((resolve, reject) => {
      let timedOut = false
      let idleTimer: ReturnType<typeof setTimeout> | null = null
      const hardCapTimer = setTimeout(() => {
        timedOut = true
        pendingTurns.delete(turnId)
        void callCodex('turn/interrupt', { threadId }).catch(() => {})
        reject(new Error('TIMEOUT'))
      }, HARD_CAP_MS)

      function resumeIdle(): void {
        if (idleTimer) clearTimeout(idleTimer)
        idleTimer = setTimeout(() => {
          if (timedOut) return
          timedOut = true
          clearTimeout(hardCapTimer)
          pendingTurns.delete(turnId)
          void callCodex('turn/interrupt', { threadId }).catch(() => {})
          reject(new Error('TIMEOUT'))
        }, CHAT_TIMEOUT_MS)
      }
      resumeIdle()

      // Mientras haya un permiso pendiente de ESTE thread, el timeout de
      // inactividad se pausa (el usuario puede tardar en decidir), igual
      // que en claude-bridge.
      const checkInterval = setInterval(() => {
        const hasPending = [...pendingPermissions.values()].some(
          (p) => p.sessionId === threadId,
        )
        if (hasPending) {
          if (idleTimer) {
            clearTimeout(idleTimer)
            idleTimer = null
          }
        } else if (!idleTimer && !timedOut) {
          resumeIdle()
        }
      }, 500)

      pendingTurns.set(turnId, {
        sessionId: threadId,
        resolve: (turn) => {
          clearTimeout(hardCapTimer)
          if (idleTimer) clearTimeout(idleTimer)
          clearInterval(checkInterval)
          if (!timedOut) resolve(turn)
        },
      })
    })

    const afterTokens = threadCumulativeTokens.get(threadId) ?? beforeTokens
    const tokens = diffTokenUsage(beforeTokens, afterTokens)
    log.tokensIn = tokens.input
    log.tokensOut = tokens.output

    const text = extractFinalAgentText(completedTurn)
    const isError = completedTurn.status !== 'completed' || Boolean(completedTurn.error)
    if (isError) log.error = completedTurn.error?.message

    return jsonResponse(
      {
        text,
        sessionId: threadId,
        model,
        tokens,
        isError,
        error: isError ? completedTurn.error?.message || 'El turno no se completó' : undefined,
      },
      {},
      origin,
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'TIMEOUT') {
      return jsonResponse(
        { error: 'Codex no respondió a tiempo (timeout o cliente desconectado).' },
        { status: 504 },
        origin,
      )
    }
    if (message.includes('ENOENT')) {
      return jsonResponse({ error: INSTALL_INSTRUCTIONS }, { status: 500 }, origin)
    }
    return jsonResponse({ error: message }, { status: 500 }, origin)
  } finally {
    cleanupTempFiles(tempImagePaths)
  }
}

async function main(): Promise<void> {
  const codexVersion = await findCodexVersion()
  const ignored = NON_SUBSCRIPTION_AUTH_VARS.filter((name) => process.env[name])
  if (ignored.length > 0) {
    console.log(`Se ignoran para usar tu suscripción: ${ignored.join(', ')} (solo en este bridge).`)
  }
  if (!codexVersion) {
    console.warn(INSTALL_INSTRUCTIONS)
  } else {
    void ensureCodexProcess().catch((error) => {
      console.error('No se pudo iniciar codex app-server:', error)
    })
  }

  const server = Bun.serve({
    hostname: HOSTNAME,
    port: PORT,
    async fetch(req) {
      const url = new URL(req.url)
      const origin = req.headers.get('origin')

      if (req.method === 'OPTIONS') {
        return new Response(null, { status: 204, headers: corsHeaders(origin) })
      }

      if (!checkBasicAuth(req.headers.get('authorization'), BASIC_AUTH_USER, PASSWORD)) {
        console.log(formatLog(req, url, 401, 0, { error: 'contraseña incorrecta' }))
        return jsonResponse(
          { error: 'No autorizado.' },
          { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="codex-bridge"' } },
          origin,
        )
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        const version = await findCodexVersion()
        return jsonResponse({ healthy: version !== null && codexProc !== null, codexVersion: version }, {}, origin)
      }

      if (url.pathname === '/models' && req.method === 'GET') {
        try {
          const models = await fetchModels()
          return jsonResponse(models, {}, origin)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return jsonResponse({ error: message }, { status: 502 }, origin)
        }
      }

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
          return jsonResponse({ error: 'decision inválida. Usa "allow" o "deny".' }, { status: 400 }, origin)
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

  console.log(`Codex bridge escuchando en http://${server.hostname}:${server.port}`)
  console.log(`Usuario: ${BASIC_AUTH_USER}`)
  console.log(
    process.env.CODEX_BRIDGE_PASSWORD
      ? 'Password: la de CODEX_BRIDGE_PASSWORD'
      : `Password: ${PASSWORD}`,
  )
  console.log('Registro: una línea por mensaje (sin el texto ni la contraseña).')
  if (codexVersion) {
    console.log(`codex detectado: ${codexVersion}`)
  }
  console.log('Requiere Codex CLI instalado y con sesión iniciada (ejecutá "codex" y seguí el login).')
}

void main()

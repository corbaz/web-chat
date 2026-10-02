#!/usr/bin/env bun
// Bridge local: chatea con Gemini usando la suscripción de Google AI Pro del
// usuario (Antigravity CLI `agy`, headless en modo stream-json) en vez de una
// API key. Ver odd/tasks/gemini-subscription-bridge.md. Espejo de
// scripts/codex-bridge/server.ts, pero con UN proceso `agy` por conversación
// (agy no multiplexa conversaciones en un mismo proceso).
//
// Arranque manual únicamente: `bun run gemini:bridge`. Sin autostart.

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import {
  type AgyResult,
  type AgyUsage,
  buildAgyArgv,
  buildFirstMessage,
  buildSubscriptionEnv,
  buildUserLine,
  checkBasicAuth,
  type GeminiModelInfo,
  isAllowedOrigin,
  isKnownModel,
  isValidModel,
  isValidSessionId,
  MAX_BODY_BYTES,
  NON_SUBSCRIPTION_AUTH_VARS,
  parseAgyLine,
  parseModelsOutput,
  resultToBody,
} from './args'

const HOSTNAME = '127.0.0.1'
const PORT = Number(process.env.GEMINI_BRIDGE_PORT) || 4092
const BASIC_AUTH_USER = 'gemini'
const CORS_ORIGINS = [
  'https://localhost:5173',
  'https://prompting-chat.vercel.app',
]
// Un turno de agy tarda 25-45 s (verificado en vivo); tope generoso.
const TURN_HARD_CAP_MS = 5 * 60 * 1000
const IDLE_KILL_MS = 10 * 60 * 1000
const MODELS_TTL_MS = 10 * 60 * 1000

function bridgeDataDir(): string {
  if (process.platform === 'win32') {
    const base =
      process.env.LOCALAPPDATA || join(homedir(), 'AppData', 'Local')
    return join(base, 'prompting', 'gemini-bridge')
  }
  if (process.platform === 'darwin') {
    return join(
      homedir(),
      'Library',
      'Application Support',
      'prompting',
      'gemini-bridge',
    )
  }
  const base = process.env.XDG_DATA_HOME || join(homedir(), '.local', 'share')
  return join(base, 'prompting', 'gemini-bridge')
}

const DATA_DIR = bridgeDataDir()
const PASSWORD_PATH = join(DATA_DIR, 'password.txt')

if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true })

function ensurePassword(): string {
  const fromEnv = process.env.GEMINI_BRIDGE_PASSWORD?.trim()
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
  'No se encontró el comando "agy". Instalá Antigravity CLI (https://antigravity.google/) y ejecutá "agy" para iniciar sesión con tu cuenta de Google AI Pro antes de usar este bridge.'

function subscriptionEnv(): Record<string, string | undefined> {
  return buildSubscriptionEnv(process.env)
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

// ─── agy: versión y modelos ───────────────────────────────────────────────

async function runAgy(args: string[]): Promise<{ code: number; stdout: string }> {
  const proc = Bun.spawn(['agy', ...args], {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const [stdout] = await Promise.all([
    new Response(proc.stdout).text(),
    new Response(proc.stderr).text(),
  ])
  return { code: await proc.exited, stdout }
}

async function findAgyVersion(): Promise<string | null> {
  try {
    const { code, stdout } = await runAgy(['--version'])
    if (code !== 0) return null
    return stdout.trim() || null
  } catch {
    return null
  }
}

let modelsCache: { models: GeminiModelInfo[]; fetchedAt: number } | null = null
let modelsInFlight: Promise<GeminiModelInfo[]> | null = null

async function fetchModels(): Promise<GeminiModelInfo[]> {
  if (modelsCache && Date.now() - modelsCache.fetchedAt < MODELS_TTL_MS) {
    return modelsCache.models
  }
  if (!modelsInFlight) {
    modelsInFlight = (async () => {
      const { code, stdout } = await runAgy(['models'])
      const models = parseModelsOutput(stdout)
      if (code !== 0 || models.length === 0) {
        throw new Error('`agy models` no devolvió modelos (¿iniciaste sesión en agy?).')
      }
      modelsCache = { models, fetchedAt: Date.now() }
      return models
    })().finally(() => {
      modelsInFlight = null
    })
  }
  return modelsInFlight
}

// ─── Sesiones: un proceso `agy` persistente por conversación ──────────────

interface AgySession {
  proc: ReturnType<typeof Bun.spawn>
  model: string
  conversationId: string | null
  alive: boolean
  stderrTail: string
  pending: {
    resolve: (result: AgyResult) => void
    reject: (error: Error) => void
  } | null
  // Cola: los turnos de una misma conversación se serializan.
  queue: Promise<unknown>
  idleTimer: ReturnType<typeof setTimeout> | null
}

const sessions = new Map<string, AgySession>()

// Última lectura acumulada de `usage` por conversación (ver usageDelta en
// args.ts): sobrevive a que el proceso muera o cambie el modelo.
const lastUsageByConversation = new Map<string, AgyUsage>()

function killSession(session: AgySession): void {
  if (session.idleTimer) clearTimeout(session.idleTimer)
  session.idleTimer = null
  if (session.conversationId && sessions.get(session.conversationId) === session) {
    sessions.delete(session.conversationId)
  }
  try {
    session.proc.kill()
  } catch {
    // Ya terminó.
  }
}

function armIdleTimer(session: AgySession): void {
  if (session.idleTimer) clearTimeout(session.idleTimer)
  session.idleTimer = setTimeout(() => killSession(session), IDLE_KILL_MS)
}

function registerConversation(session: AgySession, conversationId: string): void {
  if (!session.conversationId) session.conversationId = conversationId
  sessions.set(session.conversationId, session)
}

function spawnSession(model: string, conversationId?: string): AgySession {
  const proc = Bun.spawn(buildAgyArgv(model, conversationId), {
    cwd: DATA_DIR,
    env: subscriptionEnv(),
    stdin: 'pipe',
    stdout: 'pipe',
    stderr: 'pipe',
  })
  const session: AgySession = {
    proc,
    model,
    conversationId: conversationId ?? null,
    alive: true,
    stderrTail: '',
    pending: null,
    queue: Promise.resolve(),
    idleTimer: null,
  }
  if (conversationId) sessions.set(conversationId, session)
  armIdleTimer(session)

  void (async () => {
    const reader = (proc.stderr as ReadableStream<Uint8Array>).getReader()
    const decoder = new TextDecoder()
    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        session.stderrTail = (session.stderrTail + decoder.decode(value, { stream: true })).slice(-500)
      }
    } catch {
      // Proceso terminado.
    }
  })()

  void (async () => {
    const reader = (proc.stdout as ReadableStream<Uint8Array>).getReader()
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
          const event = parseAgyLine(line)
          if (event.kind === 'init') {
            registerConversation(session, event.conversationId)
          } else if (event.kind === 'result') {
            if (event.result.conversation_id) {
              registerConversation(session, event.result.conversation_id)
            }
            if (process.env.GEMINI_BRIDGE_DEBUG) {
              console.log('[agy result]', JSON.stringify({ ...event.result, response: `<${event.result.response?.length ?? 0} chars>` }))
            }
            const pending = session.pending
            session.pending = null
            pending?.resolve(event.result)
          }
        }
      }
    } catch (error) {
      console.error('[agy] error leyendo stdout:', error)
    }
  })()

  void proc.exited.then((code) => {
    session.alive = false
    if (session.idleTimer) clearTimeout(session.idleTimer)
    if (session.conversationId && sessions.get(session.conversationId) === session) {
      sessions.delete(session.conversationId)
    }
    const pending = session.pending
    session.pending = null
    pending?.reject(
      new Error(
        `agy se cerró (código ${code})${session.stderrTail.trim() ? `: ${session.stderrTail.trim().slice(-200)}` : ''}`,
      ),
    )
  })

  return session
}

/** Manda un turno y espera el `result`. Los turnos de una sesión se
 * serializan. Si pasa el tope duro se mata el proceso (la conversación sigue
 * reanudable con --conversation). */
function runTurn(session: AgySession, text: string): Promise<AgyResult> {
  const turn = session.queue.then(
    () =>
      new Promise<AgyResult>((resolve, reject) => {
        if (!session.alive) {
          reject(new Error('agy se cerró antes de recibir el mensaje'))
          return
        }
        if (session.idleTimer) clearTimeout(session.idleTimer)
        const cap = setTimeout(() => {
          session.pending = null
          killSession(session)
          reject(new Error('TIMEOUT'))
        }, TURN_HARD_CAP_MS)
        session.pending = {
          resolve: (result) => {
            clearTimeout(cap)
            armIdleTimer(session)
            resolve(result)
          },
          reject: (error) => {
            clearTimeout(cap)
            reject(error)
          },
        }
        try {
          const stdin = session.proc.stdin as {
            write: (chunk: string) => unknown
            flush?: () => unknown
          }
          stdin.write(buildUserLine(text))
          stdin.flush?.()
        } catch (error) {
          clearTimeout(cap)
          session.pending = null
          reject(error instanceof Error ? error : new Error(String(error)))
        }
      }),
  )
  session.queue = turn.catch(() => undefined)
  return turn
}

// ─── /chat ──────────────────────────────────────────────────────────────

interface ChatRequestBody {
  model?: unknown
  message?: unknown
  sessionId?: unknown
}

interface RequestLog {
  model?: string
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
  if (info.tokensIn !== undefined) parts.push(`tokens=${info.tokensIn}→${info.tokensOut ?? 0}`)
  if (info.error) parts.push(`error: ${info.error.slice(0, 160)}`)
  return parts.join(' ')
}

async function handleChat(
  req: Request,
  origin: string | null,
  log: RequestLog,
): Promise<Response> {
  const rawBody = await req.text()
  if (rawBody.length > MAX_BODY_BYTES) {
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
  if (typeof body.message !== 'string' || !body.message.trim()) {
    return jsonResponse({ error: 'Falta el mensaje.' }, { status: 400 }, origin)
  }
  if (body.sessionId !== undefined && !isValidSessionId(body.sessionId)) {
    return jsonResponse({ error: 'sessionId inválido (debe ser un UUID).' }, { status: 400 }, origin)
  }

  const model = body.model
  const message = body.message.trim()
  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : undefined
  log.model = model

  try {
    let known: Set<string> | null = null
    try {
      known = new Set((await fetchModels()).map((m) => m.id))
    } catch {
      // Sin lista (agy sin sesión o error de red): no se bloquea acá, el
      // error real aparece en el turno.
    }
    if (known && !isKnownModel(model, known)) {
      return jsonResponse(
        {
          error: `agy no tiene el modelo "${model}". Elegí uno de la lista de Gemini (suscripción).`,
        },
        { status: 400 },
        origin,
      )
    }

    let session = sessionId ? sessions.get(sessionId) : undefined
    if (session && (!session.alive || session.model !== model)) {
      killSession(session)
      session = undefined
    }
    // Conversación nueva: se anteponen las instrucciones (agy no tiene flag
    // de system prompt). Al reanudar con --conversation ya están en el
    // historial de agy.
    const isNewConversation = !sessionId
    if (!session) session = spawnSession(model, sessionId)

    const text = isNewConversation ? buildFirstMessage(message) : message
    const result = await runTurn(session, text)

    const conversationId =
      session.conversationId || result.conversation_id || sessionId || ''
    const responseBody = resultToBody(
      result,
      conversationId,
      model,
      lastUsageByConversation.get(conversationId),
    )
    if (result.usage && conversationId) {
      lastUsageByConversation.set(conversationId, result.usage)
    }
    log.tokensIn = responseBody.tokens.input
    log.tokensOut = responseBody.tokens.output
    if (responseBody.isError) log.error = responseBody.error
    return jsonResponse(responseBody, {}, origin)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    if (message === 'TIMEOUT') {
      return jsonResponse(
        { error: 'Gemini no respondió a tiempo (más de 5 minutos).' },
        { status: 504 },
        origin,
      )
    }
    if (message.includes('ENOENT')) {
      return jsonResponse({ error: INSTALL_INSTRUCTIONS }, { status: 500 }, origin)
    }
    return jsonResponse({ error: message }, { status: 500 }, origin)
  }
}

async function main(): Promise<void> {
  const agyVersion = await findAgyVersion()
  const ignored = NON_SUBSCRIPTION_AUTH_VARS.filter((name) => process.env[name])
  if (ignored.length > 0) {
    console.log(`Se ignoran para usar tu suscripción: ${ignored.join(', ')} (solo en este bridge).`)
  }
  if (!agyVersion) console.warn(INSTALL_INSTRUCTIONS)

  const server = Bun.serve({
    hostname: HOSTNAME,
    port: PORT,
    // Un turno puede tardar minutos: sin esto Bun corta a los 10 s.
    idleTimeout: 255,
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
          { status: 401, headers: { 'WWW-Authenticate': 'Basic realm="gemini-bridge"' } },
          origin,
        )
      }

      if (url.pathname === '/health' && req.method === 'GET') {
        const version = await findAgyVersion()
        return jsonResponse({ healthy: version !== null, agyVersion: version }, {}, origin)
      }

      if (url.pathname === '/models' && req.method === 'GET') {
        try {
          return jsonResponse(await fetchModels(), {}, origin)
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error)
          return jsonResponse({ error: message }, { status: 502 }, origin)
        }
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

  const shutdown = () => {
    for (const session of [...sessions.values()]) killSession(session)
    process.exit(0)
  }
  process.on('SIGINT', shutdown)
  process.on('SIGTERM', shutdown)

  console.log(`Gemini bridge escuchando en http://${server.hostname}:${server.port}`)
  console.log(`Usuario: ${BASIC_AUTH_USER}`)
  console.log(
    process.env.GEMINI_BRIDGE_PASSWORD
      ? 'Password: la de GEMINI_BRIDGE_PASSWORD'
      : `Password: ${PASSWORD}`,
  )
  console.log('Registro: una línea por mensaje (sin el texto ni la contraseña).')
  if (agyVersion) console.log(`agy detectado: ${agyVersion}`)
  console.log('Requiere Antigravity CLI (agy) instalado y con sesión de Google AI Pro. Cada respuesta tarda ~25-45 s.')
}

void main()

// Helpers puros del bridge de Claude (T1, ver
// odd/tasks/claude-subscription-bridge.md): construcción del argv de `claude
// -p`, parseo del JSON de resultado y chequeos de CORS/auth. Sin dependencia
// de Bun.serve ni de red: testeables con `bun test` sin proceso real.

// Alias históricos de Claude Code (T1-T3): se siguen aceptando por
// compatibilidad hacia atrás, pero el catálogo de la app (T4) ya usa ids
// completos de Anthropic (claude-opus-5-5, claude-sonnet-4-6, ...).
export const MODEL_ALLOWLIST = ['haiku', 'sonnet', 'opus', 'fable'] as const
export type ClaudeCodeModel = (typeof MODEL_ALLOWLIST)[number]

// Ids completos: siempre empiezan con "claude-" y solo minúsculas/dígitos/
// puntos/guiones (lo que acepta `--model` de Claude Code).
const FULL_MODEL_ID_PATTERN = /^claude-[a-z0-9.-]+$/

export function isValidModel(model: unknown): model is string {
  if (typeof model !== 'string' || model.length === 0) return false
  if ((MODEL_ALLOWLIST as readonly string[]).includes(model)) return true
  return FULL_MODEL_ID_PATTERN.test(model)
}

// Niveles de esfuerzo de `claude -p --effort` (T4, ver Verified facts en el
// feature doc: aceptado en todos los modelos probados).
export const EFFORT_LEVELS = ['low', 'medium', 'high', 'xhigh', 'max'] as const
export type EffortLevel = (typeof EFFORT_LEVELS)[number]

export function isValidEffort(effort: unknown): effort is EffortLevel {
  return (
    typeof effort === 'string' &&
    (EFFORT_LEVELS as readonly string[]).includes(effort)
  )
}

// Visión (T5, ver Verified facts en el feature doc): todos los modelos de
// chat de Anthropic aceptan imágenes (models.dev), vía el modo
// `--input-format stream-json` de Claude Code, no el `-p "<msg>"` normal.
export const IMAGE_MIME_ALLOWLIST = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
] as const
export type ImageMimeType = (typeof IMAGE_MIME_ALLOWLIST)[number]

export const MAX_IMAGES_PER_MESSAGE = 4

export interface ChatImageInput {
  mimeType: ImageMimeType
  data: string
}

function isValidImageMime(value: unknown): value is ImageMimeType {
  return (
    typeof value === 'string' &&
    (IMAGE_MIME_ALLOWLIST as readonly string[]).includes(value)
  )
}

// Chequeo de forma (no valida que decodifique a una imagen real): rechaza
// basura obvia antes de gastar un proceso `claude` en ella.
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/

function isValidImageData(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && BASE64_PATTERN.test(value)
  )
}

function isValidImage(value: unknown): value is ChatImageInput {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return isValidImageMime(record.mimeType) && isValidImageData(record.data)
}

/**
 * Valida un array de imágenes (campo opcional del body: llamar solo cuando
 * `body.images !== undefined`, ver handleChat). Rechaza `[]` — si no hay
 * imágenes, el campo no debería venir.
 */
export function isValidImages(value: unknown): value is ChatImageInput[] {
  if (!Array.isArray(value)) return false
  if (value.length === 0 || value.length > MAX_IMAGES_PER_MESSAGE) return false
  return value.every(isValidImage)
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidSessionId(id: unknown): id is string {
  return typeof id === 'string' && UUID_PATTERN.test(id)
}

// Prompt de sistema del chat: idéntico espíritu al agente "chat" de OpenCode
// Free (ver scripts/opencode-free/config.ts) pero sin mencionar herramientas
// que acá directamente no existen (--tools "" salvo búsqueda web explícita).
export const CHAT_SYSTEM_PROMPT =
  'Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos ni uses herramientas locales.'

export interface ChatArgsInput {
  model: string
  message: string
  sessionId?: string
  webSearch?: boolean
  effort?: EffortLevel
}

/**
 * Arma el argv de `claude -p` (nunca un string de shell). Nunca habilita
 * herramientas locales: `--tools ""` salvo que se pida búsqueda web, en cuyo
 * caso se reemplaza por `--tools WebSearch --allowedTools WebSearch`.
 */
export function buildChatArgv(input: ChatArgsInput): string[] {
  const argv = [
    '-p',
    input.message,
    '--output-format',
    'json',
    '--model',
    input.model,
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--system-prompt',
    CHAT_SYSTEM_PROMPT,
  ]

  appendCommonChatFlags(argv, input)

  return argv
}

/** Flags compartidas por buildChatArgv y buildStreamChatArgv (T5): mismo
 * comportamiento de effort/búsqueda web/resume en ambos modos. */
function appendCommonChatFlags(
  argv: string[],
  input: Pick<ChatArgsInput, 'effort' | 'webSearch' | 'sessionId'>,
): void {
  if (input.effort) {
    argv.push('--effort', input.effort)
  }

  if (input.webSearch) {
    argv.push('--tools', 'WebSearch', '--allowedTools', 'WebSearch')
  } else {
    argv.push('--tools', '')
  }

  if (input.sessionId) {
    argv.push('--resume', input.sessionId)
  }
}

export interface StreamChatArgsInput {
  model: string
  sessionId?: string
  webSearch?: boolean
  effort?: EffortLevel
}

/**
 * Arma el argv de `claude -p --input-format stream-json --output-format
 * stream-json --verbose` (T5, visión): el mensaje NO va como argumento
 * posicional acá, viaja por stdin como una línea JSON (ver
 * buildStreamChatStdin). Mismas garantías que buildChatArgv: nunca habilita
 * herramientas locales.
 */
export function buildStreamChatArgv(input: StreamChatArgsInput): string[] {
  const argv = [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--model',
    input.model,
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--system-prompt',
    CHAT_SYSTEM_PROMPT,
  ]

  appendCommonChatFlags(argv, input)

  return argv
}

export interface StreamChatStdinInput {
  message: string
  images: ChatImageInput[]
}

/**
 * Arma la única línea JSON que se escribe en stdin para el modo stream-json
 * (una imagen o más, en el orden recibido, seguidas del texto). Incluye el
 * salto de línea final: el protocolo de Claude Code es un JSON por línea.
 */
export function buildStreamChatStdin(input: StreamChatStdinInput): string {
  const content: unknown[] = [
    ...input.images.map((image) => ({
      type: 'image',
      source: {
        type: 'base64',
        media_type: image.mimeType,
        data: image.data,
      },
    })),
    { type: 'text', text: input.message },
  ]

  const line = JSON.stringify({
    type: 'user',
    message: { role: 'user', content },
  })

  return `${line}\n`
}

interface ClaudeCliUsage {
  input_tokens?: number
  output_tokens?: number
}

interface ClaudeCliResult {
  type?: string
  result?: string
  is_error?: boolean
  session_id?: string
  usage?: ClaudeCliUsage
  modelUsage?: Record<string, unknown>
  total_cost_usd?: number
}

export interface ParsedChatResult {
  text: string
  sessionId: string
  model: string
  tokens: { input: number; output: number }
  costUsd: number
  isError: boolean
  error?: string
}

/**
 * `modelUsage` puede traer, además del modelo pedido, una entrada de fondo de
 * Haiku (guardas internas de Claude Code). Se prioriza: el id exacto pedido
 * si aparece; si no, cualquier entrada que no sea ese Haiku de fondo (solo
 * cuando lo pedido no era Haiku); si no hay ninguna, la primera clave; y si
 * `modelUsage` no vino, el modelo pedido sin resolver.
 */
function pickReportedModel(
  modelUsageKeys: string[],
  requestedModel: string,
): string {
  if (modelUsageKeys.length === 0) return requestedModel
  if (modelUsageKeys.includes(requestedModel)) return requestedModel

  const requestedIsHaiku =
    requestedModel === 'haiku' || requestedModel.includes('haiku')
  if (!requestedIsHaiku) {
    const nonHaiku = modelUsageKeys.find((key) => !key.includes('haiku'))
    if (nonHaiku) return nonHaiku
  }

  return modelUsageKeys[0]
}

/** Extrae ParsedChatResult de un objeto ya parseado (mismos campos en el
 * modo `--output-format json` y en la línea `"type":"result"` del modo
 * `--output-format stream-json`, ver Verified facts en el feature doc). */
function buildParsedChatResult(
  data: ClaudeCliResult,
  requestedModel: string,
): ParsedChatResult {
  const modelUsageKeys = data.modelUsage ? Object.keys(data.modelUsage) : []
  const realModel = pickReportedModel(modelUsageKeys, requestedModel)
  const isError = data.is_error === true

  return {
    text: typeof data.result === 'string' ? data.result : '',
    sessionId: typeof data.session_id === 'string' ? data.session_id : '',
    model: realModel,
    tokens: {
      input: data.usage?.input_tokens ?? 0,
      output: data.usage?.output_tokens ?? 0,
    },
    costUsd: typeof data.total_cost_usd === 'number' ? data.total_cost_usd : 0,
    isError,
    error: isError
      ? data.result || 'Error desconocido de Claude Code'
      : undefined,
  }
}

/**
 * Parsea el JSON que imprime `claude -p --output-format json`. El id real del
 * modelo usado sale de `modelUsage` (ver pickReportedModel y Verified facts
 * en el feature doc); si no viene, se conserva el alias/id pedido.
 */
export function parseClaudeResult(
  raw: string,
  requestedModel: string,
): ParsedChatResult {
  let data: ClaudeCliResult
  try {
    data = JSON.parse(raw)
  } catch {
    return {
      text: '',
      sessionId: '',
      model: requestedModel,
      tokens: { input: 0, output: 0 },
      costUsd: 0,
      isError: true,
      error: 'No se pudo interpretar la respuesta de Claude Code (JSON inválido).',
    }
  }

  return buildParsedChatResult(data, requestedModel)
}

/**
 * Parsea la salida de `claude -p --output-format stream-json` (T5, visión):
 * un JSON por línea; se ignora cualquier línea que no sea JSON válido o que
 * no tenga `"type":"result"` (eventos de sistema, thinking, mensajes
 * intermedios). Mismos campos que parseClaudeResult una vez encontrada esa
 * línea (ver Verified facts en el feature doc). Sin esa línea (proceso
 * cortado a mitad de stream, etc.) devuelve isError con un mensaje claro.
 */
export function parseStreamChatResult(
  raw: string,
  requestedModel: string,
): ParsedChatResult {
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed) continue

    let data: ClaudeCliResult
    try {
      data = JSON.parse(trimmed)
    } catch {
      continue
    }

    if (data.type === 'result') {
      return buildParsedChatResult(data, requestedModel)
    }
  }

  return {
    text: '',
    sessionId: '',
    model: requestedModel,
    tokens: { input: 0, output: 0 },
    costUsd: 0,
    isError: true,
    error:
      'No se encontró la línea de resultado en la respuesta de Claude Code.',
  }
}

/** Compara dos strings sin filtrar cuánto coinciden por temporización. */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }
  return diff === 0
}

/** Valida el header `Authorization: Basic ...` contra usuario/password. */
export function checkBasicAuth(
  authHeader: string | null,
  username: string,
  password: string,
): boolean {
  if (!authHeader || !authHeader.startsWith('Basic ')) return false

  let decoded: string
  try {
    decoded = atob(authHeader.slice('Basic '.length))
  } catch {
    return false
  }

  const separatorIndex = decoded.indexOf(':')
  if (separatorIndex === -1) return false

  const user = decoded.slice(0, separatorIndex)
  const pass = decoded.slice(separatorIndex + 1)
  return constantTimeEqual(user, username) && constantTimeEqual(pass, password)
}

export function isAllowedOrigin(
  origin: string | null,
  allowlist: readonly string[],
): boolean {
  return typeof origin === 'string' && allowlist.includes(origin)
}

export const MAX_BODY_BYTES = 200 * 1024

// Con imágenes en base64 (~1.33x el tamaño binario) el límite normal se
// queda corto: T5 sube el techo a ~16 MB solo para pedidos que traen
// `images` (ver handleChat en server.ts).
export const MAX_BODY_BYTES_WITH_IMAGES = 16 * 1024 * 1024

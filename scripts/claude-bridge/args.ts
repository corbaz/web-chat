// Helpers puros del bridge de Claude (T1, ver
// odd/tasks/claude-subscription-bridge.md): construcción del argv de `claude
// -p`, parseo del JSON de resultado y chequeos de CORS/auth. Sin dependencia
// de Bun.serve ni de red: testeables con `bun test` sin proceso real.

import { LINKS_AND_IMAGES_RULE } from '../../src/config/chatInstructions'

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

// PDF nativo (ver odd/tasks/file-attachments.md): mismo criterio que las
// imágenes de arriba, `--input-format stream-json` acepta bloques
// `document` además de `image`.
export const PDF_MIME_TYPE = 'application/pdf'
export const MAX_DOCUMENTS_PER_MESSAGE = 4

export interface ChatDocumentInput {
  mimeType: typeof PDF_MIME_TYPE
  data: string
  filename: string
}

function isValidDocumentMime(value: unknown): value is typeof PDF_MIME_TYPE {
  return value === PDF_MIME_TYPE
}

function isValidDocumentData(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length > 0 && BASE64_PATTERN.test(value)
  )
}

// Nombre de archivo: sin separadores de ruta ni caracteres de control (nunca
// se usa como ruta real, pero igual se sanea antes de loguear/mostrar).
const SAFE_FILENAME_PATTERN = /^[^\\/\u0000-\u001f]{1,255}$/

function isValidFilename(value: unknown): value is string {
  return typeof value === 'string' && SAFE_FILENAME_PATTERN.test(value)
}

function isValidDocument(value: unknown): value is ChatDocumentInput {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return (
    isValidDocumentMime(record.mimeType) &&
    isValidDocumentData(record.data) &&
    isValidFilename(record.filename)
  )
}

/**
 * Valida un array de documentos PDF (campo opcional del body: llamar solo
 * cuando `body.documents !== undefined`, ver handleChat). Rechaza `[]`.
 */
export function isValidDocuments(value: unknown): value is ChatDocumentInput[] {
  if (!Array.isArray(value)) return false
  if (value.length === 0 || value.length > MAX_DOCUMENTS_PER_MESSAGE) {
    return false
  }
  return value.every(isValidDocument)
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
  'Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos ni uses herramientas locales. ' +
  LINKS_AND_IMAGES_RULE

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

  return argv
}

/** Flags compartidas por buildStreamChatArgv (T7): effort/resume. El manejo
 * de `--tools` es fijo ahí (Bash,WebFetch,WebSearch + permission-prompt-tool
 * stdio), así que no se comparte con buildChatArgv (modo viejo sin permisos,
 * T1-T6, todavía usado por sus propios tests). */
function appendCommonChatFlags(
  argv: string[],
  input: Pick<StreamChatArgsInput, 'effort' | 'sessionId'>,
): void {
  if (input.effort) {
    argv.push('--effort', input.effort)
  }

  if (input.sessionId) {
    argv.push('--resume', input.sessionId)
  }
}

// Herramientas con permiso (T7, ver Verified facts en el feature doc):
// nunca Edit/Write/Read/NotebookEdit. Bash siempre pregunta; WebSearch y
// WebFetch se auto-aprueban en la política del bridge (solo lectura web),
// ver policyForTool más abajo.
export const PERMISSION_TOOLS = ['Bash', 'WebFetch', 'WebSearch'] as const
export type PermissionTool = (typeof PERMISSION_TOOLS)[number]

export interface StreamChatArgsInput {
  model: string
  sessionId?: string
  effort?: EffortLevel
  /** Prompt de sistema completo para este pedido (con fecha/hora, T7); si
   * falta, se usa CHAT_SYSTEM_PROMPT a secas (compatibilidad en tests). */
  systemPrompt?: string
}

/**
 * Arma el argv de `claude -p --input-format stream-json --output-format
 * stream-json --verbose --permission-prompt-tool stdio` (T5 visión + T7
 * permisos): el mensaje NO va como argumento posicional acá, viaja por
 * stdin como una línea JSON (ver buildStreamChatStdin). `--tools` siempre
 * lista Bash,WebFetch,WebSearch (nunca Edit/Write/Read/NotebookEdit): con
 * `--permission-prompt-tool stdio` cada uso de herramienta pasa por el
 * protocolo de control (control_request/control_response) en vez de
 * ejecutarse o denegarse solo, así que ya no hace falta un flag separado
 * para búsqueda web (antes T1-T6: `--tools ""` vs `--tools WebSearch`).
 */
export function buildStreamChatArgv(input: StreamChatArgsInput): string[] {
  const argv = [
    '-p',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--verbose',
    '--permission-prompt-tool',
    'stdio',
    '--tools',
    PERMISSION_TOOLS.join(','),
    '--model',
    input.model,
    '--setting-sources',
    '',
    '--strict-mcp-config',
    '--system-prompt',
    input.systemPrompt || CHAT_SYSTEM_PROMPT,
  ]

  appendCommonChatFlags(argv, input)

  return argv
}

export interface StreamChatStdinInput {
  message: string
  images: ChatImageInput[]
  documents?: ChatDocumentInput[]
}

/**
 * Arma la única línea JSON que se escribe en stdin para el modo stream-json
 * (imágenes y documentos PDF, en el orden recibido, seguidos del texto).
 * Incluye el salto de línea final: el protocolo de Claude Code es un JSON
 * por línea. Verificado en vivo 2026-09-28: un bloque `document` con un PDF
 * generado responde citando el texto (ver Progress en el feature doc).
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
    ...(input.documents ?? []).map((doc) => ({
      type: 'document',
      source: {
        type: 'base64',
        media_type: doc.mimeType,
        data: doc.data,
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

// ─── T7: fecha/hora en el system prompt ─────────────────────────────────────

/** "lunes, 28 de septiembre de 2026, 10:32" en horario de Argentina. */
export function formatBuenosAiresDateTime(now: Date): string {
  return now.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

/** Hora UTC en ISO 8601 (`toISOString`), para que el modelo tenga un ancla
 * sin ambigüedad de huso horario además de la hora local de Argentina. */
export function formatUtcIso(now: Date): string {
  return now.toISOString()
}

/**
 * System prompt completo por pedido (T7, user request 2026-09-28): fecha y
 * hora actuales (Argentina + ISO UTC) y la nota sobre Bash con permiso. Se
 * genera de nuevo en cada /chat (nunca se cachea): el reloj no debe
 * congelarse en una conversación larga con --resume.
 */
export function buildDynamicSystemPrompt(now: Date = new Date()): string {
  return [
    CHAT_SYSTEM_PROMPT,
    '',
    `Fecha y hora actual en Argentina (America/Argentina/Buenos_Aires): ${formatBuenosAiresDateTime(now)}. Hora UTC (ISO 8601): ${formatUtcIso(now)}.`,
    '',
    'Podés usar la herramienta Bash, pero solo cuando lo que pide el usuario realmente necesita la computadora local (ejecutar un comando, revisar archivos, un cálculo con herramientas del sistema, etc.); para todo lo demás respondé directamente con tu conocimiento, sin ejecutar nada. Cada comando que propongas necesita que el usuario lo apruebe antes de correr: explicá brevemente qué vas a hacer.',
  ].join('\n')
}

// ─── T7: herramientas con permiso ───────────────────────────────────────────

/**
 * Decide si una herramienta se auto-aprueba o si hay que preguntarle al
 * usuario. `autoApprove` es el modo "YOLO" (toggle de la app, ver
 * odd/tasks/claude-subscription-bridge.md): aprueba todo sin preguntar, pero
 * nunca cambia qué herramientas están disponibles (`--tools` sigue sin
 * Edit/Write/Read/NotebookEdit).
 */
export type PermissionPolicyDecision = 'auto-allow' | 'ask'

const WEB_READ_ONLY_TOOLS: readonly string[] = ['WebSearch', 'WebFetch']

export function policyForTool(
  toolName: string,
  autoApprove: boolean,
): PermissionPolicyDecision {
  if (autoApprove) return 'auto-allow'
  if (WEB_READ_ONLY_TOOLS.includes(toolName)) return 'auto-allow'
  return 'ask'
}

// ─── T7: protocolo de control (--permission-prompt-tool stdio) ─────────────
//
// Verificado en vivo 2026-09-28 (ver Verified facts en el feature doc): el
// CLI manda por stdout una línea `{"type":"control_request","request_id":
// "...","request":{"subtype":"can_use_tool","tool_name":"Bash","input":
// {...}}}` y espera en stdin `{"type":"control_response","response":
// {"subtype":"success","request_id":"<mismo id>","response":{"behavior":
// "allow","updatedInput":<input>}}}` (o "deny" + "message"). Herramientas
// "seguras" (p. ej. `echo`) el propio CLI las corre sin pedir permiso: el
// control_request solo aparece para comandos que Claude Code considera que
// lo necesitan.

export interface CanUseToolRequest {
  kind: 'can_use_tool'
  requestId: string
  toolName: string
  input: Record<string, unknown>
}

export interface OtherControlRequest {
  kind: 'other_control_request'
  requestId: string
  subtype: string
}

export interface ResultLineEvent {
  kind: 'result'
  raw: string
}

export interface SessionInitEvent {
  kind: 'session_init'
  sessionId: string
}

export interface OtherLineEvent {
  kind: 'other'
}

export type StreamLineEvent =
  | CanUseToolRequest
  | OtherControlRequest
  | ResultLineEvent
  | SessionInitEvent
  | OtherLineEvent

/**
 * Clasifica una línea de `--output-format stream-json` (una por evento).
 * Nunca lanza: JSON inválido o sin los campos esperados cae en `other`.
 */
export function parseStreamLine(line: string): StreamLineEvent {
  const trimmed = line.trim()
  if (!trimmed) return { kind: 'other' }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(trimmed)
  } catch {
    return { kind: 'other' }
  }
  if (!data || typeof data !== 'object') return { kind: 'other' }

  if (data.type === 'result') {
    return { kind: 'result', raw: trimmed }
  }

  if (
    data.type === 'system' &&
    data.subtype === 'init' &&
    typeof data.session_id === 'string' &&
    data.session_id
  ) {
    return { kind: 'session_init', sessionId: data.session_id }
  }

  if (data.type === 'control_request' && typeof data.request_id === 'string') {
    const request = data.request as Record<string, unknown> | undefined
    if (request?.subtype === 'can_use_tool') {
      const input =
        request.input && typeof request.input === 'object'
          ? (request.input as Record<string, unknown>)
          : {}
      return {
        kind: 'can_use_tool',
        requestId: data.request_id,
        toolName: typeof request.tool_name === 'string' ? request.tool_name : '',
        input,
      }
    }
    return {
      kind: 'other_control_request',
      requestId: data.request_id,
      subtype: typeof request?.subtype === 'string' ? request.subtype : '',
    }
  }

  return { kind: 'other' }
}

/** Línea `control_response` de "allow" (incluye el salto de línea final). */
export function buildAllowResponse(
  requestId: string,
  input: Record<string, unknown>,
): string {
  return `${JSON.stringify({
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: requestId,
      response: { behavior: 'allow', updatedInput: input },
    },
  })}\n`
}

/** Línea `control_response` de "deny" (incluye el salto de línea final). */
export function buildDenyResponse(requestId: string, message: string): string {
  return `${JSON.stringify({
    type: 'control_response',
    response: {
      subtype: 'success',
      request_id: requestId,
      response: { behavior: 'deny', message },
    },
  })}\n`
}

/**
 * Línea de registro para una decisión de permiso: herramienta + primeros 120
 * caracteres del comando/URL, nunca el texto del mensaje ni datos sensibles.
 * `[YOLO]` marca lo auto-aprobado por el toggle (no por la política normal
 * de WebSearch/WebFetch, que se marca `[auto]`).
 */
export function formatPermissionLog(
  toolName: string,
  input: Record<string, unknown>,
  decision: 'allow' | 'deny',
  origin: 'ask' | 'auto' | 'yolo',
): string {
  const detail =
    typeof input.command === 'string'
      ? input.command
      : typeof input.url === 'string'
        ? input.url
        : ''
  const marker = origin === 'yolo' ? ' [YOLO]' : origin === 'auto' ? ' [auto]' : ''
  return `permiso ${toolName} -> ${decision}${marker}: ${detail.slice(0, 120)}`
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

// Con imágenes o documentos PDF en base64 (~1.33x el tamaño binario) el
// límite normal se queda corto: T5 sube el techo a ~16 MB para pedidos que
// traen `images` y/o `documents` (ver handleChat en server.ts).
export const MAX_BODY_BYTES_WITH_IMAGES = 16 * 1024 * 1024

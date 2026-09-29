// Helpers puros del bridge de Codex (OpenAI, suscripción de ChatGPT vía
// `codex app-server`, ver odd/tasks/openai-subscription-bridge.md). Sin
// dependencia de Bun.serve ni de red: testeables con `bun test` sin proceso
// real. Espejo de scripts/claude-bridge/args.ts, adaptado al protocolo
// JSON-RPC de `codex app-server` (en vez de `claude -p --output-format
// stream-json`).

import { LINKS_AND_IMAGES_RULE } from '../../src/config/chatInstructions'

// codex-cli acepta cualquier id de modelo que el propio `model/list` liste
// (catálogo dinámico, ver Verified facts en el feature doc): a diferencia de
// Claude Code no hay un patrón fijo tipo "claude-*", así que solo se valida
// que sea un string no vacío razonable.
export function isValidModel(model: unknown): model is string {
  return typeof model === 'string' && model.length > 0 && model.length <= 128
}

// Los niveles de esfuerzo salen de `model/list` (`supportedReasoningEfforts`,
// ver Verified facts): no son un enum fijo como en Claude Code, así que solo
// se valida forma (string corto, sin espacios raros).
export function isValidEffort(effort: unknown): effort is string {
  return (
    typeof effort === 'string' &&
    effort.length > 0 &&
    effort.length <= 32 &&
    /^[a-z0-9_-]+$/i.test(effort)
  )
}

// Visión (ver Verified facts): `codex app-server` no acepta imágenes en
// base64 inline en `turn/start` (el esquema `UserInput` solo tiene
// `image`/`localImage` con url/fileId/path, nunca datos embebidos). El
// bridge escribe cada imagen a un archivo temporal y manda `localImage` con
// esa ruta absoluta (ver server.ts). Mismo allowlist de mimetypes que
// claude-bridge.
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
 * `body.images !== undefined`, ver handleChat). Rechaza `[]`.
 */
export function isValidImages(value: unknown): value is ChatImageInput[] {
  if (!Array.isArray(value)) return false
  if (value.length === 0 || value.length > MAX_IMAGES_PER_MESSAGE) return false
  return value.every(isValidImage)
}

// PDF nativo: `codex app-server` no tiene un tipo `document`/`pdf` en
// `UserInput` (a diferencia de Claude Code, ver Verified facts en el feature
// doc). El bridge nunca acepta `documents`: la app ya no manda `pdf-native`
// para este proveedor (ver src/config/pdf.ts, supportsPdf devuelve false
// para 'codexsub'), así que este campo queda documentado como no soportado.

// sessionId = threadId de codex (UUIDv7, misma forma que un UUID normal).
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function isValidSessionId(id: unknown): id is string {
  return typeof id === 'string' && UUID_PATTERN.test(id)
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
// queda corto (mismo criterio que claude-bridge; sin `documents` acá, ver
// arriba).
export const MAX_BODY_BYTES_WITH_IMAGES = 16 * 1024 * 1024

// ─── JSON-RPC (`codex app-server`, protocolo verificado en vivo 2026-09-28,
// ver Verified facts en el feature doc) ──────────────────────────────────

export interface JsonRpcRequestLine {
  jsonrpc: '2.0'
  id: number
  method: string
  params?: unknown
}

/** Línea JSON-RPC de un pedido del cliente (incluye el salto de línea:
 * `codex app-server` habla un JSON por línea sobre stdio, igual que el
 * `--output-format stream-json` de Claude Code). */
export function buildRequestLine(
  id: number,
  method: string,
  params?: unknown,
): string {
  const line: JsonRpcRequestLine = { jsonrpc: '2.0', id, method, params }
  return `${JSON.stringify(line)}\n`
}

/** Línea de respuesta a un pedido DEL SERVIDOR (item/commandExecution/
 * requestApproval, etc.): el `id` es el que mandó el servidor, no el nuestro
 * (dos secuencias de ids independientes, ver Verified facts). */
export function buildServerResponseLine(
  id: number | string,
  result: unknown,
): string {
  return `${JSON.stringify({ jsonrpc: '2.0', id, result })}\n`
}

export type CodexMessage =
  | { kind: 'clientResponse'; id: number; result?: unknown; error?: unknown }
  | { kind: 'serverRequest'; id: number | string; method: string; params: unknown }
  | { kind: 'notification'; method: string; params: unknown }
  | { kind: 'other' }

/**
 * Clasifica una línea de stdout de `codex app-server`. Nunca lanza: JSON
 * inválido cae en `other`.
 */
export function parseCodexLine(line: string): CodexMessage {
  const trimmed = line.trim()
  if (!trimmed) return { kind: 'other' }

  let data: Record<string, unknown>
  try {
    data = JSON.parse(trimmed)
  } catch {
    return { kind: 'other' }
  }
  if (!data || typeof data !== 'object') return { kind: 'other' }

  const hasMethod = typeof data.method === 'string'
  const hasId = data.id !== undefined && data.id !== null

  if (hasMethod && hasId) {
    return {
      kind: 'serverRequest',
      id: data.id as number | string,
      method: data.method as string,
      params: data.params,
    }
  }
  if (hasMethod) {
    return { kind: 'notification', method: data.method as string, params: data.params }
  }
  if (hasId && typeof data.id === 'number') {
    return { kind: 'clientResponse', id: data.id, result: data.result, error: data.error }
  }
  return { kind: 'other' }
}

// ─── Aprobaciones de comandos (item/commandExecution/requestApproval,
// verificado en vivo: `availableDecisions` incluye "accept" y "cancel"; se
// usa "decline" para negar sin cortar el turno, ver
// CommandExecutionApprovalDecision en el schema generado) ─────────────────

export type BridgeDecision = 'allow' | 'deny'

/** Mapea la decisión del usuario (mismo contrato HTTP que claude-bridge,
 * "allow"/"deny") al valor que espera `item/commandExecution/
 * requestApproval`: "decline" deja que el turno siga (el modelo puede
 * reintentar o seguir sin ese comando), a diferencia de "cancel" que corta
 * el turno entero. */
export function codexApprovalDecision(decision: BridgeDecision): string {
  return decision === 'allow' ? 'accept' : 'decline'
}

// ─── Extracción de texto final y uso de tokens de las notificaciones ──────

export interface CodexAgentMessageItem {
  type: string
  text?: string
  phase?: string | null
}

export interface CodexTurn {
  id: string
  status: string
  items?: CodexAgentMessageItem[]
  error?: { message?: string } | null
}

/**
 * Texto final de un turno completado (`turn/completed`, `params.turn`): se
 * concatenan los items `agentMessage` con `phase: "final_answer"` (o
 * cualquier `agentMessage` si ninguno trae ese phase, modelos viejos, ver
 * MessagePhase en el schema). Vacío si el turno fue interrumpido/falló sin
 * texto.
 */
export function extractFinalAgentText(turn: CodexTurn): string {
  const items = turn.items ?? []
  const finalAnswers = items.filter(
    (item) => item.type === 'agentMessage' && item.phase === 'final_answer',
  )
  const source = finalAnswers.length > 0
    ? finalAnswers
    : items.filter((item) => item.type === 'agentMessage')
  return source
    .map((item) => item.text ?? '')
    .join('')
    .trim()
}

export interface TokenUsageBreakdown {
  inputTokens: number
  cachedInputTokens: number
  outputTokens: number
  reasoningOutputTokens: number
  totalTokens: number
}

export const ZERO_TOKEN_USAGE: TokenUsageBreakdown = {
  inputTokens: 0,
  cachedInputTokens: 0,
  outputTokens: 0,
  reasoningOutputTokens: 0,
  totalTokens: 0,
}

/**
 * Delta entre dos lecturas acumuladas de `thread/tokenUsage/updated`
 * (`tokenUsage.total`, ver Verified facts): el costo real de UN turno, no de
 * todo el hilo. `before` es la última lectura acumulada antes de mandar
 * `turn/start`; `after`, la última vista antes de `turn/completed` para ese
 * `turnId`.
 */
export function diffTokenUsage(
  before: TokenUsageBreakdown,
  after: TokenUsageBreakdown,
): { input: number; output: number } {
  return {
    input: Math.max(0, after.inputTokens - before.inputTokens),
    output: Math.max(0, after.outputTokens - before.outputTokens),
  }
}

/**
 * Tokens de entrada que se informan para UN mensaje. Un turno de Codex puede
 * hacer varias llamadas al modelo (búsqueda web, pasos con herramientas) y
 * cada una reenvía todo el contexto, así que el delta acumulado puede superar
 * la ventana de contexto (visto en vivo: 500k de "entrada" contra 258k). La
 * app compara con el límite de contexto el tamaño de la ÚLTIMA llamada
 * (`last`); el delta queda solo como respaldo si Codex no informa `last`.
 */
export function turnInputTokens(
  before: TokenUsageBreakdown,
  after: TokenUsageBreakdown,
  last: TokenUsageBreakdown | undefined,
): number {
  if (last && last.inputTokens > 0) return last.inputTokens
  return diffTokenUsage(before, after).input
}

// ─── Aislamiento de la configuración personal de Codex del usuario ─────────

/**
 * Funciones de la config global de Codex que convierten el chat en un agente
 * de escritorio (uso de la computadora, navegador, plugins, skills,
 * memorias...). Con ellas activas, "una imagen de Google Maps de X" se
 * respondió con pasos para configurar Chrome y ~9k tokens extra por llamada.
 * La herramienta de shell queda: los comandos siguen pidiendo permiso por
 * GET/POST /permission.
 */
export const CODEX_DISABLED_FEATURES = [
  'apps',
  'browser_use',
  'browser_use_external',
  'computer_use',
  'goals',
  'hooks',
  'image_generation',
  'in_app_browser',
  'memories',
  'multi_agent',
  'plugins',
  'realtime_conversation',
  'remote_plugin',
  'skill_search',
  'sleep_tool',
  'tool_suggest',
  'workspace_dependencies',
  'worktrees',
] as const

/**
 * argv de `codex app-server`: mantiene el login de ChatGPT de `~/.codex` pero
 * sin los servidores MCP del usuario ni las funciones de agente de arriba.
 */
export function buildAppServerArgv(): string[] {
  const argv = ['codex', 'app-server', '-c', 'mcp_servers={}']
  for (const feature of CODEX_DISABLED_FEATURES) argv.push('--disable', feature)
  return argv
}

/** "lunes, 28 de septiembre de 2026, 10:32" en horario de Argentina. */
export function formatBuenosAiresDateTime(now: Date): string {
  return now.toLocaleString('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
    timeStyle: 'short',
  })
}

/**
 * Instrucciones base que se mandan en thread/start y thread/resume. Reemplazan
 * las instrucciones propias de Codex del usuario (`model_instructions_file`)
 * para que el modelo actúe como asistente de chat y no como agente de código.
 * Se arman en cada pedido para que la hora no quede congelada en una
 * conversación larga.
 */
export function buildCodexInstructions(now: Date = new Date()): string {
  return [
    'Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario, de forma clara y breve.',
    '',
    `Fecha y hora actual en Argentina (America/Argentina/Buenos_Aires): ${formatBuenosAiresDateTime(now)}. Hora UTC (ISO 8601): ${now.toISOString()}.`,
    '',
    `No podés abrir un navegador. ${LINKS_AND_IMAGES_RULE}`,
    'Podés ejecutar comandos locales solo cuando el pedido realmente lo necesita; cada comando requiere que el usuario lo apruebe, así que explicá brevemente qué vas a hacer.',
  ].join('\n')
}

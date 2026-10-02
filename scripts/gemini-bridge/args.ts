// Helpers puros del bridge de Gemini (suscripción de Google AI Pro vía
// Antigravity CLI `agy`, ver odd/tasks/gemini-subscription-bridge.md). Sin
// dependencia de Bun.serve ni de red: testeables con `bun test` sin proceso
// real. Hereda de codex-bridge lo que es idéntico (auth Basic, CORS, fecha de
// Buenos Aires, forma del id de sesión).

import { LINKS_AND_IMAGES_RULE } from '../../src/config/chatInstructions'
import {
  checkBasicAuth,
  formatBuenosAiresDateTime,
  isAllowedOrigin,
  isValidSessionId,
} from '../codex-bridge/args'

export {
  checkBasicAuth,
  formatBuenosAiresDateTime,
  isAllowedOrigin,
  isValidSessionId,
}

export const MAX_BODY_BYTES = 200 * 1024

export function isValidModel(model: unknown): model is string {
  return typeof model === 'string' && model.length > 0 && model.length <= 128
}

// ─── `agy models` ─────────────────────────────────────────────────────────

export interface GeminiModelInfo {
  id: string
  name: string
}

/**
 * Parsea la salida de `agy models`: una línea "Fetching available models..."
 * y después `<id>\t<nombre para mostrar>` por modelo (verificado en vivo con
 * agy 1.2.14). Ignora cualquier línea sin tabulador.
 */
export function parseModelsOutput(output: string): GeminiModelInfo[] {
  const models: GeminiModelInfo[] = []
  for (const rawLine of output.split(/\r?\n/)) {
    const tab = rawLine.indexOf('\t')
    if (tab === -1) continue
    const id = rawLine.slice(0, tab).trim()
    const name = rawLine.slice(tab + 1).trim()
    if (!id || /\s/.test(id)) continue
    models.push({ id, name: name || id })
  }
  return models
}

// ─── Protocolo stream-json de `agy` ───────────────────────────────────────

/** argv del proceso persistente (un proceso por conversación). */
export function buildAgyArgv(model: string, conversationId?: string): string[] {
  const argv = [
    'agy',
    '--print',
    '',
    '--input-format',
    'stream-json',
    '--output-format',
    'stream-json',
    '--model',
    model,
  ]
  if (conversationId) argv.push('--conversation', conversationId)
  return argv
}

/** Línea de stdin para un turno de usuario (un `message` string plano es
 * rechazado por agy, verificado en vivo). Incluye el salto de línea. */
export function buildUserLine(text: string): string {
  return `${JSON.stringify({
    event: 'user',
    message: { role: 'user', content: text },
  })}\n`
}

export interface AgyUsage {
  input_tokens?: number
  output_tokens?: number
  thinking_tokens?: number
  cache_read_tokens?: number
  total_tokens?: number
}

export interface AgyResult {
  conversation_id?: string
  status?: string
  response?: string
  error?: string
  duration_seconds?: number
  num_turns?: number
  usage?: AgyUsage
}

export type AgyEvent =
  | { kind: 'init'; conversationId: string }
  | { kind: 'result'; result: AgyResult }
  | { kind: 'other' }

/** Clasifica una línea de stdout de `agy`. Nunca lanza: JSON inválido cae en
 * `other`. */
export function parseAgyLine(line: string): AgyEvent {
  const trimmed = line.trim()
  if (!trimmed) return { kind: 'other' }
  let data: Record<string, unknown>
  try {
    data = JSON.parse(trimmed)
  } catch {
    return { kind: 'other' }
  }
  if (!data || typeof data !== 'object') return { kind: 'other' }

  if (data.event === 'init' && typeof data.conversation_id === 'string') {
    return { kind: 'init', conversationId: data.conversation_id }
  }
  if (data.event === 'result') {
    const nested = data.result
    const result =
      nested && typeof nested === 'object'
        ? (nested as AgyResult)
        : (data as AgyResult)
    return { kind: 'result', result }
  }
  return { kind: 'other' }
}

// ─── Instrucciones ────────────────────────────────────────────────────────

/**
 * Instrucciones base. `agy` no tiene flag de system prompt, así que se
 * anteponen al primer mensaje de cada conversación (ver buildFirstMessage).
 */
export function buildGeminiInstructions(now: Date = new Date()): string {
  return [
    'Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario, de forma clara y breve.',
    '',
    `Fecha y hora actual en Argentina (America/Argentina/Buenos_Aires): ${formatBuenosAiresDateTime(now)}. Hora UTC (ISO 8601): ${now.toISOString()}.`,
    '',
    `No podés abrir un navegador ni hace falta usar herramientas locales salvo que el pedido lo exija. ${LINKS_AND_IMAGES_RULE}`,
  ].join('\n')
}

/** Primer mensaje de una conversación nueva: instrucciones + pedido, con un
 * separador claro para que el modelo no las confunda con el texto del
 * usuario. */
export function buildFirstMessage(message: string, now: Date = new Date()): string {
  return [
    '[Instrucciones del sistema para esta conversación]',
    buildGeminiInstructions(now),
    '[Fin de las instrucciones]',
    '',
    '[Mensaje del usuario]',
    message,
  ].join('\n')
}

// ─── Resultado → cuerpo de respuesta HTTP ─────────────────────────────────

export interface ChatResponseBody {
  text: string
  sessionId: string
  model: string
  tokens: { input: number; output: number }
  isError: boolean
  error?: string
}

/**
 * `usage` de agy es ACUMULADO por conversación (verificado en vivo: 29.3k,
 * 58.8k y 88.3k de entrada en tres turnos de ~29.5k cada uno, y 118k en el
 * primer turno de un proceso nuevo reanudado con --conversation; `num_turns`
 * también es de toda la conversación). El costo de un turno es la diferencia
 * con la lectura anterior. Sin lectura anterior (bridge reiniciado) se
 * aproxima con el promedio por turno: acumulado / num_turns.
 */
export function usageDelta(
  previous: AgyUsage | undefined,
  current: AgyUsage | undefined,
  numTurns?: number,
): AgyUsage {
  const cur = current ?? {}
  const keys = [
    'input_tokens',
    'output_tokens',
    'thinking_tokens',
    'cache_read_tokens',
    'total_tokens',
  ] as const
  const out: AgyUsage = {}
  for (const key of keys) {
    const now = cur[key] ?? 0
    if (previous) {
      out[key] = Math.max(0, now - (previous[key] ?? 0))
    } else if (numTurns && numTurns > 1) {
      out[key] = Math.round(now / numTurns)
    } else {
      out[key] = now
    }
  }
  return out
}

/**
 * Convierte el `result` de agy en el cuerpo de /chat. Tokens: delta del turno
 * (ver usageDelta); `input_tokens` excluye lo servido desde caché, así que la
 * entrada informada es `input_tokens + cache_read_tokens` (el contexto
 * realmente usado en el turno); la salida es `output_tokens`.
 *
 * Un `status` distinto de SUCCESS con texto de respuesta no vacío no se trata
 * como error: agy informa ahí errores transitorios de la API (p. ej. 503 "No
 * capacity", "attempt 1") que reintenta y supera (verificado en vivo).
 */
export function resultToBody(
  result: AgyResult,
  sessionId: string,
  model: string,
  previousUsage?: AgyUsage,
): ChatResponseBody {
  const usage = usageDelta(previousUsage, result.usage, result.num_turns)
  const input = (usage.input_tokens ?? 0) + (usage.cache_read_tokens ?? 0)
  const output = usage.output_tokens ?? 0
  const text = (result.response ?? '').trim()
  const isError = result.status !== 'SUCCESS' && !text
  return {
    text,
    sessionId,
    model,
    tokens: { input, output },
    isError,
    error: isError ? result.error || 'El turno no se completó' : undefined,
  }
}

/** Validación del modelo contra la lista de `agy models`. Lista vacía = sin
 * información, no se bloquea. */
export function isKnownModel(model: string, known: ReadonlySet<string>): boolean {
  return known.size === 0 || known.has(model)
}

/** Variables que hacen que agy use una API key en vez del login de la
 * suscripción. Se quitan solo para el proceso hijo. */
export const NON_SUBSCRIPTION_AUTH_VARS = ['GEMINI_API_KEY', 'GOOGLE_API_KEY']

export function buildSubscriptionEnv(
  source: Record<string, string | undefined>,
): Record<string, string | undefined> {
  const env = { ...source }
  for (const name of NON_SUBSCRIPTION_AUTH_VARS) delete env[name]
  return env
}

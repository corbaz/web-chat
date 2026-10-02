// Prueba de un modelo con la API key del usuario (botón "Revisar modelos").
// Arma el pedido con la misma ProviderConfig que usa el chat (endpoint,
// cabeceras, payloadBuilder, proxy de OpenCode y ruta por familia), pero con
// un único mensaje "ok" y la salida recortada al mínimo que acepta cada API,
// así cada prueba cuesta una fracción de centavo. La key solo viaja al
// endpoint del propio proveedor y nunca se loguea ni se devuelve en mensajes.

import {
  getApiErrorMessage,
  getProviderConfig,
  isInvalidApiKeyError,
  openCodeSessionHeaders,
} from '../../config/providers'
import {
  isModelUnavailableMessage,
  isQuotaExhaustedMessage,
} from './unavailableModels'

export type ProbeOutcome = 'ok' | 'quota' | 'unavailable' | 'unknown'

export interface ProbeResult {
  result: ProbeOutcome
  /** Motivo corto para mostrar al pasar el mouse (sin la key). */
  message?: string
}

const PROBE_TIMEOUT_MS = 20000
const MAX_MESSAGE_LENGTH = 160
const PROBE_SESSION_ID = 'model-check'

const INVALID_KEY_PATTERN =
  /api key not valid|api_key_invalid|invalid api key|incorrect api key|invalid x-api-key|authentication[_ ]error|autherror|unauthorized/i

/**
 * Qué significa la respuesta de la prueba. Una key inválida (igual para todos
 * los modelos) y los límites por minuto, 5xx o errores de red no dicen nada
 * del modelo: quedan en 'unknown' y nunca lo deshabilitan.
 */
export function classifyProbeResponse(
  status: number,
  message: string,
): ProbeOutcome {
  if (status >= 200 && status < 300) return 'ok'
  if (
    status === 401 ||
    INVALID_KEY_PATTERN.test(message) ||
    isInvalidApiKeyError(message)
  ) {
    return 'unknown'
  }
  if (isQuotaExhaustedMessage(message) || status === 402) return 'quota'
  if (status === 404 || isModelUnavailableMessage(message)) {
    return 'unavailable'
  }
  return 'unknown'
}

// Claves con las que el payload del chat pide salida larga, herramientas o
// razonamiento: la prueba las saca para no gastar de más.
const STRIPPED_KEYS = [
  'tools',
  'include',
  'reasoning',
  'reasoning_effort',
  'output_config',
  'service_tier',
  'system',
  'systemInstruction',
  'temperature',
  'presence_penalty',
]

/** Mínimo de salida que acepta la Responses API de OpenAI. */
const RESPONSES_MIN_OUTPUT_TOKENS = 16

/**
 * Copia del payload del chat con la salida recortada al mínimo y sin
 * herramientas ni razonamiento. `minTokens` es el piso para Chat Completions
 * y Anthropic (1; 16 en OpenAI, cuyos modelos de razonamiento rechazan 1).
 * La Responses API no tiene `max_tokens`: se le pone `max_output_tokens` 16.
 */
export function capProbePayload(
  payload: Record<string, unknown>,
  minTokens = 1,
): Record<string, unknown> {
  const capped: Record<string, unknown> = { ...payload }
  for (const key of STRIPPED_KEYS) delete capped[key]

  if ('max_tokens' in capped) capped.max_tokens = minTokens
  if ('max_completion_tokens' in capped)
    capped.max_completion_tokens = minTokens
  if ('input' in capped) {
    capped.max_output_tokens = RESPONSES_MIN_OUTPUT_TOKENS
  }
  if ('contents' in capped) {
    capped.generationConfig = { maxOutputTokens: 1 }
  }
  return capped
}

// Saca la key de un texto (algunos proveedores la repiten, recortada o no,
// en el error) y lo acorta para la etiqueta.
function sanitizeMessage(text: string, apiKey: string): string {
  const clean = apiKey ? text.split(apiKey).join('***') : text
  const oneLine = clean.replace(/\s+/g, ' ').trim()
  return oneLine.length > MAX_MESSAGE_LENGTH
    ? `${oneLine.slice(0, MAX_MESSAGE_LENGTH)}…`
    : oneLine
}

async function readErrorMessage(response: Response): Promise<string> {
  let text = ''
  try {
    text = await response.text()
  } catch {
    return ''
  }
  try {
    return getApiErrorMessage(JSON.parse(text)) || text
  } catch {
    return text
  }
}

/** Prueba un modelo de un proveedor con API key. Nunca lanza. */
export async function probeApiModel(
  provider: string,
  modelId: string,
  apiKey: string,
): Promise<ProbeResult> {
  const config = getProviderConfig(provider)
  if (!config) {
    return { result: 'unknown', message: 'Proveedor desconocido' }
  }

  try {
    const payload = capProbePayload(
      config.payloadBuilder(
        modelId,
        [{ role: 'user', content: 'ok' }],
        1,
        undefined,
        undefined,
      ),
      provider === 'openai' ? RESPONSES_MIN_OUTPUT_TOKENS : 1,
    )
    const response = await fetch(config.endpoint(modelId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...config.headerAuth(apiKey, modelId),
        ...openCodeSessionHeaders(provider, PROBE_SESSION_ID),
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (response.ok) return { result: 'ok' }

    const message = sanitizeMessage(await readErrorMessage(response), apiKey)
    return {
      result: classifyProbeResponse(response.status, message),
      message: message || `HTTP ${response.status}`,
    }
  } catch (error) {
    const timedOut =
      error instanceof DOMException && error.name === 'TimeoutError'
    return {
      result: 'unknown',
      message: timedOut ? 'Sin respuesta a tiempo' : 'Error de red',
    }
  }
}

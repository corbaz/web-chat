// Ping de los modelos gratis de OpenCode Free al elegir el proveedor (ver
// odd/tasks/opencode-free-local.md). Zen publica modelos que después no sirve
// (p. ej. `ling-3.0-flash-fin-free`: "Cannot find any route matching ...") y
// un pedido directo a Zen no lo detecta (a los modelos gratis responde
// FreeTierError a todo lo que no sea OpenCode), así que el ping pasa por el
// servidor local: una sesión por modelo, todas en paralelo, con un mensaje
// mínimo que se corta apenas el asistente empieza a responder (anda) o llega
// el error (no anda). Verificado en vivo 2026-09-30: 8 modelos en 4,8 s.

import { isModelUnavailableMessage } from '../modelCatalog/unavailableModels'
import { authHeader } from './client'
import { splitSseEvents } from './permissionEvents'

export type ProbeResult = 'ok' | 'unavailable' | 'unknown'

/** Lo que dice un evento de `/event` sobre el ping de una sesión. */
export type ProbeSignal =
  | { kind: 'assistant-message'; messageId: string }
  | { kind: 'answered' }
  | { kind: 'error'; message: string }

const PROBE_PROMPT = 'Respondé solo: ok'
const PROBE_TIMEOUT_MS = 25000

/**
 * Interpreta un evento del stream para la sesión de un ping. `assistantIds`
 * son los mensajes del asistente ya vistos en esa sesión: el texto de la
 * pregunta también llega como parte, y no cuenta como respuesta.
 */
export function interpretProbeEvent(
  data: string,
  sessionId: string,
  assistantIds: ReadonlySet<string>,
): ProbeSignal | null {
  let event: { type?: unknown; properties?: Record<string, unknown> }
  try {
    event = JSON.parse(data)
  } catch {
    return null
  }
  const props = event.properties ?? {}
  const part = props.part as
    | { sessionID?: unknown; messageID?: unknown }
    | undefined
  const info = props.info as
    | { sessionID?: unknown; id?: unknown; role?: unknown }
    | undefined
  const eventSession = props.sessionID ?? part?.sessionID ?? info?.sessionID
  if (eventSession !== sessionId) return null

  if (
    event.type === 'message.updated' &&
    info?.role === 'assistant' &&
    typeof info.id === 'string'
  ) {
    return { kind: 'assistant-message', messageId: info.id }
  }
  if (event.type === 'session.error') {
    const error = props.error as
      | { name?: unknown; data?: { message?: unknown } }
      | undefined
    const message =
      typeof error?.data?.message === 'string'
        ? error.data.message
        : typeof error?.name === 'string'
          ? error.name
          : 'error'
    return { kind: 'error', message }
  }
  if (
    event.type === 'message.part.updated' ||
    event.type === 'message.part.delta'
  ) {
    const messageId = part?.messageID ?? props.messageID
    if (typeof messageId === 'string' && assistantIds.has(messageId)) {
      return { kind: 'answered' }
    }
  }
  return null
}

/**
 * Un error que dice "este modelo no se puede usar" oculta el modelo; un
 * límite de uso u otro error transitorio no (el problema no es el modelo).
 */
export function classifyProbeError(message: string): ProbeResult {
  if (/429|rate.?limit|too many requests/i.test(message)) return 'unknown'
  return isModelUnavailableMessage(message) ? 'unavailable' : 'unknown'
}

/** Prueba cada modelo en paralelo. Nunca lanza: sin servidor, todo 'unknown'. */
export async function probeFreeModels(
  baseUrl: string,
  password: string,
  modelIds: string[],
  providerId = 'opencode',
): Promise<Record<string, ProbeResult>> {
  const results: Record<string, ProbeResult> = {}
  for (const id of modelIds) results[id] = 'unknown'
  if (modelIds.length === 0) return results

  const headers = {
    ...authHeader(password),
    'Content-Type': 'application/json',
  }
  const events = new AbortController()
  const pending = new Map<
    string,
    { assistantIds: Set<string>; finish: (result: ProbeResult) => void }
  >()

  try {
    const stream = await fetch(`${baseUrl}/event`, {
      headers: authHeader(password),
      signal: events.signal,
    })
    if (!stream.ok || !stream.body) return results
    const reader = stream.body.getReader()
    const decoder = new TextDecoder()

    void (async () => {
      let buffer = ''
      try {
        while (!events.signal.aborted) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const split = splitSseEvents(buffer)
          buffer = split.rest
          for (const data of split.events) {
            for (const [sessionId, entry] of pending) {
              const signal = interpretProbeEvent(
                data,
                sessionId,
                entry.assistantIds,
              )
              if (!signal) continue
              if (signal.kind === 'assistant-message') {
                entry.assistantIds.add(signal.messageId)
              } else if (signal.kind === 'answered') {
                entry.finish('ok')
              } else {
                entry.finish(classifyProbeError(signal.message))
              }
            }
          }
        }
      } catch {
        // Stream cortado (abort al terminar o el servidor se fue).
      }
    })()

    const probeOne = async (modelId: string): Promise<void> => {
      let sessionId: string | undefined
      try {
        const created = await fetch(`${baseUrl}/session`, {
          method: 'POST',
          headers,
          body: JSON.stringify({ title: `ping ${modelId}` }),
        })
        if (!created.ok) return
        sessionId = ((await created.json()) as { id?: string }).id
        if (!sessionId) return
        const id = sessionId

        const outcome = new Promise<ProbeResult>((resolve) => {
          const timer = setTimeout(() => {
            pending.delete(id)
            resolve('unknown')
          }, PROBE_TIMEOUT_MS)
          pending.set(id, {
            assistantIds: new Set(),
            finish: (result) => {
              clearTimeout(timer)
              pending.delete(id)
              resolve(result)
            },
          })
        })

        await fetch(`${baseUrl}/session/${id}/prompt_async`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            model: { providerID: providerId, modelID: modelId },
            parts: [{ type: 'text', text: PROBE_PROMPT }],
          }),
        })
        results[modelId] = await outcome
      } catch {
        results[modelId] = 'unknown'
      } finally {
        if (sessionId) {
          // Corta la respuesta y borra la sesión de prueba (no se acumulan
          // en el servidor local).
          await fetch(`${baseUrl}/session/${sessionId}/abort`, {
            method: 'POST',
            headers,
          }).catch(() => {})
          await fetch(`${baseUrl}/session/${sessionId}`, {
            method: 'DELETE',
            headers,
          }).catch(() => {})
        }
      }
    }

    await Promise.all(modelIds.map(probeOne))
    return results
  } catch {
    return results
  } finally {
    events.abort()
  }
}

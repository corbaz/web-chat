// Ping de los modelos de Gemini al elegir el proveedor (user request
// 2026-09-30): la lista muestra todos los modelos de chat, Pro incluidos, y
// los que la cuenta no puede usar quedan deshabilitados con su motivo. Cada
// ping es un generateContent de 1 token de salida con la API key del usuario
// (desde su navegador), de a pocos por vez para no chocar con el límite por
// minuto, como máximo una vez por día y de nuevo si cambia la key.

import {
  getCatalogModelIds,
  markModelAvailable,
  markModelUnavailable,
  refreshProvider,
} from './store'
import {
  isModelUnavailableMessage,
  isQuotaExhaustedMessage,
  type UnavailableReason,
} from './unavailableModels'

export type GeminiProbeResult = 'ok' | UnavailableReason | 'unknown'

const GENERATE_URL = (modelId: string) =>
  `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(modelId)}:generateContent`

const STORAGE_KEY = 'gemini:probe:v1'
export const GEMINI_CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000
const CONCURRENCY = 3
const PROBE_TIMEOUT_MS = 20000

/**
 * Qué significa la respuesta del ping. 429 "limit: 0" = el plan no incluye
 * ese modelo (sin cuota); un 429 común es el límite por minuto y no dice nada
 * del modelo. Una key inválida (400/401/403 de API key) tampoco: sería igual
 * para todos los modelos.
 */
export function classifyGeminiProbe(
  status: number,
  message: string,
): GeminiProbeResult {
  if (status >= 200 && status < 300) return 'ok'
  if (/api key not valid|api_key_invalid|invalid api key/i.test(message)) {
    return 'unknown'
  }
  if (isQuotaExhaustedMessage(message)) return 'quota'
  if (status === 404 || isModelUnavailableMessage(message)) {
    return 'unavailable'
  }
  if (status === 403 && /permission|billing|access/i.test(message)) {
    return 'quota'
  }
  return 'unknown'
}

async function probeOne(
  apiKey: string,
  modelId: string,
): Promise<GeminiProbeResult> {
  try {
    const response = await fetch(GENERATE_URL(modelId), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'ok' }] }],
        generationConfig: { maxOutputTokens: 1 },
      }),
      signal: AbortSignal.timeout(PROBE_TIMEOUT_MS),
    })
    if (response.ok) return 'ok'
    let message = ''
    try {
      const data = (await response.json()) as { error?: { message?: string } }
      message = data?.error?.message ?? ''
    } catch {
      // Cuerpo no JSON: se clasifica solo por el status.
    }
    return classifyGeminiProbe(response.status, message)
  } catch {
    return 'unknown'
  }
}

/** Prueba los modelos de a CONCURRENCY por vez. Nunca lanza. */
export async function probeGeminiModels(
  apiKey: string,
  modelIds: string[],
): Promise<Record<string, GeminiProbeResult>> {
  const results: Record<string, GeminiProbeResult> = {}
  const queue = [...modelIds]
  const worker = async (): Promise<void> => {
    for (let id = queue.shift(); id !== undefined; id = queue.shift()) {
      results[id] = await probeOne(apiKey, id)
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, queue.length) }, worker),
  )
  return results
}

// Huella corta de la key (no la key): si el usuario la cambia, se vuelve a
// probar aunque no haya pasado un día.
function keyFingerprint(apiKey: string): string {
  return `${apiKey.length}:${apiKey.slice(-4)}`
}

/** Anota que ya se chequeó (lo usa "Revisar modelos") para que el chequeo
automático del día no repita el trabajo. */
export function recordGeminiCheckDone(apiKey: string): void {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ at: Date.now(), key: keyFingerprint(apiKey) }),
    )
  } catch {
    // Sin localStorage: el chequeo automático se repite.
  }
}

function readLastCheck(): { at: number; key: string } | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')
    return parsed && typeof parsed.at === 'number' ? parsed : null
  } catch {
    return null
  }
}

let inFlight: Promise<void> | null = null

/** Actualiza la lista de Gemini y prueba cada modelo si toca. Nunca lanza. */
export function checkGeminiModelsIfDue(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      let apiKey = ''
      try {
        apiKey = localStorage.getItem('geminiApiKey')?.trim() ?? ''
      } catch {
        return
      }
      if (!apiKey) return
      await refreshProvider('gemini')

      const last = readLastCheck()
      const fingerprint = keyFingerprint(apiKey)
      if (
        last &&
        last.key === fingerprint &&
        Date.now() - last.at <= GEMINI_CHECK_INTERVAL_MS
      ) {
        return
      }

      const results = await probeGeminiModels(
        apiKey,
        getCatalogModelIds('gemini'),
      )
      const outcomes = Object.entries(results)
      // Todo 'unknown' = sin red o key inválida: no cuenta como chequeo.
      if (outcomes.every(([, result]) => result === 'unknown')) return
      for (const [modelId, result] of outcomes) {
        if (result === 'ok') markModelAvailable('gemini', modelId)
        else if (result === 'quota' || result === 'unavailable') {
          markModelUnavailable('gemini', modelId, result)
        }
      }
      try {
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ at: Date.now(), key: fingerprint }),
        )
      } catch {
        // Sin localStorage: se vuelve a probar en la próxima elección.
      }
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

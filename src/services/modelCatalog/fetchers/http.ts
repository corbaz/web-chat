// Helpers compartidos por los fetchers de /models.

const FETCH_TIMEOUT_MS = 8000

/** GET JSON con timeout. Lanza si la respuesta no es 2xx. */
export async function fetchJson(
  url: string,
  label: string,
  headers: Record<string, string> = {},
): Promise<unknown> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)

  try {
    const response = await fetch(url, { headers, signal: controller.signal })
    if (!response.ok) {
      throw new Error(`${label} respondió HTTP ${response.status}`)
    }
    return await response.json()
  } finally {
    clearTimeout(timeoutId)
  }
}

/**
 * Parsea respuestas estilo OpenAI ({data:[{id}]}) y devuelve los IDs que
 * pasan el filtro. Función pura, testeable con fixtures.
 */
export function parseDataIds(
  payload: unknown,
  keep: (id: string, entry: Record<string, unknown>) => boolean = () => true,
): string[] {
  if (!payload || typeof payload !== 'object') return []

  const data = (payload as { data?: unknown }).data
  if (!Array.isArray(data)) return []

  const ids: string[] = []
  for (const entry of data) {
    if (!entry || typeof entry !== 'object') continue
    const record = entry as Record<string, unknown>
    const id = record.id
    if (typeof id === 'string' && id && keep(id, record)) {
      ids.push(id)
    }
  }
  return ids
}

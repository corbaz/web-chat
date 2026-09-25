// Fetcher/parser de OpenCode Zen (con API key propia de Zen).
// GET https://opencode.ai/zen/v1/models (Bearer) → {data:[{id}]}.
// Con key de Zen, el mismo endpoint sirve tanto modelos pagos como los
// "free" del plan (ids que terminan en "-free" o "big-pickle"): el tier
// keyless dedicado (proveedor `opencodefree`) fue retirado porque OpenCode
// Zen ahora rechaza cualquier cliente que no sea OpenCode mismo (ver T8 en
// odd/tasks/dynamic-model-catalog.md). Solo se descartan los ids sin ruta
// de chat conocida (ver zenRoute.ts, p. ej. `jev-*`).

import { zenRouteFor } from '../zenRoute'
import { fetchJson, parseDataIds } from './http'

const ZEN_MODELS_URL = 'https://opencode.ai/zen/v1/models'

export function isZenChatModel(id: string): boolean {
  return zenRouteFor(id) !== null
}

/** Devuelve solo los IDs de modelos de chat del payload de /zen/v1/models. */
export function parseZenModelIds(payload: unknown): string[] {
  return parseDataIds(payload, isZenChatModel)
}

export async function fetchOpenCodeZenModelIds(
  apiKey: string,
): Promise<string[]> {
  const payload = await fetchJson(ZEN_MODELS_URL, 'OpenCode Zen', {
    Authorization: `Bearer ${apiKey}`,
  })
  return parseZenModelIds(payload)
}

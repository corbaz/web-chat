// Fetcher/parser de OpenCode Zen (plan pago, con API key).
// GET https://opencode.ai/zen/v1/models (Bearer) → {data:[{id}]}.
// Mismo endpoint que el catálogo free (ver zenFreeFetcher.ts), pero acá se
// descartan los modelos "free" (pertenecen al proveedor `opencodefree`) y
// los ids sin ruta de chat conocida (ver zenRoute.ts, p. ej. `jev-*`).

import { zenRouteFor } from '../zenRoute'
import { fetchJson, parseDataIds } from './http'
import { isFreeModelId } from './zenFreeFetcher'

const ZEN_MODELS_URL = 'https://opencode.ai/zen/v1/models'

export function isZenPaidChatModel(id: string): boolean {
  return !isFreeModelId(id) && zenRouteFor(id) !== null
}

/** Devuelve solo los IDs de modelos pagos y de chat del payload de /zen/v1/models. */
export function parseZenModelIds(payload: unknown): string[] {
  return parseDataIds(payload, isZenPaidChatModel)
}

export async function fetchOpenCodeZenModelIds(
  apiKey: string,
): Promise<string[]> {
  const payload = await fetchJson(ZEN_MODELS_URL, 'OpenCode Zen', {
    Authorization: `Bearer ${apiKey}`,
  })
  return parseZenModelIds(payload)
}

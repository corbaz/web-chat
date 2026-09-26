// Fetcher/parser de OpenCode Zen (con API key propia de Zen).
// GET https://opencode.ai/zen/v1/models (Bearer) → {data:[{id}]}.
// Se descartan los modelos "free" (ids que terminan en "-free" o
// "big-pickle"): OpenCode solo los sirve desde su propia app y responde
// `FreeTierError` a cualquier otro cliente, incluso con API key de Zen
// (verificado 2026-09-26). También se descartan los ids sin ruta de chat
// conocida (ver zenRoute.ts, p. ej. `jev-*`).

import { zenRouteFor } from '../zenRoute'
import { fetchJson, parseDataIds } from './http'

const ZEN_MODELS_URL = 'https://opencode.ai/zen/v1/models'

export function isZenFreeModel(id: string): boolean {
  return id.endsWith('-free') || id === 'big-pickle'
}

// Con API key, Zen lista los modelos del workspace e incluye endpoints
// internos de prueba (`test`, `test-novita-dsf4.1`, visto 2026-09-26).
export function isZenTestModel(id: string): boolean {
  return id === 'test' || id.startsWith('test-')
}

export function isZenChatModel(id: string): boolean {
  return !isZenFreeModel(id) && !isZenTestModel(id) && zenRouteFor(id) !== null
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

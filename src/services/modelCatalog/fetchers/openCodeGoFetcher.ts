// Fetcher/parser de OpenCode Go.
// GET <proxy>/zen/go/v1/models → {data:[{id}]} (ver getOpenCodeGoModelsUrl:
// directo a opencode.ai el navegador lo bloquea por CORS).
// Todos los IDs listados pertenecen al plan Go, no hace falta filtrar.

import { getOpenCodeGoModelsUrl } from '../../../config/providers'
import { fetchJson, parseDataIds } from './http'

export function parseOpenCodeGoModelIds(payload: unknown): string[] {
  return parseDataIds(payload)
}

export async function fetchOpenCodeGoModelIds(
  apiKey: string,
): Promise<string[]> {
  const payload = await fetchJson(getOpenCodeGoModelsUrl(), 'OpenCode Go', {
    Authorization: `Bearer ${apiKey}`,
  })
  return parseOpenCodeGoModelIds(payload)
}

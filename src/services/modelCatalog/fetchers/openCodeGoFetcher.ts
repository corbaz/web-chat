// Fetcher/parser de OpenCode Go.
// GET https://opencode.ai/zen/go/v1/models → {data:[{id}]}.
// Todos los IDs listados pertenecen al plan Go, no hace falta filtrar.

import { fetchJson, parseDataIds } from './http'

const OPENCODE_GO_MODELS_URL = 'https://opencode.ai/zen/go/v1/models'

export function parseOpenCodeGoModelIds(payload: unknown): string[] {
  return parseDataIds(payload)
}

export async function fetchOpenCodeGoModelIds(
  apiKey: string,
): Promise<string[]> {
  const payload = await fetchJson(OPENCODE_GO_MODELS_URL, 'OpenCode Go', {
    Authorization: `Bearer ${apiKey}`,
  })
  return parseOpenCodeGoModelIds(payload)
}

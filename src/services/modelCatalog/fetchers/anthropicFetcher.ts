// Fetcher/parser de Anthropic.
// GET https://api.anthropic.com/v1/models?limit=1000 (x-api-key) →
// {data:[{type: "model", id, display_name, created_at}], has_more}.
// Todos los modelos listados son de chat; los IDs con fecha son los IDs
// oficiales de esos modelos, por eso no se filtran.

import { fetchJson, parseDataIds } from './http'

const ANTHROPIC_MODELS_URL = 'https://api.anthropic.com/v1/models?limit=1000'

export function parseAnthropicModelIds(payload: unknown): string[] {
  return parseDataIds(
    payload,
    (_id, entry) => entry.type === undefined || entry.type === 'model',
  )
}

export async function fetchAnthropicModelIds(
  apiKey: string,
): Promise<string[]> {
  const payload = await fetchJson(ANTHROPIC_MODELS_URL, 'Anthropic', {
    'x-api-key': apiKey,
    'anthropic-version': '2023-06-01',
    'anthropic-dangerous-direct-browser-access': 'true',
  })
  return parseAnthropicModelIds(payload)
}

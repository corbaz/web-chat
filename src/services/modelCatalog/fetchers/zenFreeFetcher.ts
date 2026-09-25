// Fetcher/parser de OpenCode Zen free.
// Endpoint público, sin auth: GET https://opencode.ai/zen/v1/models
// Respuesta: {data:[{id}]}. Un modelo es "free" si su id termina en "-free"
// o es exactamente "big-pickle". Este proveedor solo habla
// /zen/v1/chat/completions, así que además se descartan los ids "free" cuya
// ruta real (ver zenRoute.ts) es otro endpoint (p. ej. `jev-*`, que es una
// API de clasificación, o `muse-*`, que habla /zen/v1/responses).

import { zenRouteFor } from '../zenRoute'
import { fetchJson, parseDataIds } from './http'

const ZEN_FREE_MODELS_URL = 'https://opencode.ai/zen/v1/models'

export function isFreeModelId(id: string): boolean {
  return id.endsWith('-free') || id === 'big-pickle'
}

function isFreeChatModelId(id: string): boolean {
  return isFreeModelId(id) && zenRouteFor(id) === 'chat'
}

/** Devuelve solo los IDs de modelos gratuitos del payload de /zen/v1/models. */
export function parseZenFreeModelIds(payload: unknown): string[] {
  return parseDataIds(payload, isFreeChatModelId)
}

export async function fetchOpenCodeFreeModelIds(): Promise<string[]> {
  const payload = await fetchJson(ZEN_FREE_MODELS_URL, 'OpenCode Zen free')
  return parseZenFreeModelIds(payload)
}

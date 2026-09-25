// Fetcher/parser de OpenAI.
// GET https://api.openai.com/v1/models (Bearer) → {data:[{id, owned_by}]}.
// La API lista todo (embeddings, audio, imagen, moderación, snapshots
// fechados, etc.), así que se conservan solo familias de chat (gpt-*, o1/o3/o4)
// y se descartan variantes que no sirven para una conversación de texto.

import { fetchJson, parseDataIds } from './http'

const OPENAI_MODELS_URL = 'https://api.openai.com/v1/models'

const CHAT_FAMILY_PATTERN = /^(gpt-|chatgpt-|o\d)/i

const NON_CHAT_PATTERN =
  /embedding|tts|whisper|transcribe|dall-e|image|audio|realtime|moderation|search|computer-use|deep-research|instruct|gpt-3\.5|-\d{4}-\d{2}-\d{2}$/i

export function isOpenAIChatModel(id: string): boolean {
  return CHAT_FAMILY_PATTERN.test(id) && !NON_CHAT_PATTERN.test(id)
}

export function parseOpenAIModelIds(payload: unknown): string[] {
  return parseDataIds(payload, isOpenAIChatModel)
}

export async function fetchOpenAIModelIds(apiKey: string): Promise<string[]> {
  const payload = await fetchJson(OPENAI_MODELS_URL, 'OpenAI', {
    Authorization: `Bearer ${apiKey}`,
  })
  return parseOpenAIModelIds(payload)
}

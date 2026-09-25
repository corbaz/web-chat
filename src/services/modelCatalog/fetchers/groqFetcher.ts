// Fetcher/parser de Groq.
// GET https://api.groq.com/openai/v1/models (Bearer) →
// {data:[{id, owned_by, active, context_window, ...}]}.
// Se descartan modelos inactivos y los que no son de chat (audio, TTS,
// clasificadores de seguridad de prompts).

import { fetchJson, parseDataIds } from './http'

const GROQ_MODELS_URL = 'https://api.groq.com/openai/v1/models'

const NON_CHAT_PATTERN = /whisper|tts|orpheus|playai|prompt-guard|llama-guard/i

export function isGroqChatModel(
  id: string,
  entry: Record<string, unknown>,
): boolean {
  if (entry.active === false) return false
  return !NON_CHAT_PATTERN.test(id)
}

export function parseGroqModelIds(payload: unknown): string[] {
  return parseDataIds(payload, isGroqChatModel)
}

export async function fetchGroqModelIds(apiKey: string): Promise<string[]> {
  const payload = await fetchJson(GROQ_MODELS_URL, 'Groq', {
    Authorization: `Bearer ${apiKey}`,
  })
  return parseGroqModelIds(payload)
}

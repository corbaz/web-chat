// Fetcher/parser de Gemini.
// GET https://generativelanguage.googleapis.com/v1beta/models (x-goog-api-key)
// → {models:[{name: "models/<id>", supportedGenerationMethods, ...}]}.
// Se conservan todos los modelos de chat, Pro incluidos: los que la cuenta no
// puede usar (p. ej. Pro sin cuota en el plan gratis) se muestran
// deshabilitados tras el ping de geminiProbe.ts, en vez de esconderlos (user
// request 2026-09-30). Se descartan las variantes que no son de chat (imagen,
// audio, TTS, live, embeddings, computer use, omni que responde con video),
// snapshots numerados (-001) y generaciones deprecadas (1.x y 2.0).

const GEMINI_MODELS_URL =
  'https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000'

import { fetchJson } from './http'

const EXCLUDED_PATTERN =
  /image|tts|live|audio|embedding|computer-use|omni|-\d{3}$|^gemini-(1\.|2\.0)/i

export function isGeminiChatModel(
  id: string,
  generationMethods: readonly unknown[],
): boolean {
  if (!id.startsWith('gemini-')) return false
  if (EXCLUDED_PATTERN.test(id)) return false
  return generationMethods.includes('generateContent')
}

export function parseGeminiModelIds(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object') return []

  const models = (payload as { models?: unknown }).models
  if (!Array.isArray(models)) return []

  const ids: string[] = []
  for (const entry of models) {
    if (!entry || typeof entry !== 'object') continue
    const { name, supportedGenerationMethods } = entry as Record<
      string,
      unknown
    >
    if (typeof name !== 'string') continue
    const id = name.replace(/^models\//, '')
    const methods = Array.isArray(supportedGenerationMethods)
      ? supportedGenerationMethods
      : []
    if (isGeminiChatModel(id, methods)) ids.push(id)
  }
  return ids
}

export async function fetchGeminiModelIds(apiKey: string): Promise<string[]> {
  const payload = await fetchJson(GEMINI_MODELS_URL, 'Gemini', {
    'x-goog-api-key': apiKey,
  })
  return parseGeminiModelIds(payload)
}

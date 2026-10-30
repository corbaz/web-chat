// Cliente mínimo del servidor local de Ollama. El chat va por el camino
// genérico de Chat Completions (ver PROVIDERS.ollamacloud en
// src/config/providers.ts); acá solo está la verificación del servidor.

import { normalizeOllamaUrl } from './settings'

const TIMEOUT_MS = 8000

/** GET /api/version: true si el servidor responde (y acepta este origen). */
export async function checkOllamaServer(url: string): Promise<boolean> {
  try {
    const res = await fetch(`${normalizeOllamaUrl(url)}/api/version`, {
      signal: AbortSignal.timeout(TIMEOUT_MS),
    })
    return res.ok
  } catch {
    return false
  }
}

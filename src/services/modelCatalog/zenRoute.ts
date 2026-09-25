// Clasificación pura de ruta de chat de OpenCode Zen por familia de modelo.
// Fuente: https://opencode.ai/docs/zen/ (2026-09-25, ver "T7 findings" en
// odd/tasks/dynamic-model-catalog.md). El endpoint de chat de Zen depende
// del prefijo del ID del modelo, no del proveedor: cada familia habla un
// protocolo distinto (Responses API, Messages API, generateContent o Chat
// Completions genérico).

export type ZenRoute = 'responses' | 'messages' | 'gemini' | 'chat' | null

// qwen* usa /zen/v1/messages salvo esta excepción puntual, que habla
// /zen/v1/chat/completions como el resto de modelos "genéricos".
const MESSAGES_CHAT_EXCEPTIONS = new Set(['qwen3.8-max'])

/**
 * Determina el endpoint de chat de OpenCode Zen para un ID de modelo dado.
 * `null` significa que el modelo no es de chat (p. ej. `jev-*`, API de
 * clasificación) y debe excluirse del catálogo.
 */
export function zenRouteFor(id: string): ZenRoute {
  if (id.startsWith('jev-')) return null

  if (
    id.startsWith('gpt-') ||
    id.startsWith('grok-') ||
    id.startsWith('muse-')
  ) {
    return 'responses'
  }

  if (id.startsWith('claude-')) return 'messages'

  if (id.startsWith('qwen')) {
    return MESSAGES_CHAT_EXCEPTIONS.has(id) ? 'chat' : 'messages'
  }

  if (id.startsWith('gemini-')) return 'gemini'

  return 'chat'
}

export type GoRoute = 'responses' | 'messages' | 'chat'

/**
 * Endpoint de chat de OpenCode Go por familia de modelo.
 * Fuente: tabla "Endpoints" de https://opencode.ai/docs/go/ (2026-09-25).
 * Difiere de Zen: en Go todos los qwen* (incluido qwen3.8-max) y minimax-*
 * usan /messages, y Go no ofrece modelos Claude ni Gemini.
 */
export function goRouteFor(id: string): GoRoute {
  if (
    id.startsWith('gpt-') ||
    id.startsWith('grok-') ||
    id.startsWith('muse-')
  ) {
    return 'responses'
  }
  if (id.startsWith('minimax-') || id.startsWith('qwen')) return 'messages'
  return 'chat'
}

import type { Citation } from '../interfaces/chat/chatTypes'

// Verificado en vivo 2026-09-26 (Groq browser_search): los tres GPT-OSS
// buscan; qwen/qwen3.8-27b lo rechaza.
const WEB_SEARCH_CAPABLE_MODELS = new Set<string>([
  'openai/gpt-oss-120b',
  'openai/gpt-oss-20b',
  'openai/gpt-oss-safeguard-20b',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
  'gemini-2.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-latest',
  'claude-opus-4-6',
  'claude-sonnet-4-6',
  'claude-haiku-4-5-20251001',
  'claude-opus-4-5-20251101',
  'claude-sonnet-4-5-20250929',
  'claude-sonnet-4-20250514',
  'claude-opus-4-20250514',
])

// OpenCode Go: modelos que buscaron en la web en la prueba en vivo del
// 2026-09-26, cada uno por su ruta (responses: `web_search`; messages:
// `web_search_20250305`; chat: `web_search_preview`). El resto responde sin
// buscar o rechaza la herramienta.
const GO_WEB_SEARCH_MODELS = new Set<string>([
  'gpt-5.6-luna',
  'gpt-6-luna',
  'grok-4.6',
  'grok-4.7',
  'hy3',
  'hy4-preview',
  'kimi-k2.6',
  'kimi-k3',
  'mimo-v2.5',
  'minimax-m3',
])

export function supportsWebSearch(modelId: string, provider?: string): boolean {
  if (!modelId || provider === 'routellm') return false
  if (provider === 'opengo') return GO_WEB_SEARCH_MODELS.has(modelId)
  // OpenCode Zen: sin verificar (la cuenta no tenía saldo al probar).
  // OpenCode Free (servidor local): sin búsqueda web en v1 (ver
  // odd/tasks/opencode-free-local.md).
  if (provider === 'opencodezen' || provider === 'opencodefree') return false
  if (WEB_SEARCH_CAPABLE_MODELS.has(modelId)) return true
  return (
    modelId.startsWith('gpt-') ||
    modelId.startsWith('o3') ||
    modelId.startsWith('o4')
  )
}

export function isProvisionalWebSearch(_modelId: string): boolean {
  return false
}

// Sanitiza URL y citaciones para evitar XSS y fuga de credenciales
export function sanitizeCitations(citations: Citation[]): Citation[] {
  if (!citations) return []
  const result: Citation[] = []
  for (const c of citations) {
    if (!c || !c.url) continue
    try {
      const urlStr = c.url.trim()
      // Rechazar esquemas que no sean http o https
      if (!urlStr.match(/^https?:\/\//i)) {
        continue
      }

      const parsedUrl = new URL(urlStr)
      // Eliminar credenciales embebidas
      parsedUrl.username = ''
      parsedUrl.password = ''

      // Redactar parámetros sensibles que puedan contener credenciales
      const params = parsedUrl.searchParams
      const keysToRedact = [
        'api_key',
        'apikey',
        'key',
        'token',
        'secret',
        'auth',
        'password',
        'pwd',
      ]
      for (const k of Array.from(params.keys())) {
        if (keysToRedact.some((red) => k.toLowerCase().includes(red))) {
          params.set(k, '[REDACTED]')
        }
      }

      // Escapar caracteres HTML para prevenir XSS
      const title = c.title ? escapeHtml(c.title) : undefined
      const snippet = c.snippet ? escapeHtml(c.snippet) : undefined

      // Función para redactar posibles claves/tokens en textos
      const redactSensitive = (text: string) => {
        return text.replace(
          /(gsk_[a-zA-Z0-9]{20,})|(sk-[a-zA-Z0-9]{20,})|(AIzaSy[a-zA-Z0-9_-]{20,})/gi,
          '[REDACTED_KEY]',
        )
      }

      result.push({
        url: parsedUrl.toString(),
        title: title ? redactSensitive(title) : undefined,
        snippet: snippet ? redactSensitive(snippet) : undefined,
      })
    } catch (_e) {}
  }
  return result
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

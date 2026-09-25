import type { Citation } from '../interfaces/chat/chatTypes'

const WEB_SEARCH_CAPABLE_MODELS = new Set<string>([
  'openai/gpt-oss-120b',
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

export function supportsWebSearch(modelId: string, provider?: string): boolean {
  if (!modelId || provider === 'routellm') return false
  // OpenCode Go/Zen: sin búsqueda web. Go rechaza `tools[0].type: web_search`
  // (HTTP 400, verificado 2026-09-25) y el soporte en Zen no está verificado.
  if (provider === 'opengo' || provider === 'opencodezen') return false
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

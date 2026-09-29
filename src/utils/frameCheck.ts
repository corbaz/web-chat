// ¿Se puede mostrar una página dentro de un iframe del chat? El navegador no
// deja saberlo desde el cliente (un iframe bloqueado igual dispara `load`),
// así que lo consulta un endpoint del lado del servidor que lee los headers
// de la página: `api/frame-check.ts` en Vercel y un middleware equivalente
// en `vite.config.ts` para desarrollo local. Ver
// odd/tasks/link-and-image-previews.md.

export const FRAME_CHECK_PATH = '/api/frame-check'

const FETCH_TIMEOUT_MS = 6000

type HeaderGetter = (name: string) => string | null

/**
 * true si los headers permiten embeber la página desde otro sitio:
 * sin `X-Frame-Options` DENY/SAMEORIGIN y sin un `frame-ancestors` de CSP
 * que la restrinja (solo `*` o `https:` abren a cualquier origen).
 */
export function isFrameableHeaders(get: HeaderGetter): boolean {
  const xfo = get('x-frame-options')?.trim().toLowerCase()
  if (xfo && (xfo.includes('deny') || xfo.includes('sameorigin'))) return false

  const csp = get('content-security-policy')
  if (!csp) return true
  for (const directive of csp.split(';')) {
    const [name, ...sources] = directive.trim().split(/\s+/)
    if (name?.toLowerCase() !== 'frame-ancestors') continue
    return sources.some((source) => source === '*' || source === 'https:')
  }
  return true
}

const PRIVATE_HOST =
  /^(localhost|.*\.local|.*\.internal|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+|169\.254\.\d+\.\d+|0\.0\.0\.0|\[.*\])$/i

/**
 * URL pública http(s) o null. Evita que el endpoint se use para sondear la
 * red interna del servidor (hosts locales, IPs privadas, IPv6 literal).
 */
export function toPublicHttpUrl(raw: string): URL | null {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  if (url.username || url.password) return null
  if (PRIVATE_HOST.test(url.hostname)) return null
  return url
}

/**
 * Pide la página (siguiendo redirecciones) y decide con los headers de la
 * respuesta final, que es la que el navegador evalúa. null = no se pudo
 * saber (URL no permitida, timeout, error de red).
 */
export async function checkFrameable(
  raw: string,
  fetchImpl: typeof fetch = fetch,
): Promise<boolean | null> {
  const url = toPublicHttpUrl(raw)
  if (!url) return null
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const response = await fetchImpl(url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (Prompting frame check)' },
    })
    const finalUrl = response.url ? toPublicHttpUrl(response.url) : url
    void response.body?.cancel()
    if (!finalUrl) return null
    return isFrameableHeaders((name) => response.headers.get(name))
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

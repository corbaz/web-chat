// Servidores locales (OpenCode Free y los bridges de suscripción + Ollama)
// vistos desde otra máquina de la red. Escuchan solo en 127.0.0.1 de la PC
// que corre `bun run dev`; si la app se abre desde otra máquina
// (https://<ip>:5173), el navegador no puede llegar a ese localhost, así que
// los pedidos van al mismo origen y el proxy de Vite (vite.config.ts) los
// reenvía al servidor (las rutas están en localServerProxies.ts, que importa
// también vite.config.ts).

export { LOCAL_SERVER_PROXIES } from './localServerProxies'

export function isLoopbackHost(hostname: string): boolean {
  return (
    hostname === 'localhost' ||
    hostname === '[::1]' ||
    hostname === '::1' ||
    /^127\./.test(hostname)
  )
}

export interface PageLocation {
  dev: boolean
  origin: string
  hostname: string
}

/**
 * Si la app (en desarrollo) se abrió desde otra máquina y la URL apunta al
 * localhost de la PC, devuelve la ruta del proxy de Vite en el mismo origen.
 * En la misma PC o en producción (Vercel) la URL queda igual.
 */
export function resolveLocalServerUrlFor(
  url: string,
  proxyPath: string,
  page: PageLocation,
): string {
  if (!page.dev || isLoopbackHost(page.hostname)) return url
  let host: string
  try {
    host = new URL(url).hostname
  } catch {
    return url
  }
  return isLoopbackHost(host) ? `${page.origin}${proxyPath}` : url
}

export function resolveLocalServerUrl(url: string, proxyPath: string): string {
  if (typeof window === 'undefined') return url
  return resolveLocalServerUrlFor(url, proxyPath, {
    dev: Boolean(import.meta.env?.DEV),
    origin: window.location.origin,
    hostname: window.location.hostname,
  })
}

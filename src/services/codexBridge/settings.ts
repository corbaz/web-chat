// Lectura de la configuración guardada del proveedor `codexsub` (URL del
// bridge local + password). Espejo de services/claudeBridge/settings.ts (ver
// odd/tasks/openai-subscription-bridge.md).

export const DEFAULT_CODEX_URL = 'http://127.0.0.1:4094'
export const CODEX_API_KEY_STORAGE_KEY = 'codexsubApiKey'
export const CODEX_SERVER_URL_STORAGE_KEY = 'codexsubServerUrl'

// Puerto anterior (4100) usado antes de este cambio: si alguien ya guardó
// esa URL por defecto en su navegador, se migra sola a la nueva (4094) para
// no dejarla apuntando a un puerto que el bridge ya no usa por defecto.
const OLD_DEFAULT_CODEX_URL = 'http://127.0.0.1:4100'

export function getCodexServerUrl(): string {
  try {
    const stored = localStorage.getItem(CODEX_SERVER_URL_STORAGE_KEY)?.trim()
    if (stored === OLD_DEFAULT_CODEX_URL) {
      localStorage.setItem(CODEX_SERVER_URL_STORAGE_KEY, DEFAULT_CODEX_URL)
      return DEFAULT_CODEX_URL
    }
    return stored || DEFAULT_CODEX_URL
  } catch {
    return DEFAULT_CODEX_URL
  }
}

export function setCodexServerUrl(url: string): void {
  try {
    const trimmed = url.trim() || DEFAULT_CODEX_URL
    localStorage.setItem(CODEX_SERVER_URL_STORAGE_KEY, trimmed)
  } catch {
    // Sin localStorage disponible; se conserva el valor por defecto.
  }
}

export function getCodexPassword(): string {
  try {
    return localStorage.getItem(CODEX_API_KEY_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

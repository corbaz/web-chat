// Lectura de la configuración guardada del proveedor `opencodefree`
// (servidor URL + password). Separado de client.ts para mantenerlo puro
// (ver T2 en odd/tasks/opencode-free-local.md): este módulo sí toca
// localStorage.

export const DEFAULT_OPENCODE_FREE_URL = 'http://127.0.0.1:4096'
export const OPENCODE_FREE_API_KEY_STORAGE_KEY = 'opencodefreeApiKey'
export const OPENCODE_FREE_SERVER_URL_STORAGE_KEY = 'opencodefreeServerUrl'

export function getOpenCodeFreeServerUrl(): string {
  try {
    const stored = localStorage
      .getItem(OPENCODE_FREE_SERVER_URL_STORAGE_KEY)
      ?.trim()
    return stored || DEFAULT_OPENCODE_FREE_URL
  } catch {
    return DEFAULT_OPENCODE_FREE_URL
  }
}

export function setOpenCodeFreeServerUrl(url: string): void {
  try {
    const trimmed = url.trim() || DEFAULT_OPENCODE_FREE_URL
    localStorage.setItem(OPENCODE_FREE_SERVER_URL_STORAGE_KEY, trimmed)
  } catch {
    // Sin localStorage disponible; se conserva el valor por defecto.
  }
}

export function getOpenCodeFreePassword(): string {
  try {
    return localStorage.getItem(OPENCODE_FREE_API_KEY_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

// Lectura de la configuración guardada del proveedor `claudecode` (URL del
// bridge local + password). Separado de client.ts para mantenerlo puro (ver
// odd/tasks/claude-subscription-bridge.md): este módulo sí toca localStorage.

export const DEFAULT_CLAUDE_CODE_URL = 'http://127.0.0.1:4098'
export const CLAUDE_CODE_API_KEY_STORAGE_KEY = 'claudecodeApiKey'
export const CLAUDE_CODE_SERVER_URL_STORAGE_KEY = 'claudecodeServerUrl'

export function getClaudeCodeServerUrl(): string {
  try {
    const stored = localStorage
      .getItem(CLAUDE_CODE_SERVER_URL_STORAGE_KEY)
      ?.trim()
    return stored || DEFAULT_CLAUDE_CODE_URL
  } catch {
    return DEFAULT_CLAUDE_CODE_URL
  }
}

export function setClaudeCodeServerUrl(url: string): void {
  try {
    const trimmed = url.trim() || DEFAULT_CLAUDE_CODE_URL
    localStorage.setItem(CLAUDE_CODE_SERVER_URL_STORAGE_KEY, trimmed)
  } catch {
    // Sin localStorage disponible; se conserva el valor por defecto.
  }
}

export function getClaudeCodePassword(): string {
  try {
    return localStorage.getItem(CLAUDE_CODE_API_KEY_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

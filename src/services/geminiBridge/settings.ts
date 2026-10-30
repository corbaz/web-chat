// Lectura de la configuración guardada del proveedor `geminisub` (URL del
// bridge local + password). Espejo de services/codexBridge/settings.ts (ver
// odd/tasks/gemini-subscription-bridge.md).

import {
  LOCAL_SERVER_PROXIES,
  resolveLocalServerUrl,
} from '../../config/localServers'

export const DEFAULT_GEMINI_SUB_URL = 'http://127.0.0.1:4092'
export const GEMINI_SUB_API_KEY_STORAGE_KEY = 'geminisubApiKey'
export const GEMINI_SUB_SERVER_URL_STORAGE_KEY = 'geminisubServerUrl'

export function getGeminiSubServerUrl(): string {
  try {
    const stored = localStorage
      .getItem(GEMINI_SUB_SERVER_URL_STORAGE_KEY)
      ?.trim()
    return resolveLocalServerUrl(
      stored || DEFAULT_GEMINI_SUB_URL,
      LOCAL_SERVER_PROXIES.geminisub.path,
    )
  } catch {
    return DEFAULT_GEMINI_SUB_URL
  }
}

export function setGeminiSubServerUrl(url: string): void {
  try {
    const trimmed = url.trim() || DEFAULT_GEMINI_SUB_URL
    localStorage.setItem(GEMINI_SUB_SERVER_URL_STORAGE_KEY, trimmed)
  } catch {
    // Sin localStorage disponible; se conserva el valor por defecto.
  }
}

export function getGeminiSubPassword(): string {
  try {
    return localStorage.getItem(GEMINI_SUB_API_KEY_STORAGE_KEY)?.trim() ?? ''
  } catch {
    return ''
  }
}

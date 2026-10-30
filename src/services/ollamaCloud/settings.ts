// Configuración de Ollama Cloud (local): el servidor `ollama serve` no tiene
// contraseña (los modelos :cloud los autentica la sesión de `ollama signin`),
// así que en `ollamacloudApiKey` se guarda la URL del servidor. Así el
// proveedor queda "habilitado" igual que los demás (todos miran esa clave).

import {
  LOCAL_SERVER_PROXIES,
  resolveLocalServerUrl,
} from '../../config/localServers'

export const DEFAULT_OLLAMA_CLOUD_URL = 'http://127.0.0.1:11434'
export const OLLAMA_CLOUD_API_KEY_STORAGE_KEY = 'ollamacloudApiKey'

export function normalizeOllamaUrl(url: string): string {
  return resolveLocalServerUrl(
    url.trim().replace(/\/+$/, '') || DEFAULT_OLLAMA_CLOUD_URL,
    LOCAL_SERVER_PROXIES.ollamacloud.path,
  )
}

export function getOllamaCloudServerUrl(): string {
  try {
    return normalizeOllamaUrl(
      localStorage.getItem(OLLAMA_CLOUD_API_KEY_STORAGE_KEY) ?? '',
    )
  } catch {
    return DEFAULT_OLLAMA_CLOUD_URL
  }
}

// Modelos que el proveedor lista en /models pero que la cuenta del usuario no
// puede usar (p. ej. Groq: bloqueados a nivel proyecto, retirados o solo
// Enterprise). Se detectan por el mensaje de error del chat, se ocultan del
// selector y se recuerdan en localStorage hasta que cambie alguna API key.

import type { ProviderId } from './types'

const UNAVAILABLE_PATTERN =
  /blocked at the project level|decommissioned|model_not_found|does not exist or you do not have access|do not have access to (the )?model|model is unavailable|free tier can only be used from within opencode/i

/** Indica si un mensaje de error del proveedor significa "modelo no usable". */
export function isModelUnavailableMessage(message: string): boolean {
  return UNAVAILABLE_PATTERN.test(message)
}

const storageKey = (provider: ProviderId): string =>
  `modelCatalog:v1:unavailable:${provider}`

export function readUnavailableModels(provider: ProviderId): Set<string> {
  try {
    const raw = localStorage.getItem(storageKey(provider))
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return new Set(
      Array.isArray(parsed)
        ? parsed.filter((id): id is string => typeof id === 'string')
        : [],
    )
  } catch {
    return new Set()
  }
}

export function writeUnavailableModels(
  provider: ProviderId,
  ids: ReadonlySet<string>,
): void {
  try {
    if (ids.size === 0) {
      localStorage.removeItem(storageKey(provider))
    } else {
      localStorage.setItem(storageKey(provider), JSON.stringify([...ids]))
    }
  } catch {
    // Sin localStorage disponible; el bloqueo vive solo en memoria.
  }
}

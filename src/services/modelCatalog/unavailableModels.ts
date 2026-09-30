// Modelos que el proveedor lista en /models pero que la cuenta del usuario no
// puede usar (p. ej. Groq: bloqueados a nivel proyecto, retirados o solo
// Enterprise). Se detectan por el mensaje de error del chat, se ocultan del
// selector y se recuerdan en localStorage hasta que cambie alguna API key.

import type { ProviderId } from './types'

const UNAVAILABLE_PATTERN =
  /blocked at the project level|decommissioned|model_not_found|does not exist or you do not have access|do not have access to (the )?model|model is unavailable|free tier can only be used from within opencode|cannot find any route matching/i

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

// Hora (ms) en que se ocultó el primer modelo de la lista actual de un
// proveedor: los modelos gratis de OpenCode rotan, así que su lista de
// ocultos vence (ver expireUnavailableModels en store.ts).
const sinceKey = (provider: ProviderId): string =>
  `${storageKey(provider)}:since`

export function readUnavailableSince(provider: ProviderId): number | null {
  try {
    const raw = localStorage.getItem(sinceKey(provider))
    const value = raw ? Number(raw) : Number.NaN
    return Number.isFinite(value) ? value : null
  } catch {
    return null
  }
}

export function writeUnavailableModels(
  provider: ProviderId,
  ids: ReadonlySet<string>,
): void {
  try {
    if (ids.size === 0) {
      localStorage.removeItem(storageKey(provider))
      localStorage.removeItem(sinceKey(provider))
    } else {
      localStorage.setItem(storageKey(provider), JSON.stringify([...ids]))
      if (!localStorage.getItem(sinceKey(provider))) {
        localStorage.setItem(sinceKey(provider), String(Date.now()))
      }
    }
  } catch {
    // Sin localStorage disponible; el bloqueo vive solo en memoria.
  }
}

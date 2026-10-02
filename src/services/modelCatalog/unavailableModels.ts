// Modelos que el proveedor lista en /models pero que la cuenta del usuario no
// puede usar (p. ej. Groq: bloqueados a nivel proyecto, retirados o solo
// Enterprise; Gemini: sin cuota). Se detectan por el mensaje de error del
// chat o por el ping de modelos, se muestran deshabilitados en el selector
// (con el motivo al pasar el mouse) y se recuerdan en localStorage hasta que
// cambie alguna API key.

import type { ProviderId } from './types'

const UNAVAILABLE_PATTERN =
  /blocked at the project level|decommissioned|model_not_found|does not exist or you do not have access|do not have access to (the )?model|model is unavailable|free tier can only be used from within opencode|cannot find any route matching/i

/** Motivo por el que un modelo no se puede usar (texto del selector). */
export type UnavailableReason = 'unavailable' | 'quota'

export const UNAVAILABLE_REASON_LABELS: Record<UnavailableReason, string> = {
  unavailable: 'No disponible con tu cuenta',
  quota: 'Sin cuota o sin crédito en tu cuenta',
}

/** Indica si un mensaje de error del proveedor significa "modelo no usable". */
export function isModelUnavailableMessage(message: string): boolean {
  return UNAVAILABLE_PATTERN.test(message)
}

// Cuota agotada o sin crédito para ese modelo (Gemini Pro en el plan gratis
// responde 429 "... limit: 0"). Un límite por minuto pasajero NO entra.
const QUOTA_PATTERN =
  /limit: 0\b|insufficient_quota|credit balance is too low|exceeded your current quota|billing (is )?(not )?(enabled|required)|requires billing|insufficient (account )?(funds|balance)/i

/** Indica si el error significa "sin cuota o sin crédito para este modelo". */
export function isQuotaExhaustedMessage(message: string): boolean {
  return QUOTA_PATTERN.test(message)
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

// Motivo de cada modelo marcado (clave aparte para no romper el formato de
// la lista de ids ya guardada: un id sin motivo cuenta como 'unavailable').
const reasonsKey = (provider: ProviderId): string =>
  `${storageKey(provider)}:reasons`

export function readUnavailableReasons(
  provider: ProviderId,
): Map<string, UnavailableReason> {
  try {
    const raw = localStorage.getItem(reasonsKey(provider))
    const parsed: unknown = raw ? JSON.parse(raw) : {}
    const reasons = new Map<string, UnavailableReason>()
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      for (const [id, reason] of Object.entries(parsed)) {
        if (reason === 'quota' || reason === 'unavailable') {
          reasons.set(id, reason)
        }
      }
    }
    return reasons
  } catch {
    return new Map()
  }
}

export function writeUnavailableReasons(
  provider: ProviderId,
  reasons: ReadonlyMap<string, UnavailableReason>,
): void {
  try {
    if (reasons.size === 0) localStorage.removeItem(reasonsKey(provider))
    else {
      localStorage.setItem(
        reasonsKey(provider),
        JSON.stringify(Object.fromEntries(reasons)),
      )
    }
  } catch {
    // Sin localStorage: el motivo vive solo en memoria.
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

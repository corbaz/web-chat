// Persistencia en localStorage del nivel de esfuerzo elegido por el usuario,
// por proveedor y modelo (T4, ver odd/tasks/claude-subscription-bridge.md).
// Separado de effort.ts para mantenerlo puro (mismo patrón que
// services/claudeBridge/{client,settings}.ts).

import { getEffortLevels } from './effort'

const STORAGE_PREFIX = 'effort:v1:'

function storageKey(provider: string, modelId: string): string {
  return `${STORAGE_PREFIX}${provider}:${modelId}`
}

/** Valor crudo guardado ('' si no hay nada guardado todavía). */
export function getStoredEffort(provider: string, modelId: string): string {
  try {
    return localStorage.getItem(storageKey(provider, modelId))?.trim() ?? ''
  } catch {
    return ''
  }
}

export function setStoredEffort(
  provider: string,
  modelId: string,
  effort: string,
): void {
  try {
    const key = storageKey(provider, modelId)
    if (!effort) {
      localStorage.removeItem(key)
    } else {
      localStorage.setItem(key, effort)
    }
  } catch {
    // Sin localStorage disponible; la elección solo dura en memoria.
  }
}

/**
 * Nivel de esfuerzo efectivo para un modelo: sin "Por defecto" (follow-up de
 * T4), todo modelo con niveles siempre manda uno explícito. Prioridad: la
 * elección guardada si sigue siendo válida para este modelo; si no hay nada
 * guardado, o lo guardado ya no está entre los niveles del modelo (cambió de
 * modelo, o los niveles se regeneraron), el más bajo (`levels[0]`). '' cuando
 * el modelo no tiene niveles (getEffortLevels devuelve []).
 */
export function resolveEffort(provider: string, modelId: string): string {
  const levels = getEffortLevels(provider, modelId)
  if (levels.length === 0) return ''

  const stored = getStoredEffort(provider, modelId)
  return levels.includes(stored) ? stored : levels[0]
}

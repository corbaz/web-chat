// Persistencia en localStorage del nivel de esfuerzo elegido por el usuario,
// por proveedor y modelo (T4, ver odd/tasks/claude-subscription-bridge.md).
// Separado de effort.ts para mantenerlo puro (mismo patrón que
// services/claudeBridge/{client,settings}.ts).

import { getEffortLevels } from './effort'
import { DEFAULT_EFFORT_BY_PROVIDER } from './modelDefaults'

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
 * T4), todo modelo con niveles siempre manda uno explícito. Prioridad: (1) la
 * elección guardada si sigue siendo válida para este modelo; (2) si no hay
 * nada guardado (o ya no es válido, p. ej. cambió de modelo o se
 * regeneraron los niveles), el default del proveedor (T17,
 * `DEFAULT_EFFORT_BY_PROVIDER`) cuando ese nivel es válido para este modelo;
 * (3) si no, el más bajo (`levels[0]`). '' cuando el modelo no tiene niveles
 * (getEffortLevels devuelve []).
 */
export function resolveEffort(provider: string, modelId: string): string {
  const levels = getEffortLevels(provider, modelId)
  if (levels.length === 0) return ''

  const stored = getStoredEffort(provider, modelId)
  if (levels.includes(stored)) return stored

  const providerDefault = DEFAULT_EFFORT_BY_PROVIDER[provider]
  if (providerDefault && levels.includes(providerDefault))
    return providerDefault

  return levels[0]
}

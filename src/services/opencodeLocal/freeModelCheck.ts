// Chequeo de los modelos gratis al elegir OpenCode Free (ver modelProbe.ts):
// actualiza la lista del servidor local y hace ping a cada modelo, como
// máximo una vez cada 6 horas y de a un chequeo por vez (las 10 salas
// comparten el resultado). Oculta los que fallan como "no disponible" y
// vuelve a mostrar los que ya funcionan.

import {
  getCatalogModelIds,
  markModelAvailable,
  markModelUnavailable,
  refreshProvider,
} from '../modelCatalog/store'
import { probeFreeModels } from './modelProbe'
import { getOpenCodeFreePassword, getOpenCodeFreeServerUrl } from './settings'

const STORAGE_KEY = 'opencodefree:probe:v1'
export const FREE_MODEL_CHECK_INTERVAL_MS = 6 * 60 * 60 * 1000

let inFlight: Promise<void> | null = null

function readLastCheck(): number {
  try {
    const value = Number(localStorage.getItem(STORAGE_KEY))
    return Number.isFinite(value) ? value : 0
  } catch {
    return 0
  }
}

function writeLastCheck(at: number): void {
  try {
    localStorage.setItem(STORAGE_KEY, String(at))
  } catch {
    // Sin localStorage: se vuelve a chequear en la próxima elección.
  }
}

export function isFreeModelCheckDue(
  lastCheck: number,
  now = Date.now(),
): boolean {
  return now - lastCheck > FREE_MODEL_CHECK_INTERVAL_MS
}

/** Actualiza y prueba los modelos gratis si toca. Nunca lanza. */
export function checkFreeModelsIfDue(): Promise<void> {
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      await refreshProvider('opencodefree')
      if (!isFreeModelCheckDue(readLastCheck())) return

      const password = getOpenCodeFreePassword()
      if (!password) return
      const results = await probeFreeModels(
        getOpenCodeFreeServerUrl(),
        password,
        getCatalogModelIds('opencodefree'),
      )
      const outcomes = Object.entries(results)
      // Todo 'unknown' = servidor apagado o sin red: no cuenta como chequeo
      // hecho (se reintenta en la próxima elección).
      if (outcomes.every(([, result]) => result === 'unknown')) return
      for (const [modelId, result] of outcomes) {
        if (result === 'unavailable') {
          markModelUnavailable('opencodefree', modelId)
        } else if (result === 'ok') {
          markModelAvailable('opencodefree', modelId)
        }
      }
      writeLastCheck(Date.now())
    } catch {
      // El chequeo es una ayuda: si falla, queda el ocultado por error real.
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

// Precios de los modelos en el navegador (ver odd/tasks/message-cost.md):
// guardados en localStorage con la hora en que se bajaron; se renuevan desde
// /api/prices cuando tienen más de un día (al abrir la app y al elegir o
// cambiar de modelo). Un solo pedido en curso a la vez.

import type { PricingTable } from './pricing'

export const PRICES_PATH = '/api/prices'
const STORAGE_KEY = 'prices:v1'
export const PRICES_MAX_AGE_MS = 24 * 60 * 60 * 1000

interface StoredPrices {
  fetchedAt: number
  prices: PricingTable
}

let memory: StoredPrices | null = null
let inFlight: Promise<void> | null = null

function readStored(): StoredPrices | null {
  if (memory) return memory
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as StoredPrices
    if (typeof parsed?.fetchedAt !== 'number' || !parsed.prices) return null
    memory = parsed
    return parsed
  } catch {
    return null
  }
}

/** Tabla de precios guardada (puede estar vencida), o null si nunca se bajó. */
export function getPricingTable(): PricingTable | null {
  return readStored()?.prices ?? null
}

export function isStale(
  fetchedAt: number | undefined,
  now = Date.now(),
): boolean {
  return fetchedAt === undefined || now - fetchedAt > PRICES_MAX_AGE_MS
}

/** Baja los precios si no hay o tienen más de un día. Nunca lanza. */
export function ensureFreshPrices(): Promise<void> {
  if (!isStale(readStored()?.fetchedAt)) return Promise.resolve()
  if (inFlight) return inFlight
  inFlight = (async () => {
    try {
      const response = await fetch(PRICES_PATH)
      if (!response.ok) return
      const data = (await response.json()) as Partial<StoredPrices>
      if (!data.prices || typeof data.prices !== 'object') return
      memory = { fetchedAt: Date.now(), prices: data.prices }
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory))
      } catch {
        // Sin localStorage: los precios duran solo en memoria.
      }
    } catch {
      // Sin red o sin /api/prices (p. ej. build estático sin funciones): se
      // sigue con lo que haya guardado; se reintenta en el próximo cambio.
    } finally {
      inFlight = null
    }
  })()
  return inFlight
}

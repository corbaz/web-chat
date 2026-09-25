// Caché en localStorage del catálogo, por proveedor. Versionada para poder
// invalidar el formato completo si cambia la forma de CatalogModel.

import type { CatalogModel, ProviderId } from './types'

const CACHE_VERSION = 1

interface CacheEntry {
  models: CatalogModel[]
  fetchedAt: number
}

const cacheKey = (provider: ProviderId): string =>
  `modelCatalog:v${CACHE_VERSION}:${provider}`

export function readCatalogCache(provider: ProviderId): CacheEntry | null {
  try {
    const raw = localStorage.getItem(cacheKey(provider))
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<CacheEntry> | null
    if (!parsed || !Array.isArray(parsed.models)) return null
    return {
      models: parsed.models,
      fetchedAt: typeof parsed.fetchedAt === 'number' ? parsed.fetchedAt : 0,
    }
  } catch (error) {
    console.warn(
      `No se pudo leer la caché del catálogo de modelos (${provider}):`,
      error,
    )
    return null
  }
}

export function writeCatalogCache(
  provider: ProviderId,
  models: CatalogModel[],
): void {
  try {
    const entry: CacheEntry = { models, fetchedAt: Date.now() }
    localStorage.setItem(cacheKey(provider), JSON.stringify(entry))
  } catch (error) {
    console.warn(
      `No se pudo escribir la caché del catálogo de modelos (${provider}):`,
      error,
    )
  }
}

// Store central del catálogo de modelos: cachea en localStorage, expone
// lecturas síncronas (getModels/getAllModels/findModel) y refresco en
// background (refreshProvider/refreshAll) que dispara 'models-updated'.
//
// Proveedores sin fetcher registrado (ver registry.ts) mantienen siempre su
// catálogo estático sin cambios: refreshProvider no hace nada para ellos.

import { anthropicModels } from '../../components/HEADER/models/anthropicModels'
import { geminiModels } from '../../components/HEADER/models/geminiModels'
import { groqModels } from '../../components/HEADER/models/groqModels'
import { openaiModels } from '../../components/HEADER/models/openaiModels'
import { opencodeFreeModels } from '../../components/HEADER/models/opencodeFreeModels'
import { opencodeZenModels } from '../../components/HEADER/models/opencodeZenModels'
import { opengoModels } from '../../components/HEADER/models/opengoModels'
import { routellmModels } from '../../components/HEADER/models/routellmModels'
import { readCatalogCache, writeCatalogCache } from './cache'
import { mergeWithStatic } from './mergeWithStatic'
import { FETCHER_REGISTRY } from './registry'
import type { CatalogModel, ProviderId } from './types'

export const PROVIDER_IDS: ProviderId[] = [
  'groq',
  'routellm',
  'openai',
  'anthropic',
  'opengo',
  'opencodefree',
  'opencodezen',
  'gemini',
]

const STATIC_MODELS: Record<ProviderId, readonly CatalogModel[]> = {
  groq: groqModels,
  routellm: routellmModels,
  openai: openaiModels,
  anthropic: anthropicModels,
  opengo: opengoModels,
  opencodefree: opencodeFreeModels,
  opencodezen: opencodeZenModels,
  gemini: geminiModels,
}

function loadInitialModels(provider: ProviderId): CatalogModel[] {
  const cached = readCatalogCache(provider)
  if (cached && cached.models.length > 0) return cached.models
  return [...STATIC_MODELS[provider]]
}

const catalog: Record<ProviderId, CatalogModel[]> = PROVIDER_IDS.reduce(
  (acc, provider) => {
    acc[provider] = loadInitialModels(provider)
    return acc
  },
  {} as Record<ProviderId, CatalogModel[]>,
)

type Listener = () => void
const listeners = new Set<Listener>()

let version = 0
let allModelsCache: { version: number; models: CatalogModel[] } | null = null

function notify(): void {
  version += 1
  for (const listener of listeners) listener()
  try {
    window.dispatchEvent(new Event('models-updated'))
  } catch (error) {
    // Entorno sin `window` (p. ej. tests fuera de un DOM); no es fatal.
    console.warn('No se pudo despachar el evento models-updated:', error)
  }
}

export function subscribeToModelCatalog(listener: Listener): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function getModels(provider: ProviderId): CatalogModel[] {
  return catalog[provider]
}

export function getAllModels(): CatalogModel[] {
  if (allModelsCache && allModelsCache.version === version) {
    return allModelsCache.models
  }
  const models = PROVIDER_IDS.flatMap((provider) => catalog[provider])
  allModelsCache = { version, models }
  return models
}

export function findModel(
  id: string,
  provider?: ProviderId,
): CatalogModel | undefined {
  if (provider) return catalog[provider].find((model) => model.id === id)
  for (const p of PROVIDER_IDS) {
    const found = catalog[p].find((model) => model.id === id)
    if (found) return found
  }
  return undefined
}

function readApiKey(provider: ProviderId): string {
  try {
    return localStorage.getItem(`${provider}ApiKey`)?.trim() ?? ''
  } catch {
    return ''
  }
}

export async function refreshProvider(provider: ProviderId): Promise<void> {
  const fetcher = FETCHER_REGISTRY[provider]
  if (!fetcher) return // Proveedor estático: nada que refrescar todavía.

  const apiKey = readApiKey(provider)
  if (fetcher.requiresKey && !apiKey) return // Sin key: se conserva la lista actual.

  try {
    const ids = await fetcher.fetchIds(apiKey)
    if (ids.length === 0) {
      // Lista vacía se trata como fallo: se conserva el catálogo actual.
      throw new Error(`Lista de modelos vacía para "${provider}"`)
    }
    const merged = mergeWithStatic(ids, fetcher.staticModels, provider)
    catalog[provider] = merged
    writeCatalogCache(provider, merged)
    notify()
  } catch (error) {
    console.warn(
      `No se pudo actualizar el catálogo de modelos para "${provider}", se mantiene la lista actual:`,
      error,
    )
  }
}

export async function refreshAll(): Promise<void> {
  await Promise.all(PROVIDER_IDS.map((provider) => refreshProvider(provider)))
}

let initialized = false

/**
 * Bootstrap de la app: refresca todos los proveedores en background (sin
 * bloquear el render, que ya usa caché/estático de forma síncrona) y se
 * vuelve a refrescar cuando cambia alguna API key.
 */
export function initModelCatalog(): void {
  if (initialized) return
  initialized = true
  void refreshAll()
  window.addEventListener('apikey-changed', () => {
    void refreshAll()
  })
}

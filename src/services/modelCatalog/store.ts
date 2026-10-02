// Store central del catálogo de modelos: cachea en localStorage, expone
// lecturas síncronas (getModels/getAllModels/findModel) y refresco en
// background (refreshProvider/refreshAll) que dispara 'models-updated'.
//
// Proveedores sin fetcher registrado (ver registry.ts) mantienen siempre su
// catálogo estático sin cambios: refreshProvider no hace nada para ellos.

import { anthropicModels } from '../../components/HEADER/models/anthropicModels'
import { claudeCodeModels } from '../../components/HEADER/models/claudeCodeModels'
import { codexSubModels } from '../../components/HEADER/models/codexSubModels'
import { geminiModels } from '../../components/HEADER/models/geminiModels'
import { geminiSubModels } from '../../components/HEADER/models/geminiSubModels'
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
import {
  readUnavailableModels,
  readUnavailableReasons,
  readUnavailableSince,
  type UnavailableReason,
  writeUnavailableModels,
  writeUnavailableReasons,
} from './unavailableModels'

export const PROVIDER_IDS: ProviderId[] = [
  'groq',
  'routellm',
  'openai',
  'anthropic',
  'opengo',
  'opencodezen',
  'opencodefree',
  'claudecode',
  'codexsub',
  'geminisub',
  'gemini',
]

const STATIC_MODELS: Record<ProviderId, readonly CatalogModel[]> = {
  groq: groqModels,
  routellm: routellmModels,
  openai: openaiModels,
  anthropic: anthropicModels,
  opengo: opengoModels,
  opencodezen: opencodeZenModels,
  opencodefree: opencodeFreeModels,
  claudecode: claudeCodeModels,
  codexsub: codexSubModels,
  geminisub: geminiSubModels,
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

// Modelos ocultos porque el proveedor los rechazó como no usables (ver
// unavailableModels.ts). `visible` se recalcula en cada cambio para que
// getModels devuelva siempre la misma referencia entre notificaciones
// (requisito de useSyncExternalStore).
const unavailable: Record<ProviderId, Set<string>> = PROVIDER_IDS.reduce(
  (acc, provider) => {
    acc[provider] = readUnavailableModels(provider)
    return acc
  },
  {} as Record<ProviderId, Set<string>>,
)

const unavailableReasons: Record<
  ProviderId,
  Map<string, UnavailableReason>
> = PROVIDER_IDS.reduce(
  (acc, provider) => {
    acc[provider] = readUnavailableReasons(provider)
    return acc
  },
  {} as Record<ProviderId, Map<string, UnavailableReason>>,
)

function persistUnavailable(provider: ProviderId): void {
  for (const id of unavailableReasons[provider].keys()) {
    if (!unavailable[provider].has(id)) unavailableReasons[provider].delete(id)
  }
  writeUnavailableModels(provider, unavailable[provider])
  writeUnavailableReasons(provider, unavailableReasons[provider])
}

function computeVisible(provider: ProviderId): CatalogModel[] {
  const hidden = unavailable[provider]
  if (hidden.size === 0) return catalog[provider]
  return catalog[provider].filter((model) => !hidden.has(model.id))
}

const visible: Record<ProviderId, CatalogModel[]> = PROVIDER_IDS.reduce(
  (acc, provider) => {
    acc[provider] = computeVisible(provider)
    return acc
  },
  {} as Record<ProviderId, CatalogModel[]>,
)

type Listener = () => void
const listeners = new Set<Listener>()

let version = 0
let allModelsCache: { version: number; models: CatalogModel[] } | null = null

function notify(): void {
  for (const provider of PROVIDER_IDS)
    visible[provider] = computeVisible(provider)
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
  return visible[provider]
}

/** Ids de todo el catálogo de un proveedor, incluidos los ocultos. */
export function getCatalogModelIds(provider: ProviderId): string[] {
  return catalog[provider].map((model) => model.id)
}

/** Vuelve a mostrar un modelo oculto que ya funciona (ping de OpenCode Free). */
export function markModelAvailable(provider: ProviderId, id: string): void {
  if (!unavailable[provider].has(id)) return
  unavailable[provider].delete(id)
  persistUnavailable(provider)
  notify()
}

/** Oculta un modelo que el proveedor rechazó como no usable. */
export function markModelUnavailable(
  provider: ProviderId,
  id: string,
  reason: UnavailableReason = 'unavailable',
): void {
  if (
    unavailable[provider].has(id) &&
    (unavailableReasons[provider].get(id) ?? 'unavailable') === reason
  ) {
    return
  }
  unavailable[provider].add(id)
  unavailableReasons[provider].set(id, reason)
  persistUnavailable(provider)
  notify()
}

/**
 * Vuelve a mostrar los modelos ocultos de un proveedor si se ocultaron hace
 * más de `maxAgeMs` (OpenCode Free: los modelos gratis rotan y uno que hoy
 * falla puede volver mañana).
 */
export function expireUnavailableModels(
  provider: ProviderId,
  maxAgeMs: number,
  now = Date.now(),
): void {
  if (unavailable[provider].size === 0) return
  const since = readUnavailableSince(provider)
  if (since !== null && now - since <= maxAgeMs) return
  unavailable[provider].clear()
  persistUnavailable(provider)
  notify()
}

/** Vuelve a mostrar todos los modelos ocultos (p. ej. al cambiar una key). */
export function clearUnavailableModels(): void {
  let changed = false
  for (const provider of PROVIDER_IDS) {
    if (unavailable[provider].size === 0) continue
    unavailable[provider].clear()
    persistUnavailable(provider)
    changed = true
  }
  if (changed) notify()
}

export function getAllModels(): CatalogModel[] {
  if (allModelsCache && allModelsCache.version === version) {
    return allModelsCache.models
  }
  // Todos los modelos, también los que la cuenta no puede usar (con su
  // motivo): el selector los muestra deshabilitados en vez de esconderlos.
  // getModels(provider) sigue devolviendo solo los usables (elección del
  // modelo por defecto y del reemplazo cuando el elegido deja de servir).
  const models = PROVIDER_IDS.flatMap((provider) =>
    catalog[provider].map((model) =>
      unavailable[provider].has(model.id)
        ? {
            ...model,
            disabledReason:
              unavailableReasons[provider].get(model.id) ?? 'unavailable',
          }
        : model,
    ),
  )
  allModelsCache = { version, models }
  return models
}

export function findModel(
  id: string,
  provider?: ProviderId,
): CatalogModel | undefined {
  if (provider) return visible[provider].find((model) => model.id === id)
  for (const p of PROVIDER_IDS) {
    const found = visible[p].find((model) => model.id === id)
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

// Último error al bajar la lista de cada proveedor (null = la última vez
// anduvo). Antes el fallo era silencioso y se seguía con una lista vieja o la
// de respaldo como si fuera la real; "Revisar modelos" lo muestra.
const refreshErrors: Partial<Record<ProviderId, string | null>> = {}

/** Error de la última actualización de la lista, o null si anduvo. */
export function getRefreshError(provider: ProviderId): string | null {
  return refreshErrors[provider] ?? null
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
    refreshErrors[provider] = null
    notify()
  } catch (error) {
    refreshErrors[provider] =
      error instanceof Error ? error.message : String(error)
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
    // Una key nueva puede habilitar modelos antes rechazados (otro proyecto
    // o permisos cambiados en la consola del proveedor).
    clearUnavailableModels()
    void refreshAll()
  })
}

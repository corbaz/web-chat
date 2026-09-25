// Hook React sobre el store del catálogo. Sin `provider`, devuelve todos los
// modelos de todos los proveedores; con `provider`, solo los de ese proveedor.
// Se re-renderiza automáticamente cuando refreshProvider/refreshAll actualizan
// el catálogo.

import { useCallback, useSyncExternalStore } from 'react'
import { getAllModels, getModels, subscribeToModelCatalog } from './store'
import type { CatalogModel, ProviderId } from './types'

export function useModelCatalog(provider?: ProviderId): CatalogModel[] {
  const getSnapshot = useCallback(
    () => (provider ? getModels(provider) : getAllModels()),
    [provider],
  )

  return useSyncExternalStore(subscribeToModelCatalog, getSnapshot, getSnapshot)
}

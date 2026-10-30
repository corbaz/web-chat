// Fusiona una lista de IDs obtenidos dinámicamente con el catálogo estático:
// los IDs conocidos conservan toda su metadata estática, los desconocidos
// reciben el nombre que trajo el fetch (si lo trajo) o uno derivado del ID.

import { deriveNameFromId, inferDeveloper } from './naming'
import type { CatalogModel, FetchedModel, ProviderId } from './types'

export function mergeWithStatic(
  fetchedIds: FetchedModel[],
  staticModels: readonly CatalogModel[],
  provider: ProviderId,
): CatalogModel[] {
  const staticById = new Map(staticModels.map((model) => [model.id, model]))

  return fetchedIds.map((fetched) => {
    const id = typeof fetched === 'string' ? fetched : fetched.id
    const knownModel = staticById.get(id)
    if (knownModel) return knownModel

    return {
      id,
      name:
        (typeof fetched === 'string' ? undefined : fetched.name) ||
        deriveNameFromId(id),
      developer: inferDeveloper(id),
      provider,
    }
  })
}

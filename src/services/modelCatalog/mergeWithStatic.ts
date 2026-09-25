// Fusiona una lista de IDs obtenidos dinámicamente con el catálogo estático:
// los IDs conocidos conservan toda su metadata estática, los desconocidos
// reciben nombre y desarrollador derivados del propio ID.

import { deriveNameFromId, inferDeveloper } from './naming'
import type { CatalogModel, ProviderId } from './types'

export function mergeWithStatic(
  fetchedIds: string[],
  staticModels: readonly CatalogModel[],
  provider: ProviderId,
): CatalogModel[] {
  const staticById = new Map(staticModels.map((model) => [model.id, model]))

  return fetchedIds.map((id) => {
    const knownModel = staticById.get(id)
    if (knownModel) return knownModel

    return {
      id,
      name: deriveNameFromId(id),
      developer: inferDeveloper(id),
      provider,
    }
  })
}

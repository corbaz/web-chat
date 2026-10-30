// Fetcher de Claude (suscripción, bridge local): consulta `GET /models` del
// bridge, que arma la lista en vivo desde models.dev (ver
// scripts/claude-bridge/models.ts), igual que geminiSubFetcher.ts. Devuelve
// también el nombre: un modelo nuevo se ve "Claude Sonnet 6.5" y no un nombre
// derivado del id.

import { listModels } from '../../claudeBridge/client'
import { getClaudeCodeServerUrl } from '../../claudeBridge/settings'
import type { FetchedModel } from '../types'

/**
 * Un bridge anterior a este cambio devuelve solo los 4 alias (haiku, sonnet,
 * opus, fable) sin versión: se rechaza para conservar la lista completa
 * hasta que se reinicie.
 */
export function toClaudeCodeModels(
  models: ReadonlyArray<{ id: string; name: string }>,
): FetchedModel[] {
  if (!models.some((model) => model.id.startsWith('claude-'))) {
    throw new Error(
      'El bridge de Claude devolvió solo alias sin versión: reiniciá el bridge para ver la lista completa.',
    )
  }
  return models.map(({ id, name }) => ({ id, name }))
}

export async function fetchClaudeCodeModelIds(
  password: string,
): Promise<FetchedModel[]> {
  if (!password) return []
  return toClaudeCodeModels(
    await listModels(getClaudeCodeServerUrl(), password),
  )
}

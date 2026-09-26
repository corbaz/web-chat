// Fetcher/parser de OpenCode Free (servidor local). A diferencia de los
// demás fetchers, no pega a `opencode.ai`: consulta el servidor local
// `opencode serve` configurado por el usuario (ver
// src/services/opencodeLocal/settings.ts). `apiKey` acá es la password del
// servidor local, guardada como cualquier otra API key (`opencodefreeApiKey`).

import { listFreeModels } from '../../opencodeLocal/client'
import { getOpenCodeFreeServerUrl } from '../../opencodeLocal/settings'

export async function fetchOpenCodeFreeModelIds(
  password: string,
): Promise<string[]> {
  if (!password) return []
  return listFreeModels(getOpenCodeFreeServerUrl(), password)
}

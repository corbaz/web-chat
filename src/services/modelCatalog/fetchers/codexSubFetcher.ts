// Fetcher/parser de Codex (suscripción de ChatGPT, bridge local). A
// diferencia de los demás fetchers, no pega a un endpoint de un proveedor
// remoto: consulta el bridge local (`GET /models`, ver
// scripts/codex-bridge/server.ts), igual que opencodeFreeFetcher.ts. Además
// de los ids (lo único que necesita el catálogo, ver registry.ts), guarda
// las capacidades por modelo (esfuerzo, visión) en capabilities.ts: a
// diferencia de los demás proveedores, acá no hay tabla estática generada de
// models.dev (ver Verified facts en odd/tasks/openai-subscription-bridge.md).

import { setCodexModelCapabilities } from '../../codexBridge/capabilities'
import { listModels } from '../../codexBridge/client'
import { getCodexServerUrl } from '../../codexBridge/settings'

export async function fetchCodexSubModelIds(
  password: string,
): Promise<string[]> {
  if (!password) return []
  const models = await listModels(getCodexServerUrl(), password)
  for (const model of models) {
    setCodexModelCapabilities(model.id, {
      effortLevels: model.effortLevels,
      vision: model.vision,
    })
  }
  return models.map((model) => model.id)
}

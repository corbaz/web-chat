// Fetcher de Ollama Cloud (local): la lista generada de modelos cloud del
// plan gratis (ver scripts/update-vision-models.ts). Consultar el servidor
// local confirma que está corriendo: si no responde, el store conserva el
// catálogo actual. No se suman los modelos que el usuario tiene bajados:
// entre ellos hay pagos y retirados. `apiKey` acá es la URL del servidor.

import { OLLAMA_CLOUD_MODELS } from '../../../config/ollamaCloudModels.generated'
import { checkOllamaServer } from '../../ollamaCloud/client'

export async function fetchOllamaCloudModelIds(
  serverUrl: string,
): Promise<string[]> {
  if (!serverUrl) return []
  if (!(await checkOllamaServer(serverUrl))) {
    throw new Error(`Ollama no responde en ${serverUrl}`)
  }
  return OLLAMA_CLOUD_MODELS.map((model) => model.id)
}

// Fetcher de Gemini (suscripción de Google AI Pro, bridge local): consulta
// `GET /models` del bridge (que a su vez corre `agy models`), igual que
// codexSubFetcher.ts. Solo hacen falta los ids; el esfuerzo viene en el id.

import { listModels } from '../../geminiBridge/client'
import { getGeminiSubServerUrl } from '../../geminiBridge/settings'

export async function fetchGeminiSubModelIds(
  password: string,
): Promise<string[]> {
  if (!password) return []
  const models = await listModels(getGeminiSubServerUrl(), password)
  return models.map((model) => model.id)
}

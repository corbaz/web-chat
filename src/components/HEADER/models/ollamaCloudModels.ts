// Catálogo de Ollama Cloud (local): modelos cloud de ollama.com (generado por
// `bun run update:models`, el navegador no puede leer esa lista por CORS).
// Al arrancar, el fetcher le suma los modelos cloud que el servidor local ya
// conoce (fetchers/ollamaCloudFetcher.ts). Cuáles entran en el plan gratis
// no lo dice ninguna API: "Revisar modelos" marca los que responden 402.

import { OLLAMA_CLOUD_MODELS } from '../../../config/ollamaCloudModels.generated'

export interface OllamaCloudModel {
  id: string
  name: string
  developer: string
  provider: 'ollamacloud'
}

export const ollamaCloudModels: OllamaCloudModel[] = OLLAMA_CLOUD_MODELS.map(
  (model) => ({
    id: model.id,
    name: model.name,
    developer: 'Ollama Cloud',
    provider: 'ollamacloud',
  }),
)

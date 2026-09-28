// Capacidad de visión (entrada de imágenes) por modelo y proveedor.
// Fuente principal: models.dev (`modalities.input` incluye `image`), volcado
// en visionModels.generated.ts por `bun run update:vision`. Para IDs que
// models.dev todavía no conoce se usa una heurística conservadora.

import { TEXT_ONLY_MODELS, VISION_MODELS } from './visionModels.generated'

// Heurística para modelos nuevos que aún no están en models.dev.
function fallbackSupportsVision(modelId: string, provider: string): boolean {
  switch (provider) {
    case 'openai':
      return (
        modelId.startsWith('gpt-4o') ||
        modelId.startsWith('gpt-4.1') ||
        modelId.startsWith('gpt-5') ||
        modelId.startsWith('o3') ||
        modelId.startsWith('o4')
      )
    case 'anthropic':
      return modelId.startsWith('claude-')
    case 'gemini':
      return modelId.startsWith('gemini-')
    case 'opencodezen':
      return (
        modelId.startsWith('claude-') ||
        modelId.startsWith('gpt-') ||
        modelId.startsWith('gemini-') ||
        modelId.includes('vision') ||
        modelId.includes('omni')
      )
    case 'opengo':
      return modelId.includes('vision') || modelId.includes('omni')
    case 'opencodefree':
      // Sin imágenes en v1 (ver odd/tasks/opencode-free-local.md).
      return false
    case 'claudecode':
      // T5: todos los modelos de chat de Anthropic aceptan imágenes
      // (models.dev), vía el bridge en modo stream-json (ver
      // odd/tasks/claude-subscription-bridge.md).
      return modelId.startsWith('claude-')
    default:
      return false
  }
}

export function supportsVision(modelId: string, provider?: string): boolean {
  if (!modelId || !provider) return false
  if (VISION_MODELS[provider]?.has(modelId)) return true
  if (TEXT_ONLY_MODELS[provider]?.has(modelId)) return false
  return fallbackSupportsVision(modelId, provider)
}

// Capacidad de visión (entrada de imágenes) por modelo y proveedor.
// Conservador a propósito: solo se habilitan modelos verificados o con un
// patrón de ID inequívoco. Un modelo no listado no ofrece adjuntar imágenes.

// Groq: único modelo verificado con entrada de imágenes.
const GROQ_VISION_MODELS = new Set<string>(['qwen/qwen3.8-27b'])

export function supportsVision(modelId: string, provider?: string): boolean {
  if (!modelId || !provider) return false

  switch (provider) {
    case 'groq':
      return GROQ_VISION_MODELS.has(modelId)
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
      return true
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
    case 'routellm':
      return false
    default:
      return false
  }
}

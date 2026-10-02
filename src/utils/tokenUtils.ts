/**
 * Utilidades para manejar y calcular tokens en mensajes para APIs de IA
 */

/**
 * Estimación aproximada de tokens basada en palabras.
 * Las APIs de LLM como GPT y Llama suelen usar ~1.3 tokens por palabra en promedio.
 *
 * @param text Texto para estimar tokens
 * @returns Número estimado de tokens
 */
const estimateTokens = (text: string): number => {
  if (!text) return 0

  // Contar palabras (aproximadamente 4 caracteres por palabra)
  const wordCount = text.trim().split(/\s+/).length

  // Aplicar factor de conversión palabra-token (aproximadamente 1.3 tokens por palabra)
  const estimatedTokens = Math.ceil(wordCount * 1.3)

  return estimatedTokens
}

/**
 * Estima tokens para mensajes de chat completos
 *
 * @param messages Array de mensajes con role y content
 * @returns Número total estimado de tokens
 */
export const estimateMessagesTokens = (
  messages: Array<{ role: string; content: string }>,
): number => {
  // Tokens base por cada mensaje (4 tokens por mensaje para metadata)
  const baseTokensPerMessage = 4

  // Suma de tokens de todos los mensajes
  let totalTokens = 0

  for (const message of messages) {
    // Tokens del contenido
    totalTokens += estimateTokens(message.content)

    // Tokens base por mensaje (metadata)
    totalTokens += baseTokensPerMessage
  }

  return totalTokens
}

import { MODEL_LIMITS } from '../config/modelLimits.generated'
import { stripGeminiSubEffortSuffix } from '../services/geminiBridge/modelId'
import { getAllModels } from '../services/modelCatalog/store'

// Claude (suscripción, bridge local a `claude -p`, ver
// odd/tasks/claude-subscription-bridge.md): el bridge devuelve el id real de
// Anthropic (modelUsage) como `model`, así que normalmente ya llega un id que
// existe en MODEL_LIMITS.anthropic. Este mapa es el respaldo simple para el
// caso en que llegue el alias sin resolver (p. ej. una respuesta de error
// antes de tener modelUsage): apunta al id más nuevo de cada familia que ya
// figura en modelLimits.generated.ts.
const CLAUDE_CODE_ALIAS_TO_ANTHROPIC_ID: Record<string, string> = {
  haiku: 'claude-haiku-4-5-20251001',
  sonnet: 'claude-sonnet-5',
  opus: 'claude-opus-5-5',
  fable: 'claude-fable-5-1',
}

/**
 * Obtiene el límite de tokens para un modelo específico
 *
 * @param modelId ID del modelo
 * @returns Límite de tokens para el modelo (por defecto 8192 si no se conoce)
 */
export const getModelTokenLimit = (
  modelId: string,
  provider?: string,
): number => {
  // 1) Contexto real según models.dev (ver scripts/update-vision-models.ts).
  //    OpenCode Free sirve los modelos gratis de Zen: comparte sus límites.
  //    Claude (suscripción) sirve los modelos reales de Anthropic: comparte
  //    sus límites.
  const limitsProvider =
    provider === 'opencodefree'
      ? 'opencodezen'
      : provider === 'claudecode'
        ? 'anthropic'
        : provider === 'geminisub'
          ? 'gemini'
          : provider
  // Gemini (suscripción): el esfuerzo va en el id, los límites no lo tienen.
  const limitsModelId =
    provider === 'geminisub' ? stripGeminiSubEffortSuffix(modelId) : modelId
  let known = limitsProvider
    ? MODEL_LIMITS[limitsProvider]?.[limitsModelId]
    : undefined
  if (!known && provider === 'claudecode') {
    const aliasId = CLAUDE_CODE_ALIAS_TO_ANTHROPIC_ID[modelId]
    if (aliasId) known = MODEL_LIMITS.anthropic[aliasId]
  }
  if (known) return known[0]

  // 2) Metadatos del catálogo estático.
  const allModels = getAllModels()
  const model =
    allModels.find((m) => {
      if (provider && m.provider !== provider) return false
      return m.id === modelId
    }) || allModels.find((m) => m.id === modelId)

  if (!model) return 8192 // Valor por defecto

  // Para modelos con maxTokens (OpenAI, Anthropic)
  if (typeof model.maxTokens === 'number') {
    return model.maxTokens
  }

  // Para modelos con contextWindow (Groq, RouteLLM)
  if ('contextWindow' in model && model.contextWindow) {
    const contextWindow = model.contextWindow
      .replace(/,/g, '') // Eliminar comas de formato
      .toLowerCase()

    let limit: number

    if (contextWindow.includes('k')) {
      limit = parseFloat(contextWindow) * 1000
    } else if (contextWindow.includes('m')) {
      limit = parseFloat(contextWindow) * 1000000
    } else {
      limit = parseFloat(contextWindow) || 8192
    }

    return Math.round(limit)
  }

  return 8192
}

/**
 * Número máximo de tokens que reservaremos para la respuesta del modelo
 */
export const MAX_RESPONSE_TOKENS = 2048

/**
 * Obtiene el porcentaje de uso de tokens formateado
 *
 * @param usedTokens Número de tokens utilizados
 * @param totalTokens Número total de tokens disponibles
 * @returns Cadena con el formato "XXXX / YYYYY - Usado: ZZ%"
 */
export const getTokenUsageString = (
  usedTokens: number,
  totalTokens: number,
): string => {
  const percentage = Math.round((usedTokens / totalTokens) * 100)
  return `${usedTokens} / ${totalTokens} - Contexto Usado: ${percentage}%`
}

/**
 * Factor de seguridad para evitar llegar al límite exacto (0.9 = usar el 90% del límite)
 */
export const TOKEN_LIMIT_SAFETY_FACTOR = 0.9

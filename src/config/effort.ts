// Niveles de esfuerzo (`--effort low|medium|high|xhigh|max`) disponibles por
// proveedor y modelo (T4, ver odd/tasks/claude-subscription-bridge.md).
// Módulo puro: sin localStorage (ver effortSettings.ts para la persistencia
// de la elección del usuario).

import { getCodexEffortLevels } from '../services/codexBridge/capabilities'
import { MODEL_EFFORT } from './modelEffort.generated'
import { MODEL_LIMITS } from './modelLimits.generated'

// Modelos con reasoning solo por `budget_tokens` (sin valores "effort" en
// models.dev, p. ej. Haiku 4.5 y Sonnet 4.5): igual aceptan `--effort` en
// Claude Code (verificado en vivo, ver Verified facts en el feature doc),
// así que se ofrecen los 3 niveles básicos.
const BUDGET_ONLY_FALLBACK_LEVELS: readonly string[] = ['low', 'medium', 'high']

/**
 * Devuelve los niveles de esfuerzo seleccionables para un modelo.
 * `claudecode` mantiene sus reglas propias (fallback low/medium/high por
 * budget_tokens para modelos Anthropic conocidos sin "effort" explícito, ver
 * abajo). Todo otro proveedor (T17) lee directo de `MODEL_EFFORT[provider]`
 * (groq, openai, anthropic, gemini, opencodezen, opengo); un proveedor sin
 * entrada ahí (routellm, `opencodefree`) siempre devuelve `[]`.
 */
export function getEffortLevels(
  provider: string | undefined,
  modelId: string | undefined,
): string[] {
  if (!provider || !modelId) return []

  if (provider === 'claudecode') {
    const fromModelsDev = MODEL_EFFORT.anthropic?.[modelId]
    if (fromModelsDev && fromModelsDev.length > 0) return [...fromModelsDev]

    // Modelo conocido de Anthropic sin valores "effort" explícitos: fallback
    // a low/medium/high (reasoning por budget_tokens). Un id desconocido (no
    // está ni en MODEL_EFFORT ni en MODEL_LIMITS) no ofrece esfuerzo.
    if (modelId in MODEL_LIMITS.anthropic) {
      return [...BUDGET_ONLY_FALLBACK_LEVELS]
    }

    return []
  }

  // Codex (suscripción de ChatGPT): los niveles salen en vivo de `model/list`
  // (no hay tabla generada de models.dev, ver Verified facts en
  // odd/tasks/openai-subscription-bridge.md), guardados por el fetcher del
  // catálogo en services/codexBridge/capabilities.ts.
  if (provider === 'codexsub') {
    return getCodexEffortLevels(modelId)
  }

  const levels = MODEL_EFFORT[provider]?.[modelId]
  return levels && levels.length > 0 ? [...levels] : []
}

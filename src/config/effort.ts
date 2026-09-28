// Niveles de esfuerzo (`--effort low|medium|high|xhigh|max`) disponibles por
// proveedor y modelo (T4, ver odd/tasks/claude-subscription-bridge.md).
// Módulo puro: sin localStorage (ver effortSettings.ts para la persistencia
// de la elección del usuario).

import { MODEL_EFFORT } from './modelEffort.generated'
import { MODEL_LIMITS } from './modelLimits.generated'

// Modelos con reasoning solo por `budget_tokens` (sin valores "effort" en
// models.dev, p. ej. Haiku 4.5 y Sonnet 4.5): igual aceptan `--effort` en
// Claude Code (verificado en vivo, ver Verified facts en el feature doc),
// así que se ofrecen los 3 niveles básicos.
const BUDGET_ONLY_FALLBACK_LEVELS: readonly string[] = ['low', 'medium', 'high']

/**
 * Devuelve los niveles de esfuerzo seleccionables para un modelo. Por ahora
 * solo `claudecode` los soporta (el resto de proveedores no exponen
 * `--effort`, trabajo futuro): siempre devuelve `[]` para cualquier otro
 * proveedor.
 */
export function getEffortLevels(
  provider: string | undefined,
  modelId: string | undefined,
): string[] {
  if (provider !== 'claudecode' || !modelId) return []

  const fromModelsDev = MODEL_EFFORT.anthropic?.[modelId]
  if (fromModelsDev && fromModelsDev.length > 0) return [...fromModelsDev]

  // Modelo conocido de Anthropic sin valores "effort" explícitos: fallback a
  // low/medium/high (reasoning por budget_tokens). Un id desconocido (no está
  // ni en MODEL_EFFORT ni en MODEL_LIMITS) no ofrece esfuerzo.
  if (modelId in MODEL_LIMITS.anthropic) return [...BUDGET_ONLY_FALLBACK_LEVELS]

  return []
}

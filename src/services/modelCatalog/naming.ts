// Derivación de nombre y desarrollador para modelos desconocidos (IDs que
// llegan de un fetch dinámico pero no existen en el catálogo estático).

function capitalizeSegment(segment: string): string {
  if (!segment) return segment
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

/**
 * Deriva un nombre legible a partir de un ID de modelo.
 * Ej: "deepseek-v4-flash-free" -> "Deepseek V4 Flash Free"
 */
export function deriveNameFromId(id: string): string {
  return id.split(/[-_]/).filter(Boolean).map(capitalizeSegment).join(' ')
}

// Pistas best-effort para inferir el desarrollador a partir de prefijos
// conocidos del ID. Si no coincide ninguna, se usa 'OpenCode' como
// desarrollador por defecto (agregador del modelo).
const DEVELOPER_HINTS: ReadonlyArray<readonly [RegExp, string]> = [
  [/^deepseek/i, 'DeepSeek'],
  [/^glm/i, 'Zhipu AI'],
  [/^kimi/i, 'Moonshot AI'],
  [/^qwen/i, 'Alibaba Cloud'],
  [/^minimax/i, 'MiniMax'],
  [/^mimo/i, 'MiMo AI'],
  [/^nemotron/i, 'NVIDIA'],
  [/^north/i, 'Cohere'],
  [/^hy\d/i, 'Hyperbolic'],
  [/^gpt-|^o\d/i, 'OpenAI'],
  [/^claude/i, 'Anthropic'],
  [/^gemini/i, 'Google'],
  [/^llama|^meta-llama/i, 'Meta'],
  [/^grok/i, 'xAI'],
]

export function inferDeveloper(id: string): string {
  for (const [pattern, developer] of DEVELOPER_HINTS) {
    if (pattern.test(id)) return developer
  }
  return 'OpenCode'
}

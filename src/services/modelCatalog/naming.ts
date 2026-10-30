// Derivación de nombre y desarrollador para modelos desconocidos (IDs que
// llegan de un fetch dinámico pero no existen en el catálogo estático).

function capitalizeSegment(segment: string): string {
  if (!segment) return segment
  return segment.charAt(0).toUpperCase() + segment.slice(1)
}

// Ids de Anthropic: claude-<familia>-<mayor>[-<menor>][-<fecha>].
const CLAUDE_ID = /^claude-([a-z]+)-(\d+)(?:-(\d{1,2}))?(?:-\d{8})?$/

/**
 * Deriva un nombre legible a partir de un ID de modelo.
 * Ej: "deepseek-v4-flash-free" -> "Deepseek V4 Flash Free",
 * "claude-opus-5-5" -> "Claude Opus 5.5"
 */
export function deriveNameFromId(id: string): string {
  const claude = id.match(CLAUDE_ID)
  if (claude) {
    const [, family, major, minor] = claude
    return `Claude ${capitalizeSegment(family)} ${minor ? `${major}.${minor}` : major}`
  }
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

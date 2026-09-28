// Regenera, a partir de models.dev:
// - src/config/visionModels.generated.ts (modalidades de entrada: visión)
// - src/config/modelLimits.generated.ts (contexto y salida máxima)
// - src/config/modelEffort.generated.ts (niveles de esfuerzo por reasoning_options)
// - src/config/claudeModels.generated.ts (catálogo de Claude (suscripción), T4)
// Uso: bun run update:models (alias: bun run update:vision)

const SOURCE_URL = 'https://models.dev/api.json'
const OUTPUT = new URL('../src/config/visionModels.generated.ts', import.meta.url)
const LIMITS_OUTPUT = new URL(
  '../src/config/modelLimits.generated.ts',
  import.meta.url,
)
const EFFORT_OUTPUT = new URL(
  '../src/config/modelEffort.generated.ts',
  import.meta.url,
)
const CLAUDE_MODELS_OUTPUT = new URL(
  '../src/config/claudeModels.generated.ts',
  import.meta.url,
)

// Proveedor de la app -> proveedor en models.dev
const PROVIDER_MAP = {
  groq: 'groq',
  openai: 'openai',
  anthropic: 'anthropic',
  gemini: 'google',
  opencodezen: 'opencode',
  opengo: 'opencode-go',
} as const

interface ReasoningOption {
  type?: string
  values?: string[]
}

interface ModelsDevModel {
  name?: string
  modalities?: { input?: string[] }
  limit?: { context?: number; output?: number }
  reasoning_options?: ReasoningOption[]
}

// Extrae los valores de esfuerzo (`{type: "effort", values: [...]}`) de
// reasoning_options. Si el modelo solo tiene `budget_tokens` o `toggle` (sin
// entrada "effort"), no hay valores de models.dev: el llamador decide el
// fallback (ver src/config/effort.ts para Claude, T4).
function extractEffortValues(model: ModelsDevModel): string[] {
  const effortOption = model.reasoning_options?.find(
    (option) => option.type === 'effort',
  )
  return effortOption?.values ?? []
}

const response = await fetch(SOURCE_URL)
if (!response.ok) throw new Error(`models.dev respondió HTTP ${response.status}`)
const data = (await response.json()) as Record<
  string,
  { models?: Record<string, ModelsDevModel> }
>

const vision: Record<string, string[]> = {}
const textOnly: Record<string, string[]> = {}

for (const [appProvider, devProvider] of Object.entries(PROVIDER_MAP)) {
  const models = data[devProvider]?.models ?? {}
  const ids = Object.keys(models).sort()
  vision[appProvider] = ids.filter((id) =>
    models[id].modalities?.input?.includes('image'),
  )
  textOnly[appProvider] = ids.filter(
    (id) => !models[id].modalities?.input?.includes('image'),
  )
}

const toSet = (ids: string[]) =>
  `new Set<string>(${JSON.stringify(ids, null, 2).replace(/\n/g, '\n  ')})`

const lines = [
  '// Archivo generado por scripts/update-vision-models.ts desde models.dev.',
  '// No editar a mano: correr `bun run update:vision`.',
  `// Generado: ${new Date().toISOString().slice(0, 10)}`,
  '',
  'export const VISION_MODELS: Record<string, Set<string>> = {',
  ...Object.keys(PROVIDER_MAP).map((p) => `  ${p}: ${toSet(vision[p])},`),
  '}',
  '',
  'export const TEXT_ONLY_MODELS: Record<string, Set<string>> = {',
  ...Object.keys(PROVIDER_MAP).map((p) => `  ${p}: ${toSet(textOnly[p])},`),
  '}',
  '',
]

await Bun.write(OUTPUT, lines.join('\n'))

// Límites: [contexto, salida máxima] por proveedor e ID (0 = sin dato).
const limits: Record<string, Record<string, [number, number]>> = {}
for (const [appProvider, devProvider] of Object.entries(PROVIDER_MAP)) {
  const models = data[devProvider]?.models ?? {}
  const entries: Record<string, [number, number]> = {}
  for (const id of Object.keys(models).sort()) {
    const context = models[id].limit?.context
    if (typeof context === 'number' && context > 0) {
      entries[id] = [context, models[id].limit?.output ?? 0]
    }
  }
  limits[appProvider] = entries
}

const limitLines = [
  '// Archivo generado por scripts/update-vision-models.ts desde models.dev.',
  '// No editar a mano: correr `bun run update:models`.',
  `// Generado: ${new Date().toISOString().slice(0, 10)}`,
  '// Formato: [contexto, salida máxima] en tokens (0 = sin dato de salida).',
  '',
  `export const MODEL_LIMITS: Record<string, Record<string, [number, number]>> = ${JSON.stringify(limits, null, 2)}`,
  '',
]
await Bun.write(LIMITS_OUTPUT, limitLines.join('\n'))

// Esfuerzo: valores de `reasoning_options` tipo "effort" por proveedor e ID
// ([] si el modelo solo tiene budget_tokens/toggle; el llamador decide el
// fallback, ver src/config/effort.ts).
const effort: Record<string, Record<string, string[]>> = {}
for (const [appProvider, devProvider] of Object.entries(PROVIDER_MAP)) {
  const models = data[devProvider]?.models ?? {}
  const entries: Record<string, string[]> = {}
  for (const id of Object.keys(models).sort()) {
    entries[id] = extractEffortValues(models[id])
  }
  effort[appProvider] = entries
}

const effortLines = [
  '// Archivo generado por scripts/update-vision-models.ts desde models.dev.',
  '// No editar a mano: correr `bun run update:models`.',
  `// Generado: ${new Date().toISOString().slice(0, 10)}`,
  '// Valores de esfuerzo (reasoning_options tipo "effort"); [] = el modelo',
  '// solo tiene budget_tokens o toggle (ver src/config/effort.ts).',
  '',
  `export const MODEL_EFFORT: Record<string, Record<string, string[]>> = ${JSON.stringify(effort, null, 2)}`,
  '',
]
await Bun.write(EFFORT_OUTPUT, effortLines.join('\n'))

// Catálogo de Claude (suscripción, T4, ver
// odd/tasks/claude-subscription-bridge.md): todos los modelos de chat de
// Anthropic, ids sin fecha preferidos (se descarta el id con fecha cuando
// existe el equivalente sin fecha para el mismo modelo), ordenados por
// familia (sonnet primero: es el modelo por defecto) y, dentro de cada
// familia, del más nuevo al más viejo.
function isDatedId(id: string): boolean {
  return /-\d{8}$/.test(id)
}
function undatedIdFor(id: string): string {
  return id.replace(/-\d{8}$/, '')
}

const CLAUDE_FAMILY_ORDER = ['sonnet', 'opus', 'haiku', 'fable', 'mythos']

function parseClaudeFamily(id: string): { family: string; version: number[] } {
  const match = id.replace(/^claude-/, '').match(/^([a-z]+)-(.+)$/)
  if (!match) return { family: id, version: [] }
  const [, family, rest] = match
  const version = rest.split('-').map((part) => {
    const n = Number.parseFloat(part)
    return Number.isFinite(n) ? n : 0
  })
  return { family, version }
}

function claudeFamilyRank(family: string): number {
  const idx = CLAUDE_FAMILY_ORDER.indexOf(family)
  return idx === -1 ? CLAUDE_FAMILY_ORDER.length : idx
}

function compareVersionsDesc(a: number[], b: number[]): number {
  const len = Math.max(a.length, b.length)
  for (let i = 0; i < len; i++) {
    const diff = (b[i] ?? 0) - (a[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

const anthropicModels = data[PROVIDER_MAP.anthropic]?.models ?? {}
const anthropicIdSet = new Set(Object.keys(anthropicModels))
const dedupedClaudeIds = Object.keys(anthropicModels).filter(
  (id) => !isDatedId(id) || !anthropicIdSet.has(undatedIdFor(id)),
)
const sortedClaudeIds = [...dedupedClaudeIds].sort((idA, idB) => {
  const a = parseClaudeFamily(idA)
  const b = parseClaudeFamily(idB)
  const familyDiff = claudeFamilyRank(a.family) - claudeFamilyRank(b.family)
  return familyDiff !== 0 ? familyDiff : compareVersionsDesc(a.version, b.version)
})

const claudeModelsList = sortedClaudeIds.map((id) => ({
  id,
  name: (anthropicModels[id].name ?? id).replace(/\s*\(latest\)\s*$/i, ''),
}))

const claudeModelsLines = [
  '// Archivo generado por scripts/update-vision-models.ts desde models.dev.',
  '// No editar a mano: correr `bun run update:models`.',
  `// Generado: ${new Date().toISOString().slice(0, 10)}`,
  '',
  `export const CLAUDE_MODELS: Array<{ id: string; name: string }> = ${JSON.stringify(claudeModelsList, null, 2)}`,
  '',
]
await Bun.write(CLAUDE_MODELS_OUTPUT, claudeModelsLines.join('\n'))

for (const p of Object.keys(PROVIDER_MAP)) {
  console.log(
    `${p}: ${vision[p].length} con visión, ${textOnly[p].length} solo texto`,
  )
}
console.log(`claudecode: ${claudeModelsList.length} modelos de Anthropic`)

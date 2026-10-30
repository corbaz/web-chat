// Regenera, a partir de models.dev:
// - src/config/visionModels.generated.ts (modalidades de entrada: visión)
// - src/config/pdfModels.generated.ts (modalidades de entrada: PDF, ver
//   odd/tasks/file-attachments.md)
// - src/config/modelLimits.generated.ts (contexto y salida máxima)
// - src/config/modelEffort.generated.ts (niveles de esfuerzo por reasoning_options)
// - src/config/claudeModels.generated.ts (catálogo de Claude (suscripción), T4)
// - src/config/ollamaCloudModels.generated.ts (modelos cloud GRATIS de Ollama:
//   lista de https://ollama.com/api/tags, probada contra el `ollama serve`
//   local con `ollama signin`; si falla, se conserva el archivo anterior)
// Uso: bun run update:models (alias: bun run update:vision)

import { selectFreeModels } from '../src/services/ollamaCloud/freePlan'
import { toCloudModelId } from '../src/services/ollamaCloud/modelId'
import { MODELS_DEV_URL, selectClaudeModels } from './claude-bridge/models'

const SOURCE_URL = MODELS_DEV_URL
const OUTPUT = new URL('../src/config/visionModels.generated.ts', import.meta.url)
const PDF_OUTPUT = new URL('../src/config/pdfModels.generated.ts', import.meta.url)
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
const OLLAMA_CLOUD_URL = 'https://ollama.com/api/tags'
const OLLAMA_LOCAL_URL = 'http://127.0.0.1:11434'
const OLLAMA_CLOUD_OUTPUT = new URL(
  '../src/config/ollamaCloudModels.generated.ts',
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

// PDF nativo (ver odd/tasks/file-attachments.md): mismo criterio que visión
// pero con `modalities.input.includes('pdf')`.
const pdf: Record<string, string[]> = {}
const pdfTextOnly: Record<string, string[]> = {}

for (const [appProvider, devProvider] of Object.entries(PROVIDER_MAP)) {
  const models = data[devProvider]?.models ?? {}
  const ids = Object.keys(models).sort()
  pdf[appProvider] = ids.filter((id) =>
    models[id].modalities?.input?.includes('pdf'),
  )
  pdfTextOnly[appProvider] = ids.filter(
    (id) => !models[id].modalities?.input?.includes('pdf'),
  )
}

const pdfLines = [
  '// Archivo generado por scripts/update-vision-models.ts desde models.dev.',
  '// No editar a mano: correr `bun run update:models`.',
  `// Generado: ${new Date().toISOString().slice(0, 10)}`,
  '',
  'export const PDF_MODELS: Record<string, Set<string>> = {',
  ...Object.keys(PROVIDER_MAP).map((p) => `  ${p}: ${toSet(pdf[p])},`),
  '}',
  '',
  'export const PDF_TEXT_ONLY_MODELS: Record<string, Set<string>> = {',
  ...Object.keys(PROVIDER_MAP).map((p) => `  ${p}: ${toSet(pdfTextOnly[p])},`),
  '}',
  '',
]

await Bun.write(PDF_OUTPUT, pdfLines.join('\n'))

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
// odd/tasks/claude-subscription-bridge.md): misma selección que usa el bridge
// en vivo (scripts/claude-bridge/models.ts); este archivo queda como respaldo
// hasta que el bridge responde.
const claudeModelsList = selectClaudeModels(
  data[PROVIDER_MAP.anthropic]?.models ?? {},
)

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
    `${p}: ${vision[p].length} con visión, ${textOnly[p].length} solo texto, ${pdf[p].length} con PDF`,
  )
}
console.log(`claudecode: ${claudeModelsList.length} modelos de Anthropic`)

// Catálogo de Ollama Cloud (local): el navegador no puede leer
// ollama.com/api/tags (sin CORS), así que se genera acá, y solo con los
// modelos que el plan gratis responde (ver src/services/ollamaCloud/freePlan.ts).
// Ids en la forma que acepta el servidor local (ver modelId.ts).
try {
  const ollamaResponse = await fetch(OLLAMA_CLOUD_URL)
  if (!ollamaResponse.ok) {
    throw new Error(`ollama.com respondió ${ollamaResponse.status}`)
  }
  const ollamaData = (await ollamaResponse.json()) as {
    models?: Array<{ name?: string }>
  }
  const cloudModels = (ollamaData.models ?? [])
    .map((model) => model.name)
    .filter((name): name is string => Boolean(name))
    .sort((a, b) => a.localeCompare(b))
    .map((name) => ({ id: toCloudModelId(name), name }))
  if (cloudModels.length === 0) throw new Error('lista vacía')
  console.log(
    `ollamacloud: probando ${cloudModels.length} modelos cloud contra ${OLLAMA_LOCAL_URL}...`,
  )
  const { free: ollamaModels, excluded } = await selectFreeModels(
    cloudModels,
    async (id) => {
      const res = await fetch(`${OLLAMA_LOCAL_URL}/v1/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: id,
          messages: [{ role: 'user', content: 'ok' }],
          max_tokens: 1,
        }),
        signal: AbortSignal.timeout(90_000),
      })
      const body = (await res.json().catch(() => ({}))) as {
        error?: { message?: string }
      }
      return { status: res.status, message: body.error?.message ?? '' }
    },
  )
  for (const { id, result } of excluded) {
    console.log(`  fuera: ${id} (${result})`)
  }
  const ollamaLines = [
    '// Archivo generado por scripts/update-vision-models.ts desde ollama.com.',
    '// No editar a mano: correr `bun run update:models`.',
    `// Generado: ${new Date().toISOString().slice(0, 10)}`,
    '',
    `export const OLLAMA_CLOUD_MODELS: Array<{ id: string; name: string }> = ${JSON.stringify(ollamaModels, null, 2)}`,
    '',
  ]
  await Bun.write(OLLAMA_CLOUD_OUTPUT, ollamaLines.join('\n'))
  console.log(
    `ollamacloud: ${ollamaModels.length} modelos gratis de ${cloudModels.length}`,
  )
} catch (error) {
  console.warn(
    `ollamacloud: no se pudo actualizar (${error instanceof Error ? error.message : String(error)}), se conserva la lista anterior`,
  )
}

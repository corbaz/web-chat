// Regenera, a partir de models.dev:
// - src/config/visionModels.generated.ts (modalidades de entrada: visión)
// - src/config/modelLimits.generated.ts (contexto y salida máxima)
// Uso: bun run update:models (alias: bun run update:vision)

const SOURCE_URL = 'https://models.dev/api.json'
const OUTPUT = new URL('../src/config/visionModels.generated.ts', import.meta.url)
const LIMITS_OUTPUT = new URL(
  '../src/config/modelLimits.generated.ts',
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

interface ModelsDevModel {
  modalities?: { input?: string[] }
  limit?: { context?: number; output?: number }
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

for (const p of Object.keys(PROVIDER_MAP)) {
  console.log(
    `${p}: ${vision[p].length} con visión, ${textOnly[p].length} solo texto`,
  )
}

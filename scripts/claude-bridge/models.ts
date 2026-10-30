// Catálogo de Claude (suscripción) desde models.dev. Lo usan el bridge
// (`GET /models`, en vivo con caché) y scripts/update-vision-models.ts (lista
// estática de respaldo en src/config/claudeModels.generated.ts): solo el
// modelo más nuevo de cada familia de Anthropic (pedido del usuario
// 2026-10-29: "siempre latest"), ordenados por familia (sonnet primero). Se
// prefiere el id sin fecha cuando existe el equivalente con fecha.

export const MODELS_DEV_URL = 'https://models.dev/api.json'

export interface ClaudeModelInfo {
  id: string
  name: string
}

function isDatedId(id: string): boolean {
  return /-\d{8}$/.test(id)
}

function undatedIdFor(id: string): string {
  return id.replace(/-\d{8}$/, '')
}

const CLAUDE_FAMILY_ORDER = ['sonnet', 'opus', 'haiku', 'fable', 'mythos']

function parseClaudeFamily(id: string): { family: string; version: number[] } {
  // La fecha (-20250514) no es parte de la versión.
  const match = undatedIdFor(id)
    .replace(/^claude-/, '')
    .match(/^([a-z]+)-(.+)$/)
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

export function selectClaudeModels(
  anthropicModels: Record<string, { name?: string }>,
): ClaudeModelInfo[] {
  const idSet = new Set(Object.keys(anthropicModels))
  const deduped = Object.keys(anthropicModels).filter(
    (id) => !isDatedId(id) || !idSet.has(undatedIdFor(id)),
  )
  const sorted = [...deduped].sort((idA, idB) => {
    const a = parseClaudeFamily(idA)
    const b = parseClaudeFamily(idB)
    const familyDiff = claudeFamilyRank(a.family) - claudeFamilyRank(b.family)
    return familyDiff !== 0
      ? familyDiff
      : compareVersionsDesc(a.version, b.version)
  })
  const seenFamilies = new Set<string>()
  const latest = sorted.filter((id) => {
    const { family } = parseClaudeFamily(id)
    if (seenFamilies.has(family)) return false
    seenFamilies.add(family)
    return true
  })
  return latest.map((id) => ({
    id,
    name: (anthropicModels[id].name ?? id).replace(/\s*\(latest\)\s*$/i, ''),
  }))
}

interface ModelsDevPayload {
  anthropic?: { models?: Record<string, { name?: string }> }
}

const DEFAULT_TTL_MS = 60 * 60 * 1000

async function fetchModelsDev(): Promise<unknown> {
  const response = await fetch(MODELS_DEV_URL, {
    signal: AbortSignal.timeout(10_000),
  })
  if (!response.ok) throw new Error(`models.dev respondió ${response.status}`)
  return response.json()
}

/**
 * Devuelve una función que baja el catálogo de models.dev y lo cachea
 * `ttlMs`. Si models.dev falla, devuelve la última lista buena; sin lista
 * previa, lanza (la app conserva entonces su catálogo actual).
 */
export function createModelsLoader({
  fetchJson = fetchModelsDev,
  ttlMs = DEFAULT_TTL_MS,
  now = Date.now,
}: {
  fetchJson?: () => Promise<unknown>
  ttlMs?: number
  now?: () => number
} = {}): () => Promise<ClaudeModelInfo[]> {
  let cache: { models: ClaudeModelInfo[]; fetchedAt: number } | null = null
  let inFlight: Promise<ClaudeModelInfo[]> | null = null

  return async () => {
    if (cache && now() - cache.fetchedAt < ttlMs) return cache.models
    if (!inFlight) {
      inFlight = (async () => {
        try {
          const data = (await fetchJson()) as ModelsDevPayload
          const models = selectClaudeModels(data?.anthropic?.models ?? {})
          if (models.length === 0) {
            throw new Error('models.dev no devolvió modelos de Anthropic')
          }
          cache = { models, fetchedAt: now() }
          return models
        } catch (error) {
          if (cache) return cache.models
          throw error
        } finally {
          inFlight = null
        }
      })()
    }
    return inFlight
  }
}

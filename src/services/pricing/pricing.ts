// Precios por modelo (USD por millón de tokens) y costo de un mensaje. Fuente:
// models.dev (`cost` de cada modelo), reducido a los proveedores de la app
// por `compactPricing` (lo usa api/prices.ts en Vercel y el middleware de
// desarrollo en vite.config.ts). Ver odd/tasks/message-cost.md.

/** Precio de un modelo en USD por millón de tokens. */
export interface ModelPrice {
  input: number
  output: number
  /** Precios desde cierto tamaño de contexto (tokens de entrada), de menor a mayor. */
  tiers?: { size: number; input: number; output: number }[]
}

/** Proveedor de models.dev -> id de modelo -> precio. */
export type PricingTable = Record<string, Record<string, ModelPrice>>

/** Proveedores de models.dev que la app necesita (ver PROVIDER_PRICING). */
export const PRICING_SOURCES = [
  'groq',
  'openai',
  'anthropic',
  'google',
  'opencode',
  'opencode-go',
] as const

export type PricingKind = 'api' | 'subscription' | 'free'

// Proveedor de la app -> de dónde sale su precio. Las suscripciones (Claude y
// OpenAI por bridge local) no cobran por mensaje: se muestra lo que habría
// costado por API. OpenCode Free siempre es gratis. RouteLLM no tiene precios
// en models.dev.
const PROVIDER_PRICING: Record<
  string,
  { source?: (typeof PRICING_SOURCES)[number]; kind: PricingKind }
> = {
  groq: { source: 'groq', kind: 'api' },
  openai: { source: 'openai', kind: 'api' },
  anthropic: { source: 'anthropic', kind: 'api' },
  gemini: { source: 'google', kind: 'api' },
  opencodezen: { source: 'opencode', kind: 'api' },
  opengo: { source: 'opencode-go', kind: 'api' },
  opencodefree: { kind: 'free' },
  claudecode: { source: 'anthropic', kind: 'subscription' },
  codexsub: { source: 'openai', kind: 'subscription' },
}

export interface MessageCost {
  /** USD de los tokens de entrada, salida y total. Entrada/salida faltan
   * cuando el origen solo informa el total (costUsd del bridge de Claude). */
  input?: number
  output?: number
  total: number
  kind: PricingKind
}

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0

interface ModelsDevCost {
  input?: unknown
  output?: unknown
  tiers?: unknown
}

function toModelPrice(cost: ModelsDevCost | undefined): ModelPrice | null {
  if (!cost || !isFiniteNumber(cost.input) || !isFiniteNumber(cost.output)) {
    return null
  }
  const price: ModelPrice = { input: cost.input, output: cost.output }
  if (Array.isArray(cost.tiers)) {
    const tiers = cost.tiers
      .map(
        (tier: {
          input?: unknown
          output?: unknown
          tier?: { type?: unknown; size?: unknown }
        }) =>
          tier?.tier?.type === 'context' &&
          isFiniteNumber(tier.tier.size) &&
          isFiniteNumber(tier.input) &&
          isFiniteNumber(tier.output)
            ? { size: tier.tier.size, input: tier.input, output: tier.output }
            : null,
      )
      .filter((tier): tier is NonNullable<typeof tier> => tier !== null)
      .sort((a, b) => a.size - b.size)
    if (tiers.length > 0) price.tiers = tiers
  }
  return price
}

/**
 * Reduce el api.json de models.dev (~5 MB) a los precios de los proveedores
 * que usa la app (unos pocos KB). Ignora modelos sin precio.
 */
export function compactPricing(modelsDev: unknown): PricingTable {
  const table: PricingTable = {}
  if (!modelsDev || typeof modelsDev !== 'object') return table
  const data = modelsDev as Record<
    string,
    { models?: Record<string, { cost?: ModelsDevCost }> }
  >
  for (const source of PRICING_SOURCES) {
    const models = data[source]?.models
    if (!models || typeof models !== 'object') continue
    const prices: Record<string, ModelPrice> = {}
    for (const [modelId, model] of Object.entries(models)) {
      const price = toModelPrice(model?.cost)
      if (price) prices[modelId] = price
    }
    table[source] = prices
  }
  return table
}

/** Precio efectivo según el tamaño de la entrada (tiers de contexto). */
function priceForInput(price: ModelPrice, inputTokens: number): ModelPrice {
  let effective = price
  for (const tier of price.tiers ?? []) {
    if (inputTokens > tier.size) {
      effective = { input: tier.input, output: tier.output }
    }
  }
  return effective
}

/**
 * Costo en USD de un mensaje, o null si no hay precio conocido para ese
 * proveedor/modelo. OpenCode Free: siempre 0.
 */
export function computeMessageCost(
  table: PricingTable | null,
  provider: string,
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): MessageCost | null {
  const pricing = PROVIDER_PRICING[provider]
  if (!pricing) return null
  if (pricing.kind === 'free') {
    return { input: 0, output: 0, total: 0, kind: 'free' }
  }
  const price =
    pricing.source && table ? table[pricing.source]?.[modelId] : undefined
  if (!price) return null
  const effective = priceForInput(price, inputTokens)
  const input = (Math.max(0, inputTokens) * effective.input) / 1_000_000
  const output = (Math.max(0, outputTokens) * effective.output) / 1_000_000
  return { input, output, total: input + output, kind: pricing.kind }
}

/** "US$0.00246": 3 cifras significativas para montos chicos, 2 decimales desde US$1. */
export function formatUsd(amount: number): string {
  if (amount === 0) return 'US$0'
  if (amount >= 1) return `US$${amount.toFixed(2)}`
  return `US$${Number(amount.toPrecision(3))}`
}

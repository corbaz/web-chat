import { describe, expect, test } from 'bun:test'
import { compactPricing, computeMessageCost, formatUsd } from './pricing'

const modelsDev = {
  groq: {
    models: {
      'qwen/qwen3.8-27b': { cost: { input: 0.8, output: 4 } },
      'sin-precio': {},
    },
  },
  openai: {
    models: {
      'gpt-5.6-sol': {
        cost: {
          input: 4,
          output: 20,
          cache_read: 0.4,
          tiers: [
            { input: 8, output: 30, tier: { type: 'context', size: 272000 } },
          ],
        },
      },
    },
  },
  anthropic: {
    models: { 'claude-opus-5-5': { cost: { input: 4, output: 20 } } },
  },
  'otro-proveedor': { models: { x: { cost: { input: 1, output: 1 } } } },
}

describe('compactPricing', () => {
  test('se queda con los proveedores de la app y los modelos con precio', () => {
    const table = compactPricing(modelsDev)
    expect(Object.keys(table).sort()).toEqual(['anthropic', 'groq', 'openai'])
    expect(table.groq).toEqual({
      'qwen/qwen3.8-27b': { input: 0.8, output: 4 },
    })
    expect(table.openai['gpt-5.6-sol']).toEqual({
      input: 4,
      output: 20,
      tiers: [{ size: 272000, input: 8, output: 30 }],
    })
  })

  test('entrada inválida -> tabla vacía', () => {
    expect(compactPricing(null)).toEqual({})
    expect(compactPricing('x')).toEqual({})
  })
})

describe('computeMessageCost', () => {
  const table = compactPricing(modelsDev)

  test('costo de entrada + salida (ejemplo del usuario: 2140 / 188 tokens)', () => {
    const cost = computeMessageCost(
      table,
      'groq',
      'qwen/qwen3.8-27b',
      2140,
      188,
    )
    expect(cost?.kind).toBe('api')
    expect(cost?.input).toBeCloseTo(0.001712, 9)
    expect(cost?.output).toBeCloseTo(0.000752, 9)
    expect(cost?.total).toBeCloseTo(0.002464, 9)
  })

  test('tier de contexto cuando la entrada supera el tamaño', () => {
    const big = computeMessageCost(table, 'openai', 'gpt-5.6-sol', 300000, 1000)
    expect(big?.input).toBeCloseTo(2.4, 9)
    expect(big?.output).toBeCloseTo(0.03, 9)
    const small = computeMessageCost(table, 'openai', 'gpt-5.6-sol', 1000, 1000)
    expect(small?.input).toBeCloseTo(0.004, 9)
  })

  test('suscripciones usan el precio de API y se marcan como suscripción', () => {
    expect(
      computeMessageCost(table, 'claudecode', 'claude-opus-5-5', 1000, 1000)
        ?.kind,
    ).toBe('subscription')
    expect(
      computeMessageCost(table, 'codexsub', 'gpt-5.6-sol', 1000, 0)?.total,
    ).toBeCloseTo(0.004, 9)
  })

  test('OpenCode Free es gratis aunque no haya tabla', () => {
    expect(
      computeMessageCost(null, 'opencodefree', 'big-pickle', 5000, 50),
    ).toEqual({
      input: 0,
      output: 0,
      total: 0,
      kind: 'free',
    })
  })

  test('sin precio conocido -> null', () => {
    expect(computeMessageCost(table, 'groq', 'no-existe', 1, 1)).toBeNull()
    expect(computeMessageCost(table, 'routellm', 'x', 1, 1)).toBeNull()
    expect(
      computeMessageCost(null, 'groq', 'qwen/qwen3.8-27b', 1, 1),
    ).toBeNull()
  })
})

describe('formatUsd', () => {
  test('montos chicos con 3 cifras significativas y grandes con 2 decimales', () => {
    expect(formatUsd(0.002464)).toBe('US$0.00246')
    expect(formatUsd(0.000752)).toBe('US$0.000752')
    expect(formatUsd(2.4301)).toBe('US$2.43')
    expect(formatUsd(0)).toBe('US$0')
  })
})

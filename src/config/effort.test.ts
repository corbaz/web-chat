import { describe, expect, test } from 'bun:test'
import { getEffortLevels } from './effort'

describe('getEffortLevels', () => {
  test('claudecode: modelo con valores "effort" en models.dev devuelve esos niveles', () => {
    expect(getEffortLevels('claudecode', 'claude-opus-4-8')).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ])
  })

  test('claudecode: modelo solo con budget_tokens cae a low/medium/high', () => {
    expect(getEffortLevels('claudecode', 'claude-haiku-4-5')).toEqual([
      'low',
      'medium',
      'high',
    ])
  })

  test('claudecode: modelo con menos niveles (Opus 4.5) respeta los valores reales', () => {
    expect(getEffortLevels('claudecode', 'claude-opus-4-5')).toEqual([
      'low',
      'medium',
      'high',
    ])
  })

  test('claudecode: modelo desconocido no ofrece esfuerzo', () => {
    expect(getEffortLevels('claudecode', 'modelo-inventado')).toEqual([])
  })

  test('sin modelId devuelve []', () => {
    expect(getEffortLevels('claudecode', undefined)).toEqual([])
  })

  test('sin provider devuelve []', () => {
    expect(getEffortLevels(undefined, 'claude-opus-4-8')).toEqual([])
  })
})

// T17 (2026-09-28): todo proveedor con entrada en MODEL_EFFORT (groq, openai,
// anthropic, gemini, opencodezen, opengo) lee sus niveles directo de ahí, sin
// las reglas especiales de claudecode (fallback de budget_tokens).
describe('getEffortLevels (T17: otros proveedores)', () => {
  test('groq lee directo de MODEL_EFFORT.groq', () => {
    expect(getEffortLevels('groq', 'openai/gpt-oss-120b')).toEqual([
      'low',
      'medium',
      'high',
    ])
  })

  test('anthropic (proveedor directo, no claudecode) lee directo de MODEL_EFFORT.anthropic, sin fallback de budget_tokens', () => {
    expect(getEffortLevels('anthropic', 'claude-opus-4-8')).toEqual([
      'low',
      'medium',
      'high',
      'xhigh',
      'max',
    ])
    // claude-haiku-4-5 no tiene valores "effort" en models.dev: a diferencia
    // de claudecode, el proveedor 'anthropic' NO aplica el fallback
    // low/medium/high (ese fallback es solo para el bridge de suscripción).
    expect(getEffortLevels('anthropic', 'claude-haiku-4-5')).toEqual([])
  })

  test('opengo y opencodezen leen de sus propias entradas en MODEL_EFFORT', () => {
    expect(getEffortLevels('opengo', 'glm-5.3-flash')).toEqual([
      'low',
      'high',
      'max',
    ])
    expect(getEffortLevels('opencodezen', 'glm-5.3')).toEqual([
      'low',
      'high',
      'max',
    ])
  })

  test('modelo desconocido para un proveedor con MODEL_EFFORT devuelve []', () => {
    expect(getEffortLevels('groq', 'modelo-inventado')).toEqual([])
  })

  test('proveedor sin entrada en MODEL_EFFORT (routellm, opencodefree) siempre devuelve []', () => {
    expect(getEffortLevels('routellm', 'claude-opus-4-8')).toEqual([])
    expect(getEffortLevels('opencodefree', 'big-pickle')).toEqual([])
  })
})

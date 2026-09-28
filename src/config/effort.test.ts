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

  test('cualquier otro proveedor devuelve [] (trabajo futuro)', () => {
    expect(getEffortLevels('groq', 'openai/gpt-oss-120b')).toEqual([])
    expect(getEffortLevels('anthropic', 'claude-opus-4-8')).toEqual([])
    expect(getEffortLevels(undefined, 'claude-opus-4-8')).toEqual([])
  })

  test('sin modelId devuelve []', () => {
    expect(getEffortLevels('claudecode', undefined)).toEqual([])
  })
})

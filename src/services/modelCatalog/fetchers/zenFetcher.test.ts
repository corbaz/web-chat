import { describe, expect, test } from 'bun:test'
import { parseZenModelIds } from './zenFetcher'

describe('parseZenModelIds', () => {
  test('mantiene modelos de chat, tanto pagos como free', () => {
    const payload = {
      data: [
        { id: 'claude-sonnet-5' },
        { id: 'gpt-5.4-mini' },
        { id: 'gemini-3.5-flash' },
        { id: 'deepseek-v4-flash' },
        { id: 'mimo-v2.5-free' },
        { id: 'big-pickle' },
        { id: 'muse-spark-1.3-contributor-free' },
      ],
    }
    expect(parseZenModelIds(payload)).toEqual([
      'claude-sonnet-5',
      'gpt-5.4-mini',
      'gemini-3.5-flash',
      'deepseek-v4-flash',
      'mimo-v2.5-free',
      'big-pickle',
      'muse-spark-1.3-contributor-free',
    ])
  })

  test('descarta ids sin ruta de chat conocida (jev-*), free o no', () => {
    const payload = {
      data: [{ id: 'jev-1.13' }, { id: 'jev-1.13-free' }, { id: 'kimi-k3' }],
    }
    expect(parseZenModelIds(payload)).toEqual(['kimi-k3'])
  })

  test('devuelve lista vacía para payload inválido', () => {
    expect(parseZenModelIds(null)).toEqual([])
    expect(parseZenModelIds({})).toEqual([])
    expect(parseZenModelIds({ data: 'no-array' })).toEqual([])
  })
})

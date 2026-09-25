import { describe, expect, test } from 'bun:test'
import { parseZenFreeModelIds } from './zenFreeFetcher'

describe('parseZenFreeModelIds', () => {
  test('filtra solo ids que terminan en "-free" o son "big-pickle"', () => {
    const payload = {
      data: [
        { id: 'mimo-v2.5-free' },
        { id: 'deepseek-v4-flash-free' },
        { id: 'big-pickle' },
        { id: 'claude-opus-4-6' }, // modelo pago, no debe pasar el filtro
        { id: 'gpt-5' },
      ],
    }
    expect(parseZenFreeModelIds(payload)).toEqual([
      'mimo-v2.5-free',
      'deepseek-v4-flash-free',
      'big-pickle',
    ])
  })

  test('descarta ids "free" cuya ruta real no es /chat/completions', () => {
    const payload = {
      data: [
        // API de clasificación (jev-*), no de chat: se excluye pese a "-free".
        { id: 'jev-1.13-free' },
        // muse-* habla /zen/v1/responses, no /chat/completions.
        { id: 'muse-spark-1.3-contributor-free' },
        // Sigue pasando: ruta 'chat' real.
        { id: 'north-mini-code-free' },
      ],
    }
    expect(parseZenFreeModelIds(payload)).toEqual(['north-mini-code-free'])
  })

  test('ignora entradas sin id de tipo string', () => {
    const payload = {
      data: [{ id: 123 }, { id: null }, {}, { id: 'north-mini-code-free' }],
    }
    expect(parseZenFreeModelIds(payload)).toEqual(['north-mini-code-free'])
  })

  test('devuelve lista vacía si data no es un array', () => {
    expect(parseZenFreeModelIds({ data: 'no-array' })).toEqual([])
    expect(parseZenFreeModelIds({})).toEqual([])
  })

  test('devuelve lista vacía para payload inválido (null, string, número)', () => {
    expect(parseZenFreeModelIds(null)).toEqual([])
    expect(parseZenFreeModelIds(undefined)).toEqual([])
    expect(parseZenFreeModelIds('not an object')).toEqual([])
    expect(parseZenFreeModelIds(42)).toEqual([])
  })
})

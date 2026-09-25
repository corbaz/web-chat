import { describe, expect, test } from 'bun:test'
import { parseOpenCodeGoModelIds } from './openCodeGoFetcher'

describe('parseOpenCodeGoModelIds', () => {
  test('devuelve todos los ids del payload', () => {
    const payload = {
      object: 'list',
      data: [
        { id: 'minimax-m3', object: 'model' },
        { id: 'kimi-k3', object: 'model' },
        { id: 'glm-5.2', object: 'model' },
      ],
    }
    expect(parseOpenCodeGoModelIds(payload)).toEqual([
      'minimax-m3',
      'kimi-k3',
      'glm-5.2',
    ])
  })

  test('ignora entradas inválidas y payloads sin data', () => {
    expect(
      parseOpenCodeGoModelIds({ data: [null, { id: 7 }, { id: 'glm-5' }] }),
    ).toEqual(['glm-5'])
    expect(parseOpenCodeGoModelIds({})).toEqual([])
    expect(parseOpenCodeGoModelIds(null)).toEqual([])
  })
})

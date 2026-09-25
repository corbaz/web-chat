import { describe, expect, test } from 'bun:test'
import { parseAnthropicModelIds } from './anthropicFetcher'

describe('parseAnthropicModelIds', () => {
  test('devuelve los ids de tipo model, incluidos los fechados', () => {
    const payload = {
      data: [
        {
          type: 'model',
          id: 'claude-opus-4-6',
          display_name: 'Claude Opus 4.6',
        },
        {
          type: 'model',
          id: 'claude-haiku-4-5-20251001',
          display_name: 'Claude Haiku 4.5',
        },
        { type: 'other', id: 'not-a-model' },
      ],
      has_more: false,
    }
    expect(parseAnthropicModelIds(payload)).toEqual([
      'claude-opus-4-6',
      'claude-haiku-4-5-20251001',
    ])
  })

  test('payload de error o inválido devuelve lista vacía', () => {
    expect(
      parseAnthropicModelIds({
        type: 'error',
        error: { type: 'authentication_error' },
      }),
    ).toEqual([])
    expect(parseAnthropicModelIds(null)).toEqual([])
  })
})

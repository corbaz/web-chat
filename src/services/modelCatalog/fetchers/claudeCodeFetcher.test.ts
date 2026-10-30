import { describe, expect, test } from 'bun:test'
import { toClaudeCodeModels } from './claudeCodeFetcher'

describe('toClaudeCodeModels', () => {
  test('pasa los ids completos con su nombre', () => {
    expect(
      toClaudeCodeModels([{ id: 'claude-opus-5-5', name: 'Claude Opus 5.5' }]),
    ).toEqual([{ id: 'claude-opus-5-5', name: 'Claude Opus 5.5' }])
  })

  test('un bridge viejo que devuelve alias sin versión se rechaza (se conserva la lista actual)', () => {
    expect(() =>
      toClaudeCodeModels([
        { id: 'haiku', name: 'Claude Haiku' },
        { id: 'sonnet', name: 'Claude Sonnet' },
      ]),
    ).toThrow('reiniciá el bridge')
  })
})

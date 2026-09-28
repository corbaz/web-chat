import { describe, expect, test } from 'bun:test'
import { CLAUDE_MODELS } from './claudeModels.generated'

describe('CLAUDE_MODELS (generado desde models.dev, T4)', () => {
  test('descarta ids con fecha cuando existe el id sin fecha equivalente', () => {
    const ids = CLAUDE_MODELS.map((m) => m.id)
    expect(ids).not.toContain('claude-haiku-4-5-20251001')
    expect(ids).not.toContain('claude-opus-4-5-20251101')
    expect(ids).not.toContain('claude-sonnet-4-5-20250929')
    expect(ids).toContain('claude-haiku-4-5')
    expect(ids).toContain('claude-opus-4-5')
    expect(ids).toContain('claude-sonnet-4-5')
  })

  test('el modelo por defecto (primero de la lista) es un Sonnet', () => {
    expect(CLAUDE_MODELS[0]?.id).toMatch(/^claude-sonnet-/)
  })

  test('los nombres no tienen el sufijo "(latest)"', () => {
    for (const model of CLAUDE_MODELS) {
      expect(model.name).not.toMatch(/\(latest\)/i)
    }
  })

  test('todos los ids empiezan con "claude-"', () => {
    for (const model of CLAUDE_MODELS) {
      expect(model.id.startsWith('claude-')).toBe(true)
    }
  })
})

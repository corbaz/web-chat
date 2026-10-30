import { describe, expect, test } from 'bun:test'
import { CLAUDE_MODELS } from './claudeModels.generated'

describe('CLAUDE_MODELS (generado desde models.dev, T4)', () => {
  test('un solo modelo por familia (el más nuevo) y sin ids con fecha', () => {
    const families = CLAUDE_MODELS.map((m) => m.id.split('-')[1])
    expect(new Set(families).size).toBe(families.length)
    for (const model of CLAUDE_MODELS) {
      expect(model.id).not.toMatch(/-\d{8}$/)
    }
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

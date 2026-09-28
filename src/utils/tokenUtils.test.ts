import { beforeAll, describe, expect, test } from 'bun:test'

// El store del catálogo lee localStorage al importarse.
beforeAll(() => {
  ;(globalThis as { localStorage?: unknown }).localStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
  }
})

describe('getModelTokenLimit', () => {
  test('usa el contexto real de models.dev', async () => {
    const { getModelTokenLimit } = await import('./tokenUtils')
    expect(getModelTokenLimit('kimi-k3', 'opengo')).toBe(1048576)
    expect(getModelTokenLimit('openai/gpt-oss-120b', 'groq')).toBe(131072)
  })

  test('OpenCode Free usa los límites de los modelos de Zen', async () => {
    const { getModelTokenLimit } = await import('./tokenUtils')
    expect(getModelTokenLimit('big-pickle', 'opencodefree')).toBe(200000)
  })

  test('Claude (suscripción) usa los límites reales de Anthropic', async () => {
    const { getModelTokenLimit } = await import('./tokenUtils')
    expect(getModelTokenLimit('claude-haiku-4-5-20251001', 'claudecode')).toBe(
      200000,
    )
  })

  test('Claude (suscripción) resuelve el alias si no llegó el id real', async () => {
    const { getModelTokenLimit } = await import('./tokenUtils')
    expect(getModelTokenLimit('haiku', 'claudecode')).toBe(200000)
    expect(getModelTokenLimit('sonnet', 'claudecode')).toBe(1000000)
  })

  test('8192 solo para modelos desconocidos', async () => {
    const { getModelTokenLimit } = await import('./tokenUtils')
    expect(getModelTokenLimit('modelo-inventado', 'opengo')).toBe(8192)
  })
})

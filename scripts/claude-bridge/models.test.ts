// Tests del catálogo dinámico de Claude (models.dev) del bridge, sin red.

import { describe, expect, test } from 'bun:test'
import { createModelsLoader, selectClaudeModels } from './models'

describe('selectClaudeModels', () => {
  test('solo el más nuevo de cada familia, sonnet primero', () => {
    const models = selectClaudeModels({
      'claude-haiku-4-5': { name: 'Claude Haiku 4.5 (latest)' },
      'claude-haiku-4-5-20251001': { name: 'Claude Haiku 4.5' },
      'claude-opus-5': { name: 'Claude Opus 5' },
      'claude-opus-5-5': { name: 'Claude Opus 5.5' },
      'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5' },
      'claude-sonnet-4-6': { name: 'Claude Sonnet 4.6' },
      'claude-fable-5-1': {},
      'claude-fable-5': { name: 'Claude Fable 5' },
    })
    expect(models).toEqual([
      { id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' },
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
      { id: 'claude-haiku-4-5', name: 'Claude Haiku 4.5' },
      { id: 'claude-fable-5-1', name: 'claude-fable-5-1' },
    ])
  })

  test('la fecha de un id no cuenta como versión (4-20250514 es la 4, no la más nueva)', () => {
    const models = selectClaudeModels({
      'claude-sonnet-4-20250514': { name: 'Claude Sonnet 4' },
      'claude-sonnet-5-5': { name: 'Claude Sonnet 5.5' },
    })
    expect(models).toEqual([{ id: 'claude-sonnet-5-5', name: 'Claude Sonnet 5.5' }])
  })
})

describe('createModelsLoader', () => {
  const payload = {
    anthropic: { models: { 'claude-opus-5-5': { name: 'Claude Opus 5.5' } } },
  }

  test('baja la lista de models.dev y la cachea durante el TTL', async () => {
    let calls = 0
    let now = 0
    const load = createModelsLoader({
      fetchJson: async () => {
        calls++
        return payload
      },
      ttlMs: 1000,
      now: () => now,
    })
    expect(await load()).toEqual([
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
    ])
    now = 999
    await load()
    expect(calls).toBe(1)
    now = 1000
    await load()
    expect(calls).toBe(2)
  })

  test('si models.dev falla después de un éxito, devuelve la última lista buena', async () => {
    let fail = false
    let now = 0
    const load = createModelsLoader({
      fetchJson: async () => {
        if (fail) throw new Error('sin red')
        return payload
      },
      ttlMs: 1000,
      now: () => now,
    })
    await load()
    fail = true
    now = 5000
    expect(await load()).toEqual([
      { id: 'claude-opus-5-5', name: 'Claude Opus 5.5' },
    ])
  })

  test('sin lista previa, un fallo o una lista vacía lanza error', async () => {
    const failing = createModelsLoader({
      fetchJson: async () => {
        throw new Error('sin red')
      },
    })
    await expect(failing()).rejects.toThrow('sin red')
    const empty = createModelsLoader({ fetchJson: async () => ({}) })
    await expect(empty()).rejects.toThrow()
  })
})

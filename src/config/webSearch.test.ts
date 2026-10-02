import { describe, expect, test } from 'bun:test'
import { supportsWebSearch } from './webSearch'

describe('supportsWebSearch', () => {
  test('Claude por API key: todos los modelos de chat, incluidos los nuevos', () => {
    expect(supportsWebSearch('claude-opus-5-5', 'anthropic')).toBe(true)
    expect(supportsWebSearch('claude-sonnet-5', 'anthropic')).toBe(true)
    expect(supportsWebSearch('claude-haiku-4-5', 'anthropic')).toBe(true)
  })

  test('Gemini por API key: chat sí; imagen, voz, embeddings y otras familias no', () => {
    expect(supportsWebSearch('gemini-3.6-flash', 'gemini')).toBe(true)
    expect(supportsWebSearch('gemini-3.1-pro-preview', 'gemini')).toBe(true)
    expect(supportsWebSearch('gemini-3-pro-image', 'gemini')).toBe(false)
    expect(supportsWebSearch('gemini-2.5-flash-preview-tts', 'gemini')).toBe(
      false,
    )
    expect(supportsWebSearch('gemini-embedding-2', 'gemini')).toBe(false)
    expect(supportsWebSearch('gemini-3.1-flash-live-preview', 'gemini')).toBe(
      false,
    )
    expect(supportsWebSearch('gemma-4-31b-it', 'gemini')).toBe(false)
  })

  test('los puentes de suscripción siempre buscan; OpenCode Free no', () => {
    expect(supportsWebSearch('gpt-5.6-luna', 'codexsub')).toBe(true)
    expect(supportsWebSearch('claude-opus-5-5', 'claudecode')).toBe(true)
    expect(supportsWebSearch('big-pickle', 'opencodefree')).toBe(false)
    expect(supportsWebSearch('gemini-3.6-flash-low', 'geminisub')).toBe(false)
  })
})

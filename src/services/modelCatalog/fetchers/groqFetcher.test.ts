import { describe, expect, test } from 'bun:test'
import { parseGroqModelIds } from './groqFetcher'

describe('parseGroqModelIds', () => {
  test('conserva modelos de chat activos y descarta audio, TTS y guards', () => {
    const payload = {
      object: 'list',
      data: [
        { id: 'openai/gpt-oss-120b', active: true, context_window: 131072 },
        { id: 'qwen/qwen3.8-27b', active: true },
        { id: 'openai/gpt-oss-safeguard-20b', active: true },
        { id: 'whisper-large-v3', active: true },
        { id: 'whisper-large-v3-turbo', active: true },
        { id: 'playai-tts', active: true },
        { id: 'canopylabs/orpheus-v1-english', active: true },
        { id: 'meta-llama/llama-prompt-guard-2-86m', active: true },
        { id: 'meta-llama/llama-guard-4-12b', active: true },
        { id: 'old-model', active: false },
      ],
    }
    expect(parseGroqModelIds(payload)).toEqual([
      'openai/gpt-oss-120b',
      'qwen/qwen3.8-27b',
      'openai/gpt-oss-safeguard-20b',
    ])
  })

  test('sin campo active se asume activo', () => {
    expect(parseGroqModelIds({ data: [{ id: 'qwen/qwen3-32b' }] })).toEqual([
      'qwen/qwen3-32b',
    ])
  })

  test('payload inválido devuelve lista vacía', () => {
    expect(parseGroqModelIds(null)).toEqual([])
    expect(
      parseGroqModelIds({ error: { message: 'Invalid API Key' } }),
    ).toEqual([])
  })
})

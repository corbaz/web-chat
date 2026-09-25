import { describe, expect, test } from 'bun:test'
import { parseOpenAIModelIds } from './openaiFetcher'

const toPayload = (ids: string[]) => ({
  object: 'list',
  data: ids.map((id) => ({ id, object: 'model', owned_by: 'openai' })),
})

describe('parseOpenAIModelIds', () => {
  test('conserva familias de chat gpt-* y o-series', () => {
    const ids = [
      'gpt-5',
      'gpt-5.2',
      'gpt-5.1-codex-max',
      'gpt-4.1-mini',
      'gpt-4o',
      'o3',
      'o4-mini',
      'chatgpt-4o-latest',
    ]
    expect(parseOpenAIModelIds(toPayload(ids))).toEqual(ids)
  })

  test('descarta modelos que no son de chat y snapshots fechados', () => {
    const ids = [
      'text-embedding-3-large',
      'gpt-4o-mini-tts',
      'whisper-1',
      'gpt-4o-transcribe',
      'dall-e-3',
      'gpt-image-1',
      'gpt-4o-audio-preview',
      'gpt-realtime',
      'omni-moderation-latest',
      'gpt-4o-search-preview',
      'computer-use-preview',
      'o3-deep-research',
      'gpt-3.5-turbo-instruct',
      'gpt-3.5-turbo',
      'gpt-4o-2024-05-13',
      'davinci-002',
      'babbage-002',
      'sora-2',
    ]
    expect(parseOpenAIModelIds(toPayload(ids))).toEqual([])
  })

  test('payload inválido devuelve lista vacía', () => {
    expect(parseOpenAIModelIds(null)).toEqual([])
    expect(parseOpenAIModelIds({ error: { code: 'invalid_api_key' } })).toEqual(
      [],
    )
  })
})

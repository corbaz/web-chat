import { describe, expect, test } from 'bun:test'
import { parseGeminiModelIds } from './geminiFetcher'

const chat = ['generateContent', 'countTokens']

describe('parseGeminiModelIds', () => {
  test('conserva Flash / Flash Lite de chat y quita el prefijo models/', () => {
    const payload = {
      models: [
        { name: 'models/gemini-3.5-flash', supportedGenerationMethods: chat },
        {
          name: 'models/gemini-3.1-flash-lite',
          supportedGenerationMethods: chat,
        },
        {
          name: 'models/gemini-flash-latest',
          supportedGenerationMethods: chat,
        },
      ],
    }
    expect(parseGeminiModelIds(payload)).toEqual([
      'gemini-3.5-flash',
      'gemini-3.1-flash-lite',
      'gemini-flash-latest',
    ])
  })

  test('descarta Pro, variantes no-chat, snapshots y generaciones deprecadas', () => {
    const payload = {
      models: [
        { name: 'models/gemini-3.1-pro', supportedGenerationMethods: chat },
        {
          name: 'models/gemini-2.5-flash-image',
          supportedGenerationMethods: chat,
        },
        {
          name: 'models/gemini-2.5-flash-preview-tts',
          supportedGenerationMethods: chat,
        },
        {
          name: 'models/gemini-2.5-flash-native-audio-latest',
          supportedGenerationMethods: ['bidiGenerateContent'],
        },
        {
          name: 'models/gemini-2.5-flash-001',
          supportedGenerationMethods: chat,
        },
        { name: 'models/gemini-2.0-flash', supportedGenerationMethods: chat },
        { name: 'models/gemini-1.5-flash', supportedGenerationMethods: chat },
        {
          name: 'models/gemini-embedding-001',
          supportedGenerationMethods: ['embedContent'],
        },
        { name: 'models/gemma-3-27b-it', supportedGenerationMethods: chat },
        { name: 'models/gemini-3.6-flash' }, // sin métodos declarados
      ],
    }
    expect(parseGeminiModelIds(payload)).toEqual([])
  })

  test('payload inválido devuelve lista vacía', () => {
    expect(parseGeminiModelIds(null)).toEqual([])
    expect(parseGeminiModelIds({ error: { code: 403 } })).toEqual([])
    expect(parseGeminiModelIds({ models: [null, { name: 5 }] })).toEqual([])
  })
})

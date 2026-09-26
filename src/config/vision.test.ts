import { describe, expect, test } from 'bun:test'
import { supportsVision } from './vision'

describe('supportsVision con la lista de models.dev', () => {
  test('Groq: qwen3.8-27b sí, gpt-oss no', () => {
    expect(supportsVision('qwen/qwen3.8-27b', 'groq')).toBe(true)
    expect(supportsVision('openai/gpt-oss-120b', 'groq')).toBe(false)
  })

  test('OpenCode Go: marca los modelos con visión según models.dev', () => {
    expect(supportsVision('kimi-k3', 'opengo')).toBe(true)
    expect(supportsVision('minimax-m3', 'opengo')).toBe(true)
    expect(supportsVision('qwen3.8-flash', 'opengo')).toBe(true)
    expect(supportsVision('grok-4.7', 'opengo')).toBe(true)
    expect(supportsVision('deepseek-v4-flash-vision-exp', 'opengo')).toBe(true)
    expect(supportsVision('glm-5.2', 'opengo')).toBe(false)
    expect(supportsVision('deepseek-v4-pro', 'opengo')).toBe(false)
  })

  test('OpenCode Zen: models.dev manda sobre el prefijo', () => {
    expect(supportsVision('claude-sonnet-5', 'opencodezen')).toBe(true)
    expect(supportsVision('grok-4.7', 'opencodezen')).toBe(true)
    expect(supportsVision('kimi-k3', 'opencodezen')).toBe(true)
    // gpt-* pero solo texto según models.dev
    expect(supportsVision('gpt-5.3-codex-spark', 'opencodezen')).toBe(false)
    expect(supportsVision('big-pickle', 'opencodezen')).toBe(false)
  })

  test('OpenAI, Anthropic y Gemini', () => {
    expect(supportsVision('gpt-4o', 'openai')).toBe(true)
    expect(supportsVision('o3', 'openai')).toBe(true)
    expect(supportsVision('claude-haiku-4-5-20251001', 'anthropic')).toBe(true)
    expect(supportsVision('gemini-3.5-flash', 'gemini')).toBe(true)
  })
})

describe('supportsVision para modelos que models.dev no conoce', () => {
  test('usa la heurística por prefijo', () => {
    expect(supportsVision('gpt-5.9-futuro', 'openai')).toBe(true)
    expect(supportsVision('claude-futuro-9', 'anthropic')).toBe(true)
    expect(supportsVision('gemini-9-flash', 'gemini')).toBe(true)
    expect(supportsVision('modelo-nuevo-vision', 'opengo')).toBe(true)
    expect(supportsVision('modelo-nuevo', 'opengo')).toBe(false)
    expect(supportsVision('modelo-nuevo', 'groq')).toBe(false)
  })

  test('RouteLLM y proveedores desconocidos: false', () => {
    expect(supportsVision('gpt-5', 'routellm')).toBe(false)
    expect(supportsVision('gpt-5', 'desconocido')).toBe(false)
  })

  test('modelId o provider vacíos: false', () => {
    expect(supportsVision('', 'openai')).toBe(false)
    expect(supportsVision('gpt-5', '')).toBe(false)
    expect(supportsVision('gpt-5', undefined)).toBe(false)
  })
})

import { describe, expect, test } from 'bun:test'
import { supportsPdf } from './pdf'

describe('supportsPdf con la lista de models.dev', () => {
  test('OpenAI: gpt-4o y o3 sí, o4-mini no', () => {
    expect(supportsPdf('gpt-4o', 'openai')).toBe(true)
    expect(supportsPdf('o3', 'openai')).toBe(true)
    expect(supportsPdf('o4-mini', 'openai')).toBe(false)
  })

  test('Anthropic: todos los modelos de chat aceptan PDF', () => {
    expect(supportsPdf('claude-sonnet-5', 'anthropic')).toBe(true)
    expect(supportsPdf('claude-opus-4-5', 'anthropic')).toBe(true)
    expect(supportsPdf('claude-haiku-4-5-20251001', 'anthropic')).toBe(true)
  })

  test('Gemini: modelos de texto/imagen sí, TTS/live no', () => {
    expect(supportsPdf('gemini-2.5-flash', 'gemini')).toBe(true)
    expect(supportsPdf('gemini-3.5-flash', 'gemini')).toBe(true)
    expect(supportsPdf('gemini-3.1-flash-tts-preview', 'gemini')).toBe(false)
  })

  test('OpenCode Zen: claude-* y algunos gpt-*/gemini-* sí, otros no', () => {
    expect(supportsPdf('claude-sonnet-5', 'opencodezen')).toBe(true)
    expect(supportsPdf('gpt-5.4', 'opencodezen')).toBe(true)
    expect(supportsPdf('kimi-k3', 'opencodezen')).toBe(false)
    expect(supportsPdf('big-pickle', 'opencodezen')).toBe(false)
  })

  test('OpenCode Go: solo un puñado de modelos', () => {
    expect(supportsPdf('gpt-5.6-luna', 'opengo')).toBe(true)
    expect(supportsPdf('grok-4.7', 'opengo')).toBe(true)
    expect(supportsPdf('kimi-k3', 'opengo')).toBe(false)
  })

  test('Groq: ninguno acepta PDF nativo', () => {
    expect(supportsPdf('openai/gpt-oss-120b', 'groq')).toBe(false)
    expect(supportsPdf('qwen/qwen3.8-27b', 'groq')).toBe(false)
  })
})

describe('supportsPdf para proveedores fuera del catálogo de models.dev', () => {
  test('Claude (suscripción): todos los modelos claude-* aceptan PDF', () => {
    expect(supportsPdf('claude-sonnet-5', 'claudecode')).toBe(true)
    expect(supportsPdf('claude-futuro-9', 'claudecode')).toBe(true)
  })

  test('OpenCode Free: siempre false (usa el fallback de texto)', () => {
    expect(supportsPdf('qwen3.8-flash', 'opencodefree')).toBe(false)
  })

  test('RouteLLM y proveedores desconocidos: false', () => {
    expect(supportsPdf('route-1', 'routellm')).toBe(false)
    expect(supportsPdf('gpt-5', 'desconocido')).toBe(false)
  })

  test('modelId o provider vacíos: false', () => {
    expect(supportsPdf('', 'openai')).toBe(false)
    expect(supportsPdf('gpt-5', '')).toBe(false)
    expect(supportsPdf('gpt-5', undefined)).toBe(false)
  })
})

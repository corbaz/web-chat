import { describe, expect, test } from 'bun:test'
import { supportsVision } from './vision'

describe('supportsVision', () => {
  test('Groq: solo qwen/qwen3.8-27b', () => {
    expect(supportsVision('qwen/qwen3.8-27b', 'groq')).toBe(true)
    expect(supportsVision('openai/gpt-oss-120b', 'groq')).toBe(false)
    expect(supportsVision('llama-3.3-70b-versatile', 'groq')).toBe(false)
  })

  test('OpenAI: gpt-4o*, gpt-4.1*, gpt-5*, o3*, o4*', () => {
    expect(supportsVision('gpt-4o', 'openai')).toBe(true)
    expect(supportsVision('gpt-4o-mini', 'openai')).toBe(true)
    expect(supportsVision('gpt-4.1', 'openai')).toBe(true)
    expect(supportsVision('gpt-4.1-mini', 'openai')).toBe(true)
    expect(supportsVision('gpt-5', 'openai')).toBe(true)
    expect(supportsVision('gpt-5-mini', 'openai')).toBe(true)
    expect(supportsVision('o3', 'openai')).toBe(true)
    expect(supportsVision('o3-mini', 'openai')).toBe(true)
    expect(supportsVision('o4-mini', 'openai')).toBe(true)
    expect(supportsVision('gpt-3.5-turbo', 'openai')).toBe(false)
    expect(supportsVision('gpt-4', 'openai')).toBe(false)
  })

  test('Anthropic: todos los claude-*', () => {
    expect(supportsVision('claude-sonnet-4-6', 'anthropic')).toBe(true)
    expect(supportsVision('claude-haiku-4-5-20251001', 'anthropic')).toBe(true)
    expect(supportsVision('gpt-4o', 'anthropic')).toBe(false)
  })

  test('Gemini: todos los modelos', () => {
    expect(supportsVision('gemini-2.5-flash', 'gemini')).toBe(true)
    expect(supportsVision('gemini-flash-latest', 'gemini')).toBe(true)
    expect(supportsVision('cualquier-modelo', 'gemini')).toBe(true)
  })

  test('OpenCode Zen: claude-*, gpt-*, gemini-*, o ids con vision/omni', () => {
    expect(supportsVision('claude-sonnet-5', 'opencodezen')).toBe(true)
    expect(supportsVision('gpt-5.4-mini', 'opencodezen')).toBe(true)
    expect(supportsVision('gemini-3.5-flash', 'opencodezen')).toBe(true)
    expect(supportsVision('llama-vision-90b', 'opencodezen')).toBe(true)
    expect(supportsVision('gpt-omni-1', 'opencodezen')).toBe(true)
    expect(supportsVision('grok-code-fast-2', 'opencodezen')).toBe(false)
    expect(supportsVision('deepseek-v4-flash', 'opencodezen')).toBe(false)
  })

  test('OpenCode Go: solo ids con vision/omni', () => {
    expect(supportsVision('llama-vision-90b', 'opengo')).toBe(true)
    expect(supportsVision('gpt-omni-1', 'opengo')).toBe(true)
    expect(supportsVision('gpt-6-luna', 'opengo')).toBe(false)
    expect(supportsVision('minimax-m3', 'opengo')).toBe(false)
  })

  test('RouteLLM: ninguno', () => {
    expect(supportsVision('cualquier-modelo', 'routellm')).toBe(false)
  })

  test('modelId o provider vacíos: false', () => {
    expect(supportsVision('', 'openai')).toBe(false)
    expect(supportsVision('gpt-5', '')).toBe(false)
    expect(supportsVision('gpt-5', undefined)).toBe(false)
  })

  test('proveedor desconocido: false', () => {
    expect(supportsVision('gpt-5', 'desconocido')).toBe(false)
  })
})

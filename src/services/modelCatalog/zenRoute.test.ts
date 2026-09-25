import { describe, expect, test } from 'bun:test'
import { zenRouteFor } from './zenRoute'

describe('zenRouteFor', () => {
  test('gpt-*, grok-* y muse-* usan /zen/v1/responses', () => {
    expect(zenRouteFor('gpt-5.4-mini')).toBe('responses')
    expect(zenRouteFor('grok-code-fast-2')).toBe('responses')
    expect(zenRouteFor('muse-spark-1.3-contributor-free')).toBe('responses')
  })

  test('claude-* usa /zen/v1/messages', () => {
    expect(zenRouteFor('claude-sonnet-5')).toBe('messages')
    expect(zenRouteFor('claude-haiku-4-5')).toBe('messages')
  })

  test('qwen* usa /zen/v1/messages salvo la excepción qwen3.8-max', () => {
    expect(zenRouteFor('qwen3.7-max')).toBe('messages')
    expect(zenRouteFor('qwen3-coder')).toBe('messages')
    expect(zenRouteFor('qwen3.8-max')).toBe('chat')
  })

  test('gemini-* usa generateContent', () => {
    expect(zenRouteFor('gemini-3.5-flash')).toBe('gemini')
    expect(zenRouteFor('gemini-3.1-flash-lite')).toBe('gemini')
  })

  test('jev-* se excluye por ser API de clasificación', () => {
    expect(zenRouteFor('jev-1.13-free')).toBeNull()
    expect(zenRouteFor('jev-2.0')).toBeNull()
  })

  test('todo lo demás usa /zen/v1/chat/completions', () => {
    expect(zenRouteFor('deepseek-v4-flash')).toBe('chat')
    expect(zenRouteFor('minimax-m3')).toBe('chat')
    expect(zenRouteFor('glm-5.3')).toBe('chat')
    expect(zenRouteFor('kimi-k3')).toBe('chat')
    expect(zenRouteFor('big-pickle')).toBe('chat')
    expect(zenRouteFor('mimo-v2.5-free')).toBe('chat')
  })
})

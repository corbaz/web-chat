import { beforeEach, describe, expect, test } from 'bun:test'
import { resolveEffort, setStoredEffort } from './effortSettings'

// resolveEffort/getStoredEffort/setStoredEffort tocan localStorage: se
// stubea con un Map en memoria (mismo patrón que tokenUtils.test.ts).
function makeMemoryStorage() {
  const map = new Map<string, string>()
  return {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => {
      map.set(key, value)
    },
    removeItem: (key: string) => {
      map.delete(key)
    },
  }
}

beforeEach(() => {
  ;(globalThis as { localStorage?: unknown }).localStorage = makeMemoryStorage()
})

describe('resolveEffort', () => {
  test('sin nada guardado, cae al nivel más bajo del modelo', () => {
    // claude-opus-4-8: ['low','medium','high','xhigh','max'] (ver effort.test.ts)
    expect(resolveEffort('claudecode', 'claude-opus-4-8')).toBe('low')
  })

  test('con un valor guardado válido para el modelo, lo respeta', () => {
    setStoredEffort('claudecode', 'claude-opus-4-8', 'xhigh')
    expect(resolveEffort('claudecode', 'claude-opus-4-8')).toBe('xhigh')
  })

  test('con un valor guardado que ya no es válido para el modelo, cae al más bajo', () => {
    // "xhigh" no existe para claude-haiku-4-5 (solo low/medium/high, fallback
    // de budget_tokens): debe caer al más bajo en vez de mandar un valor
    // inválido al bridge.
    setStoredEffort('claudecode', 'claude-haiku-4-5', 'xhigh')
    expect(resolveEffort('claudecode', 'claude-haiku-4-5')).toBe('low')
  })

  test('modelo sin niveles devuelve "" (no hay slider que mostrar)', () => {
    expect(resolveEffort('claudecode', 'modelo-inventado')).toBe('')
    expect(resolveEffort('groq', 'openai/gpt-oss-120b')).toBe('')
  })
})

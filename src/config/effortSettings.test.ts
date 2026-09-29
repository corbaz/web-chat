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
  test('sin nada guardado, cae al default del proveedor (T17) cuando es válido para el modelo', () => {
    // claude-opus-4-8: ['low','medium','high','xhigh','max']; default de
    // claudecode es 'medium' (DEFAULT_EFFORT_BY_PROVIDER).
    expect(resolveEffort('claudecode', 'claude-opus-4-8')).toBe('medium')
  })

  test('con un valor guardado válido para el modelo, lo respeta (gana al default)', () => {
    setStoredEffort('claudecode', 'claude-opus-4-8', 'xhigh')
    expect(resolveEffort('claudecode', 'claude-opus-4-8')).toBe('xhigh')
  })

  test('con un valor guardado que ya no es válido para el modelo, cae al default del proveedor', () => {
    // "xhigh" no existe para claude-haiku-4-5 (solo low/medium/high, fallback
    // de budget_tokens), pero 'medium' (default de claudecode) sí.
    setStoredEffort('claudecode', 'claude-haiku-4-5', 'xhigh')
    expect(resolveEffort('claudecode', 'claude-haiku-4-5')).toBe('medium')
  })

  test('sin nada guardado y el default del proveedor no es válido para el modelo, cae al más bajo', () => {
    // groq/qwen3.6-27b: ['none','default'] (ver modelEffort.generated.ts);
    // 'medium' (default de groq) no es uno de esos niveles.
    expect(resolveEffort('groq', 'qwen/qwen3.6-27b')).toBe('none')
  })

  test('proveedor sin default configurado (DEFAULT_EFFORT_BY_PROVIDER) cae directo al más bajo', () => {
    // anthropic (proveedor directo) no tiene entrada en
    // DEFAULT_EFFORT_BY_PROVIDER (solo claudecode/groq/opengo/opencodezen/
    // gemini la tienen).
    expect(resolveEffort('anthropic', 'claude-opus-4-8')).toBe('low')
  })

  test('modelo sin niveles devuelve "" (no hay slider que mostrar)', () => {
    expect(resolveEffort('claudecode', 'modelo-inventado')).toBe('')
    expect(resolveEffort('groq', 'llama-3.3-70b-versatile')).toBe('')
  })
})

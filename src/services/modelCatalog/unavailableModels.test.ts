import { beforeEach, describe, expect, test } from 'bun:test'
import {
  isModelUnavailableMessage,
  readUnavailableModels,
  writeUnavailableModels,
} from './unavailableModels'

class LocalStorageStub {
  private store = new Map<string, string>()
  getItem(key: string) {
    return this.store.get(key) ?? null
  }
  setItem(key: string, value: string) {
    this.store.set(key, value)
  }
  removeItem(key: string) {
    this.store.delete(key)
  }
}

describe('isModelUnavailableMessage', () => {
  test('reconoce los errores de modelo no usable', () => {
    expect(
      isModelUnavailableMessage(
        'The model allam-2-7b is blocked at the project level. Please have a project admin enable this model',
      ),
    ).toBe(true)
    expect(
      isModelUnavailableMessage(
        'The model `llama-3.3-70b-versatile` has been decommissioned and is no longer supported.',
      ),
    ).toBe(true)
    expect(
      isModelUnavailableMessage(
        'The model `llama-4-scout` does not exist or you do not have access to it.',
      ),
    ).toBe(true)
    expect(
      isModelUnavailableMessage(
        'Upstream request failed: Model is unavailable.',
      ),
    ).toBe(true)
  })

  test('no confunde otros errores', () => {
    expect(
      isModelUnavailableMessage('Rate limit reached, try again in 2s'),
    ).toBe(false)
    expect(isModelUnavailableMessage('Invalid API Key')).toBe(false)
    expect(
      isModelUnavailableMessage(
        "Input should be 'function', 'web_search_preview' or 'code_interpreter'",
      ),
    ).toBe(false)
  })
})

describe('read/writeUnavailableModels', () => {
  beforeEach(() => {
    ;(globalThis as { localStorage?: unknown }).localStorage =
      new LocalStorageStub()
  })

  test('persiste y lee los ids por proveedor', () => {
    writeUnavailableModels('groq', new Set(['allam-2-7b']))
    expect([...readUnavailableModels('groq')]).toEqual(['allam-2-7b'])
    expect(readUnavailableModels('opengo').size).toBe(0)
  })

  test('un set vacío borra la entrada', () => {
    writeUnavailableModels('groq', new Set(['allam-2-7b']))
    writeUnavailableModels('groq', new Set())
    expect(readUnavailableModels('groq').size).toBe(0)
  })

  test('datos corruptos devuelven un set vacío', () => {
    localStorage.setItem('modelCatalog:v1:unavailable:groq', '{not json')
    expect(readUnavailableModels('groq').size).toBe(0)
  })
})

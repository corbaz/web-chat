import { beforeEach, describe, expect, test } from 'bun:test'
import { readCatalogCache, writeCatalogCache } from './cache'
import type { CatalogModel } from './types'

// Stub mínimo de localStorage (bun test no trae DOM por defecto).
class LocalStorageStub {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }

  removeItem(key: string): void {
    this.store.delete(key)
  }

  clear(): void {
    this.store.clear()
  }
}

beforeEach(() => {
  ;(globalThis as unknown as { localStorage: LocalStorageStub }).localStorage =
    new LocalStorageStub()
})

const sampleModels: CatalogModel[] = [
  {
    id: 'big-pickle',
    name: 'Big Pickle Free',
    developer: 'Stealth',
    provider: 'opencodezen',
  },
]

describe('readCatalogCache / writeCatalogCache', () => {
  test('devuelve null si no hay nada cacheado', () => {
    expect(readCatalogCache('opencodezen')).toBeNull()
  })

  test('escribe y vuelve a leer los mismos modelos', () => {
    writeCatalogCache('opencodezen', sampleModels)
    const cached = readCatalogCache('opencodezen')
    expect(cached).not.toBeNull()
    expect(cached?.models).toEqual(sampleModels)
    expect(typeof cached?.fetchedAt).toBe('number')
  })

  test('cachés de proveedores distintos no se pisan entre sí', () => {
    writeCatalogCache('opencodezen', sampleModels)
    expect(readCatalogCache('groq')).toBeNull()
  })

  test('JSON corrupto se trata como caché ausente, sin lanzar', () => {
    ;(
      globalThis as unknown as { localStorage: LocalStorageStub }
    ).localStorage.setItem('modelCatalog:v1:opencodezen', '{not valid json')
    expect(readCatalogCache('opencodezen')).toBeNull()
  })

  test('entrada sin campo "models" válido se trata como ausente', () => {
    ;(
      globalThis as unknown as { localStorage: LocalStorageStub }
    ).localStorage.setItem(
      'modelCatalog:v1:opencodezen',
      JSON.stringify({ foo: 'bar' }),
    )
    expect(readCatalogCache('opencodezen')).toBeNull()
  })
})

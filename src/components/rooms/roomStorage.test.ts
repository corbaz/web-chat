import { beforeEach, describe, expect, test } from 'bun:test'
import {
  describeRoomTooltip,
  type RoomsState,
  readRoomsState,
  resolveRoomIndicator,
  writeRoomsState,
} from './roomStorage'

// Stub mínimo de localStorage (bun test no trae DOM por defecto), mismo
// patrón que src/services/modelCatalog/cache.test.ts.
class LocalStorageStub {
  private store = new Map<string, string>()

  getItem(key: string): string | null {
    return this.store.has(key) ? (this.store.get(key) as string) : null
  }

  setItem(key: string, value: string): void {
    this.store.set(key, value)
  }
}

let storage: LocalStorageStub

beforeEach(() => {
  storage = new LocalStorageStub()
})

describe('readRoomsState', () => {
  test('sin nada guardado, arranca con solo la sala 1 activa y abierta', () => {
    const state = readRoomsState(storage)
    expect(state).toEqual({
      active: 1,
      opened: [1],
      rooms: { 1: { provider: '', model: '' } },
    })
  })

  test('migra la sala 1 desde las claves legacy selectedProvider/selectedModel', () => {
    storage.setItem('selectedProvider', 'anthropic')
    storage.setItem('selectedModel', 'claude-opus-5-5')
    const state = readRoomsState(storage)
    expect(state.rooms[1]).toEqual({
      provider: 'anthropic',
      model: 'claude-opus-5-5',
    })
  })

  test('lee y devuelve exactamente lo que se guardó', () => {
    const saved: RoomsState = {
      active: 3,
      opened: [1, 2, 3],
      rooms: {
        1: { provider: 'groq', model: 'model-a' },
        2: { provider: 'anthropic', model: 'model-b', chatId: 'chat_2' },
        3: { provider: 'gemini', model: 'model-c', chatId: 'chat_3' },
      },
    }
    writeRoomsState(saved, storage)
    expect(readRoomsState(storage)).toEqual(saved)
  })

  test('JSON corrupto se trata como ausente, sin lanzar', () => {
    storage.setItem('rooms:v1', '{not valid json')
    expect(readRoomsState(storage)).toEqual({
      active: 1,
      opened: [1],
      rooms: { 1: { provider: '', model: '' } },
    })
  })

  test('forma inesperada (falta rooms) cae al default', () => {
    storage.setItem('rooms:v1', JSON.stringify({ active: 1, opened: [1] }))
    expect(readRoomsState(storage)).toEqual({
      active: 1,
      opened: [1],
      rooms: { 1: { provider: '', model: '' } },
    })
  })

  test('si la sala 1 falta en opened, se agrega igual', () => {
    storage.setItem(
      'rooms:v1',
      JSON.stringify({
        active: 2,
        opened: [2],
        rooms: {
          2: { provider: 'groq', model: 'm' },
        },
      }),
    )
    const state = readRoomsState(storage)
    expect(state.opened).toEqual([1, 2])
    expect(state.active).toBe(2)
  })

  test('si la sala activa guardada ya no está abierta, cae a la primera abierta', () => {
    storage.setItem(
      'rooms:v1',
      JSON.stringify({
        active: 5,
        opened: [1, 2],
        rooms: {
          1: { provider: 'groq', model: 'm' },
          2: { provider: 'groq', model: 'm' },
        },
      }),
    )
    expect(readRoomsState(storage).active).toBe(1)
  })
})

describe('writeRoomsState', () => {
  test('no lanza si el storage no está disponible', () => {
    expect(() =>
      writeRoomsState({ active: 1, opened: [1], rooms: {} }, undefined),
    ).not.toThrow()
  })
})

describe('resolveRoomIndicator', () => {
  test('sin nada activo, no hay indicador', () => {
    expect(resolveRoomIndicator({})).toBe('none')
  })

  test('unread solo, muestra unread', () => {
    expect(resolveRoomIndicator({ unread: true })).toBe('unread')
  })

  test('isLoading tiene prioridad sobre unread', () => {
    expect(resolveRoomIndicator({ isLoading: true, unread: true })).toBe(
      'loading',
    )
  })

  test('permissionPending tiene prioridad sobre todo lo demás', () => {
    expect(
      resolveRoomIndicator({
        permissionPending: true,
        isLoading: true,
        unread: true,
      }),
    ).toBe('permission')
  })
})

describe('describeRoomTooltip', () => {
  test('sala nunca abierta', () => {
    expect(describeRoomTooltip(4, undefined, undefined)).toBe('Sala 4 · vacía')
  })

  test('sala con chat y modelo', () => {
    expect(describeRoomTooltip(2, 'Charla sobre X', 'gemini-3.6-flash')).toBe(
      'Sala 2 · Charla sobre X · gemini-3.6-flash',
    )
  })

  test('sala con chat pero sin modelo conocido', () => {
    expect(describeRoomTooltip(2, 'Charla sobre X', undefined)).toBe(
      'Sala 2 · Charla sobre X',
    )
  })
})

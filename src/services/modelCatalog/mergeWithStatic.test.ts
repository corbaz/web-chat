import { describe, expect, test } from 'bun:test'
import { mergeWithStatic } from './mergeWithStatic'
import type { CatalogModel } from './types'

const staticModels: CatalogModel[] = [
  {
    id: 'mimo-v2.5-free',
    name: 'MiMo V2.5 Free',
    developer: 'MiMo AI',
    provider: 'opencodefree',
    contextWindow: '128000',
  },
  {
    id: 'big-pickle',
    name: 'Big Pickle Free',
    developer: 'Stealth',
    provider: 'opencodefree',
    contextWindow: '128000',
  },
]

describe('mergeWithStatic', () => {
  test('un id conocido conserva toda la metadata estática', () => {
    const result = mergeWithStatic(
      ['mimo-v2.5-free'],
      staticModels,
      'opencodefree',
    )
    expect(result).toEqual([staticModels[0]])
  })

  test('un id desconocido recibe nombre y desarrollador derivados', () => {
    const result = mergeWithStatic(
      ['deepseek-v4-flash-free'],
      staticModels,
      'opencodefree',
    )
    expect(result).toEqual([
      {
        id: 'deepseek-v4-flash-free',
        name: 'Deepseek V4 Flash Free',
        developer: 'DeepSeek',
        provider: 'opencodefree',
      },
    ])
  })

  test('preserva el orden de fetchedIds y mezcla conocidos con desconocidos', () => {
    const result = mergeWithStatic(
      ['nuevo-modelo-free', 'big-pickle'],
      staticModels,
      'opencodefree',
    )
    expect(result.map((m) => m.id)).toEqual(['nuevo-modelo-free', 'big-pickle'])
    expect(result[1]).toEqual(staticModels[1])
  })

  test('lista vacía de ids produce lista vacía', () => {
    expect(mergeWithStatic([], staticModels, 'opencodefree')).toEqual([])
  })
})

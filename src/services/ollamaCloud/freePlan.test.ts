import { describe, expect, test } from 'bun:test'
import { selectFreeModels } from './freePlan'

const models = [
  { id: 'gemma4:31b-cloud', name: 'gemma4:31b' },
  { id: 'kimi-k3:cloud', name: 'kimi-k3' },
  { id: 'old:cloud', name: 'old' },
  { id: 'flaky:cloud', name: 'flaky' },
]

describe('selectFreeModels', () => {
  test('conserva solo los que responden 200; 402 (pago) y 410 (retirado) quedan afuera', async () => {
    const replies: Record<string, { status: number; message: string }> = {
      'gemma4:31b-cloud': { status: 200, message: '' },
      'kimi-k3:cloud': {
        status: 402,
        message: 'this model is not included in your free usage',
      },
      'old:cloud': { status: 410, message: 'old was retired on July 31, 2026' },
      'flaky:cloud': { status: 200, message: '' },
    }
    const result = await selectFreeModels(models, async (id) => replies[id])
    expect(result.free.map((m) => m.id)).toEqual([
      'gemma4:31b-cloud',
      'flaky:cloud',
    ])
    expect(result.excluded).toEqual([
      { id: 'kimi-k3:cloud', result: 'quota' },
      { id: 'old:cloud', result: 'unavailable' },
    ])
  })

  test('un resultado dudoso (429, red) se reintenta una vez antes de descartarlo', async () => {
    let calls = 0
    const result = await selectFreeModels([models[3]], async () => {
      calls++
      return calls === 1
        ? { status: 429, message: 'rate limited' }
        : { status: 200, message: '' }
    })
    expect(calls).toBe(2)
    expect(result.free.map((m) => m.id)).toEqual(['flaky:cloud'])
  })

  test('si ninguno responde (servidor apagado) lanza para conservar la lista anterior', async () => {
    await expect(
      selectFreeModels(models, async () => {
        throw new Error('ECONNREFUSED')
      }),
    ).rejects.toThrow()
  })
})

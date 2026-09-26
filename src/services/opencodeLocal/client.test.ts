// Tests del cliente de OpenCode Free con fetch mockeado (sin red real).

import { afterEach, describe, expect, test } from 'bun:test'
import {
  checkServer,
  createSession,
  health,
  isFreeModelId,
  listFreeModels,
  sendMessage,
} from './client'

const originalFetch = global.fetch

afterEach(() => {
  global.fetch = originalFetch
})

const jsonResponse = (data: unknown, status = 200): Response =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

describe('isFreeModelId', () => {
  test('acepta ids que terminan en -free y big-pickle', () => {
    expect(isFreeModelId('ling-3.0-flash-fin-free')).toBe(true)
    expect(isFreeModelId('big-pickle')).toBe(true)
  })

  test('rechaza ids pagos y la familia jev-*', () => {
    expect(isFreeModelId('claude-sonnet-5')).toBe(false)
    expect(isFreeModelId('jev-classifier-free')).toBe(false)
  })
})

describe('health', () => {
  test('true cuando el servidor responde healthy:true', async () => {
    global.fetch = (async () =>
      jsonResponse({ healthy: true, version: '1.18.32' })) as typeof fetch
    expect(await health('http://127.0.0.1:4096', 'pw')).toBe(true)
  })

  test('false ante error de red o respuesta no ok', async () => {
    global.fetch = (async () => jsonResponse({}, 401)) as typeof fetch
    expect(await health('http://127.0.0.1:4096', 'wrong')).toBe(false)

    global.fetch = (async () => {
      throw new Error('ECONNREFUSED')
    }) as typeof fetch
    expect(await health('http://127.0.0.1:4096', 'pw')).toBe(false)
  })
})

describe('checkServer', () => {
  test('ok con contraseña correcta', async () => {
    global.fetch = (async () => jsonResponse({ healthy: true })) as typeof fetch
    expect(await checkServer('http://127.0.0.1:4096', 'pw')).toBe('ok')
  })

  test('unauthorized cuando el servidor responde 401', async () => {
    global.fetch = (async () => jsonResponse({}, 401)) as typeof fetch
    expect(await checkServer('http://127.0.0.1:4096', 'mala')).toBe(
      'unauthorized',
    )
  })

  test('unreachable ante error de red o CORS', async () => {
    global.fetch = (async () => {
      throw new TypeError('Failed to fetch')
    }) as typeof fetch
    expect(await checkServer('http://127.0.0.1:4096', 'pw')).toBe('unreachable')
  })
})

describe('listFreeModels', () => {
  test('filtra por provider "opencode" y excluye jev-*', async () => {
    global.fetch = (async () =>
      jsonResponse({
        providers: [
          {
            id: 'opencode',
            models: {
              'ling-3.0-flash-fin-free': {},
              'big-pickle': {},
              'jev-classifier-free': {},
            },
          },
          {
            id: 'anthropic',
            models: { 'claude-sonnet-5': {} },
          },
        ],
      })) as typeof fetch

    const ids = await listFreeModels('http://127.0.0.1:4096', 'pw')
    expect(ids.sort()).toEqual(['big-pickle', 'ling-3.0-flash-fin-free'])
  })

  test('lista vacía si no existe el provider "opencode"', async () => {
    global.fetch = (async () =>
      jsonResponse({
        providers: [{ id: 'anthropic', models: {} }],
      })) as typeof fetch
    expect(await listFreeModels('http://127.0.0.1:4096', 'pw')).toEqual([])
  })
})

describe('createSession', () => {
  test('devuelve el id de la sesión creada', async () => {
    global.fetch = (async (_url, init) => {
      const body = JSON.parse((init as RequestInit).body as string)
      expect(body).toEqual({ title: 'chat_1' })
      return jsonResponse({ id: 'ses_123' })
    }) as typeof fetch

    expect(await createSession('http://127.0.0.1:4096', 'pw', 'chat_1')).toBe(
      'ses_123',
    )
  })
})

describe('sendMessage', () => {
  test('responde texto y tokens sin permisos pendientes', async () => {
    global.fetch = (async (url: string) => {
      if (url.endsWith('/permission')) return jsonResponse([])
      return jsonResponse({
        info: {
          tokens: {
            input: 10,
            output: 5,
            reasoning: 0,
            cache: { read: 0, write: 0 },
          },
        },
        parts: [{ type: 'text', text: 'hola' }],
      })
    }) as typeof fetch

    const result = await sendMessage(
      'http://127.0.0.1:4096',
      'pw',
      's1',
      'ling-3.0-flash-fin-free',
      'Respondé solo con: hola',
      { onPermission: () => 'reject' },
    )

    expect(result.text).toBe('hola')
    expect(result.tokens).toEqual({
      input: 10,
      output: 5,
      reasoning: 0,
      cacheRead: 0,
      cacheWrite: 0,
    })
  })

  test('surge info.error como Error', async () => {
    global.fetch = (async (url: string) => {
      if (url.endsWith('/permission')) return jsonResponse([])
      return jsonResponse({
        info: { error: { name: 'FreeTierError', data: { message: 'nope' } } },
        parts: [],
      })
    }) as typeof fetch

    await expect(
      sendMessage('http://127.0.0.1:4096', 'pw', 's1', 'model', 'hola', {
        onPermission: () => 'reject',
      }),
    ).rejects.toThrow('nope')
  })

  test('sondea /permission, resuelve con onPermission y continúa', async () => {
    let resolveMessage: (value: unknown) => void = () => {}
    const messagePromise = new Promise((resolve) => {
      resolveMessage = resolve
    })
    let permissionListed = false
    let permissionResponded = false
    let respondedWith: string | null = null

    global.fetch = (async (url: string, init?: RequestInit) => {
      if (url.endsWith('/session/s1/message')) {
        return jsonResponse(await messagePromise)
      }
      if (url.endsWith('/permission')) {
        if (!permissionListed) {
          permissionListed = true
          return jsonResponse([
            {
              id: 'p1',
              sessionID: 's1',
              permission: 'bash',
              metadata: { command: 'echo PWNED > pwned.txt' },
            },
          ])
        }
        return jsonResponse([])
      }
      if (url.endsWith('/session/s1/permissions/p1')) {
        permissionResponded = true
        respondedWith = JSON.parse((init?.body as string) ?? '{}').response
        resolveMessage({
          info: { tokens: { input: 1, output: 1 } },
          parts: [{ type: 'text', text: 'listo' }],
        })
        return jsonResponse(true)
      }
      throw new Error(`URL inesperada en el mock: ${url}`)
    }) as typeof fetch

    const result = await sendMessage(
      'http://127.0.0.1:4096',
      'pw',
      's1',
      'model',
      'hola',
      {
        onPermission: async (permission) => {
          expect(permission.id).toBe('p1')
          expect(permission.metadata?.command).toBe('echo PWNED > pwned.txt')
          return 'reject'
        },
      },
    )

    expect(permissionResponded).toBe(true)
    expect(respondedWith).toBe('reject')
    expect(result.text).toBe('listo')
  }, 5000)
})

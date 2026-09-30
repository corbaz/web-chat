import { describe, expect, test } from 'bun:test'
import { classifyProbeError, interpretProbeEvent } from './modelProbe'

const event = (type: string, properties: Record<string, unknown>) =>
  JSON.stringify({ type, properties })

describe('interpretProbeEvent', () => {
  test('detecta el mensaje del asistente y su primera parte', () => {
    const assistant = interpretProbeEvent(
      event('message.updated', {
        info: { sessionID: 'ses_1', id: 'msg_a', role: 'assistant' },
      }),
      'ses_1',
      new Set(),
    )
    expect(assistant).toEqual({ kind: 'assistant-message', messageId: 'msg_a' })

    expect(
      interpretProbeEvent(
        event('message.part.delta', {
          sessionID: 'ses_1',
          messageID: 'msg_a',
          delta: 'o',
        }),
        'ses_1',
        new Set(['msg_a']),
      ),
    ).toEqual({ kind: 'answered' })
  })

  test('la parte de la pregunta del usuario no cuenta como respuesta', () => {
    expect(
      interpretProbeEvent(
        event('message.part.updated', {
          part: { sessionID: 'ses_1', messageID: 'msg_user', type: 'text' },
        }),
        'ses_1',
        new Set(['msg_a']),
      ),
    ).toBeNull()
  })

  test('session.error trae el mensaje del proveedor', () => {
    expect(
      interpretProbeEvent(
        event('session.error', {
          sessionID: 'ses_1',
          error: {
            name: 'APIError',
            data: {
              message: 'Not Found: Cannot find any route matching [POST] x',
            },
          },
        }),
        'ses_1',
        new Set(),
      ),
    ).toEqual({
      kind: 'error',
      message: 'Not Found: Cannot find any route matching [POST] x',
    })
  })

  test('ignora otras sesiones y JSON inválido', () => {
    expect(
      interpretProbeEvent(
        event('session.error', { sessionID: 'ses_2', error: {} }),
        'ses_1',
        new Set(),
      ),
    ).toBeNull()
    expect(interpretProbeEvent('no json', 'ses_1', new Set())).toBeNull()
  })
})

describe('classifyProbeError', () => {
  test('modelo sin ruta: no disponible', () => {
    expect(
      classifyProbeError('Not Found: Cannot find any route matching [POST] x'),
    ).toBe('unavailable')
  })

  test('límite de uso u otros errores: no se sabe (no se oculta)', () => {
    expect(classifyProbeError('429 Too Many Requests')).toBe('unknown')
    expect(classifyProbeError('Rate limit exceeded')).toBe('unknown')
    expect(classifyProbeError('Internal server error')).toBe('unknown')
  })
})

import { describe, expect, test } from 'bun:test'
import { permissionFromEvent, splitSseEvents } from './permissionEvents'

const asked = (sessionID: string) =>
  JSON.stringify({
    type: 'permission.asked',
    properties: {
      id: 'per_1',
      sessionID,
      permission: 'webfetch',
      patterns: ['https://www.clarin.com'],
      metadata: { url: 'https://www.clarin.com', format: 'markdown' },
    },
  })

describe('splitSseEvents', () => {
  test('separa eventos completos y guarda el resto', () => {
    const { events, rest } = splitSseEvents(
      'data: {"a":1}\n\ndata: {"b":2}\n\ndata: {"c"',
    )
    expect(events).toEqual(['{"a":1}', '{"b":2}'])
    expect(rest).toBe('data: {"c"')
  })

  test('acepta CRLF e ignora líneas que no son data', () => {
    const { events } = splitSseEvents('event: x\r\ndata: {"a":1}\r\n\r\n')
    expect(events).toEqual(['{"a":1}'])
  })
})

describe('permissionFromEvent', () => {
  test('arma el permiso pendiente de la sesión', () => {
    expect(permissionFromEvent(asked('ses_1'), 'ses_1')).toEqual({
      id: 'per_1',
      sessionID: 'ses_1',
      permission: 'webfetch',
      patterns: ['https://www.clarin.com'],
      metadata: { url: 'https://www.clarin.com', format: 'markdown' },
    })
  })

  test('ignora otras sesiones, otros eventos y JSON inválido', () => {
    expect(permissionFromEvent(asked('ses_2'), 'ses_1')).toBeNull()
    expect(
      permissionFromEvent(
        '{"type":"permission.replied","properties":{}}',
        'ses_1',
      ),
    ).toBeNull()
    expect(permissionFromEvent('no json', 'ses_1')).toBeNull()
  })
})

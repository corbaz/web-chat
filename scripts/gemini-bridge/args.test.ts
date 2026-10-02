// Tests de los helpers puros del bridge de Gemini (sin Bun.serve ni agy).

import { describe, expect, test } from 'bun:test'
import {
  buildAgyArgv,
  buildFirstMessage,
  buildGeminiInstructions,
  buildSubscriptionEnv,
  buildUserLine,
  isKnownModel,
  isValidModel,
  parseAgyLine,
  parseModelsOutput,
  resultToBody,
  usageDelta,
} from './args'

describe('parseModelsOutput', () => {
  test('salta la línea de progreso y parsea id/nombre', () => {
    const out =
      'Fetching available models...\r\ngemini-3.6-flash-low\tGemini 3.6 Flash (Low)\r\nclaude-sonnet-4-6\tClaude Sonnet 4.6 (Thinking)\r\n'
    expect(parseModelsOutput(out)).toEqual([
      { id: 'gemini-3.6-flash-low', name: 'Gemini 3.6 Flash (Low)' },
      { id: 'claude-sonnet-4-6', name: 'Claude Sonnet 4.6 (Thinking)' },
    ])
  })

  test('salida vacía o sin tabulador da lista vacía', () => {
    expect(parseModelsOutput('')).toEqual([])
    expect(parseModelsOutput('Fetching available models...\n')).toEqual([])
  })
})

describe('buildAgyArgv', () => {
  test('conversación nueva: sin --conversation', () => {
    const argv = buildAgyArgv('gemini-3.6-flash-low')
    expect(argv).toContain('stream-json')
    expect(argv[argv.indexOf('--model') + 1]).toBe('gemini-3.6-flash-low')
    expect(argv).not.toContain('--conversation')
  })

  test('reanudar: agrega --conversation <id>', () => {
    const argv = buildAgyArgv('m', 'abc')
    expect(argv.slice(-2)).toEqual(['--conversation', 'abc'])
  })
})

describe('buildUserLine', () => {
  test('una línea JSON con event=user y message.content', () => {
    const line = buildUserLine('hola\n"mundo"')
    expect(line.endsWith('\n')).toBe(true)
    expect(line.slice(0, -1).includes('\n')).toBe(false)
    expect(JSON.parse(line)).toEqual({
      event: 'user',
      message: { role: 'user', content: 'hola\n"mundo"' },
    })
  })
})

describe('parseAgyLine', () => {
  test('init', () => {
    expect(
      parseAgyLine('{"event":"init","conversation_id":"c1","model":"m"}'),
    ).toEqual({ kind: 'init', conversationId: 'c1' })
  })

  test('result anidado', () => {
    const event = parseAgyLine(
      '{"event":"result","result":{"status":"SUCCESS","response":"ok"}}',
    )
    expect(event).toEqual({
      kind: 'result',
      result: { status: 'SUCCESS', response: 'ok' },
    })
  })

  test('ruido, vacío y JSON inválido caen en other', () => {
    expect(parseAgyLine('').kind).toBe('other')
    expect(parseAgyLine('no es json').kind).toBe('other')
    expect(parseAgyLine('{"event":"step_update"}').kind).toBe('other')
    expect(parseAgyLine('42').kind).toBe('other')
  })
})

describe('instrucciones', () => {
  const now = new Date('2026-10-02T15:00:00Z')

  test('incluyen fecha de Buenos Aires y hora UTC', () => {
    const text = buildGeminiInstructions(now)
    expect(text).toContain('2026-10-02T15:00:00.000Z')
    expect(text).toContain('America/Argentina/Buenos_Aires')
  })

  test('el primer mensaje separa instrucciones y pedido', () => {
    const text = buildFirstMessage('¿Qué hora es?', now)
    expect(text.indexOf('[Instrucciones del sistema')).toBe(0)
    expect(text.endsWith('[Mensaje del usuario]\n¿Qué hora es?')).toBe(true)
  })
})

describe('resultToBody', () => {
  test('éxito: entrada = input + cache_read, salida = output', () => {
    const body = resultToBody(
      {
        status: 'SUCCESS',
        response: ' hola ',
        usage: { input_tokens: 100, cache_read_tokens: 50, output_tokens: 7 },
      },
      'c1',
      'm',
    )
    expect(body).toEqual({
      text: 'hola',
      sessionId: 'c1',
      model: 'm',
      tokens: { input: 150, output: 7 },
      isError: false,
      error: undefined,
    })
  })

  test('usa el delta contra la lectura acumulada anterior', () => {
    const body = resultToBody(
      {
        status: 'SUCCESS',
        usage: { input_tokens: 60, cache_read_tokens: 40, output_tokens: 9 },
      },
      'c1',
      'm',
      { input_tokens: 30, cache_read_tokens: 20, output_tokens: 5 },
    )
    expect(body.tokens).toEqual({ input: 50, output: 4 })
  })

  test('usageDelta nunca da negativos (proceso reiniciado)', () => {
    expect(
      usageDelta({ input_tokens: 100 }, { input_tokens: 10 }).input_tokens,
    ).toBe(0)
  })

  test('sin lectura previa usa el promedio por turno', () => {
    const body = resultToBody(
      {
        status: 'SUCCESS',
        num_turns: 4,
        usage: { input_tokens: 400, cache_read_tokens: 40, output_tokens: 8 },
      },
      'c1',
      'm',
    )
    expect(body.tokens).toEqual({ input: 110, output: 2 })
  })

  test('ERROR con texto no vacío no es error (503 reintentado)', () => {
    const body = resultToBody(
      { status: 'ERROR', response: 'hola', error: 'UNAVAILABLE 503' },
      'c1',
      'm',
    )
    expect(body.isError).toBe(false)
    expect(body.text).toBe('hola')
  })

  test('error: isError con mensaje', () => {
    const body = resultToBody({ status: 'ERROR', error: 'cuota' }, 'c1', 'm')
    expect(body.isError).toBe(true)
    expect(body.error).toBe('cuota')
    expect(body.tokens).toEqual({ input: 0, output: 0 })
  })

  test('error sin mensaje usa uno por defecto', () => {
    expect(resultToBody({ status: 'ERROR' }, 'c', 'm').error).toBeTruthy()
  })
})

describe('validación de modelo', () => {
  test('isValidModel', () => {
    expect(isValidModel('gemini-3.6-flash-low')).toBe(true)
    expect(isValidModel('')).toBe(false)
    expect(isValidModel(3)).toBe(false)
  })

  test('isKnownModel', () => {
    const known = new Set(['a'])
    expect(isKnownModel('a', known)).toBe(true)
    expect(isKnownModel('b', known)).toBe(false)
    expect(isKnownModel('b', new Set())).toBe(true)
  })
})

describe('buildSubscriptionEnv', () => {
  test('quita las API keys y deja el resto', () => {
    const env = buildSubscriptionEnv({
      GEMINI_API_KEY: 'x',
      GOOGLE_API_KEY: 'y',
      PATH: '/bin',
    })
    expect(env).toEqual({ PATH: '/bin' })
  })
})

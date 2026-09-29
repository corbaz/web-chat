// Tests de los helpers puros del bridge de Codex (sin Bun.serve ni red, sin
// spawnear `codex app-server`).

import { describe, expect, test } from 'bun:test'
import {
  buildRequestLine,
  buildServerResponseLine,
  checkBasicAuth,
  type CodexTurn,
  codexApprovalDecision,
  diffTokenUsage,
  extractFinalAgentText,
  isAllowedOrigin,
  isValidEffort,
  isValidImages,
  isValidModel,
  isValidSessionId,
  MAX_BODY_BYTES,
  MAX_BODY_BYTES_WITH_IMAGES,
  parseCodexLine,
  ZERO_TOKEN_USAGE,
} from './args'

const RED_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

describe('isValidModel', () => {
  test('acepta ids de codex (catálogo dinámico, sin patrón fijo)', () => {
    expect(isValidModel('gpt-5.6-sol')).toBe(true)
    expect(isValidModel('gpt-5.6-terra')).toBe(true)
    expect(isValidModel('gpt-5.5')).toBe(true)
  })

  test('rechaza vacío, no-string, o demasiado largo', () => {
    expect(isValidModel('')).toBe(false)
    expect(isValidModel(undefined)).toBe(false)
    expect(isValidModel(123)).toBe(false)
    expect(isValidModel('x'.repeat(129))).toBe(false)
  })
})

describe('isValidEffort', () => {
  test('acepta niveles reportados por model/list (low/medium/high/xhigh/max/ultra)', () => {
    expect(isValidEffort('low')).toBe(true)
    expect(isValidEffort('medium')).toBe(true)
    expect(isValidEffort('xhigh')).toBe(true)
    expect(isValidEffort('ultra')).toBe(true)
  })

  test('rechaza vacío, espacios, o formas inválidas', () => {
    expect(isValidEffort('')).toBe(false)
    expect(isValidEffort('not a level')).toBe(false)
    expect(isValidEffort(undefined)).toBe(false)
    expect(isValidEffort(42)).toBe(false)
  })
})

describe('isValidImages', () => {
  test('acepta un array válido de 1 a 4 imágenes', () => {
    expect(
      isValidImages([{ mimeType: 'image/png', data: RED_PIXEL_PNG_BASE64 }]),
    ).toBe(true)
  })

  test('rechaza vacío, más de 4, o mimetype inválido', () => {
    expect(isValidImages([])).toBe(false)
    expect(
      isValidImages(
        Array(5).fill({ mimeType: 'image/png', data: RED_PIXEL_PNG_BASE64 }),
      ),
    ).toBe(false)
    expect(
      isValidImages([{ mimeType: 'image/svg+xml', data: RED_PIXEL_PNG_BASE64 }]),
    ).toBe(false)
    expect(isValidImages(null)).toBe(false)
  })
})

describe('isValidSessionId', () => {
  test('acepta un UUID (threadId de codex, UUIDv7)', () => {
    expect(isValidSessionId('01a0e8a8-ccc8-7812-8173-7e374e32d0c7')).toBe(true)
  })

  test('rechaza formas inválidas', () => {
    expect(isValidSessionId('not-a-uuid')).toBe(false)
    expect(isValidSessionId(undefined)).toBe(false)
  })
})

describe('checkBasicAuth', () => {
  test('acepta usuario/password correctos', () => {
    const header = `Basic ${btoa('codex:secret')}`
    expect(checkBasicAuth(header, 'codex', 'secret')).toBe(true)
  })

  test('rechaza password incorrecto, header ausente, o mal formado', () => {
    expect(checkBasicAuth(`Basic ${btoa('codex:wrong')}`, 'codex', 'secret')).toBe(
      false,
    )
    expect(checkBasicAuth(null, 'codex', 'secret')).toBe(false)
    expect(checkBasicAuth('Bearer xyz', 'codex', 'secret')).toBe(false)
  })
})

describe('isAllowedOrigin', () => {
  test('acepta un origin de la allowlist', () => {
    expect(
      isAllowedOrigin('https://localhost:5173', ['https://localhost:5173']),
    ).toBe(true)
  })

  test('rechaza un origin fuera de la allowlist o null', () => {
    expect(isAllowedOrigin('https://evil.com', ['https://localhost:5173'])).toBe(
      false,
    )
    expect(isAllowedOrigin(null, ['https://localhost:5173'])).toBe(false)
  })
})

describe('límites de tamaño', () => {
  test('el límite con imágenes es mayor al límite normal', () => {
    expect(MAX_BODY_BYTES_WITH_IMAGES).toBeGreaterThan(MAX_BODY_BYTES)
  })
})

describe('buildRequestLine / buildServerResponseLine', () => {
  test('arma una línea JSON-RPC 2.0 con salto de línea final', () => {
    const line = buildRequestLine(1, 'initialize', { clientInfo: { name: 'x', version: '1' } })
    expect(line.endsWith('\n')).toBe(true)
    const parsed = JSON.parse(line.trimEnd())
    expect(parsed).toEqual({
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: { clientInfo: { name: 'x', version: '1' } },
    })
  })

  test('la respuesta a un pedido del servidor conserva el id del servidor (no el nuestro)', () => {
    const line = buildServerResponseLine(0, { decision: 'accept' })
    const parsed = JSON.parse(line.trimEnd())
    expect(parsed).toEqual({ jsonrpc: '2.0', id: 0, result: { decision: 'accept' } })
  })
})

describe('parseCodexLine', () => {
  test('clasifica una respuesta a un pedido nuestro (clientResponse)', () => {
    const event = parseCodexLine('{"id":2,"result":{"data":[]}}')
    expect(event).toEqual({ kind: 'clientResponse', id: 2, result: { data: [] }, error: undefined })
  })

  test('clasifica un pedido del servidor (serverRequest, verificado en vivo: id numérico propio)', () => {
    const event = parseCodexLine(
      '{"method":"item/commandExecution/requestApproval","id":0,"params":{"itemId":"exec-1"}}',
    )
    expect(event).toEqual({
      kind: 'serverRequest',
      id: 0,
      method: 'item/commandExecution/requestApproval',
      params: { itemId: 'exec-1' },
    })
  })

  test('clasifica una notificación (sin id)', () => {
    const event = parseCodexLine('{"method":"turn/started","params":{"threadId":"t1"}}')
    expect(event).toEqual({ kind: 'notification', method: 'turn/started', params: { threadId: 't1' } })
  })

  test('JSON inválido o vacío cae en other, nunca lanza', () => {
    expect(parseCodexLine('')).toEqual({ kind: 'other' })
    expect(parseCodexLine('not json')).toEqual({ kind: 'other' })
  })
})

describe('codexApprovalDecision', () => {
  test('"allow" -> "accept", "deny" -> "decline" (deja seguir el turno)', () => {
    expect(codexApprovalDecision('allow')).toBe('accept')
    expect(codexApprovalDecision('deny')).toBe('decline')
  })
})

describe('extractFinalAgentText', () => {
  test('concatena los agentMessage con phase final_answer', () => {
    const turn: CodexTurn = {
      id: 't1',
      status: 'completed',
      items: [
        { type: 'reasoning' },
        { type: 'agentMessage', text: 'ok', phase: 'final_answer' },
      ],
    }
    expect(extractFinalAgentText(turn)).toBe('ok')
  })

  test('sin phase final_answer, usa cualquier agentMessage (modelos viejos)', () => {
    const turn: CodexTurn = {
      id: 't1',
      status: 'completed',
      items: [{ type: 'agentMessage', text: 'hola' }],
    }
    expect(extractFinalAgentText(turn)).toBe('hola')
  })

  test('sin items, devuelve vacío', () => {
    expect(extractFinalAgentText({ id: 't1', status: 'completed' })).toBe('')
  })
})

describe('diffTokenUsage', () => {
  test('calcula el delta de tokens de UN turno (no acumulado del hilo)', () => {
    const before = { ...ZERO_TOKEN_USAGE, inputTokens: 38103, outputTokens: 5 }
    const after = { ...ZERO_TOKEN_USAGE, inputTokens: 76246, outputTokens: 90 }
    expect(diffTokenUsage(before, after)).toEqual({ input: 38143, output: 85 })
  })

  test('nunca devuelve negativo (ante una lectura fuera de orden)', () => {
    const before = { ...ZERO_TOKEN_USAGE, inputTokens: 100, outputTokens: 10 }
    const after = { ...ZERO_TOKEN_USAGE, inputTokens: 50, outputTokens: 5 }
    expect(diffTokenUsage(before, after)).toEqual({ input: 0, output: 0 })
  })
})

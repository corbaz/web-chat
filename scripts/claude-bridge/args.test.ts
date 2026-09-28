// Tests de los helpers puros del bridge de Claude (sin Bun.serve ni red).

import { describe, expect, test } from 'bun:test'
import {
  buildAllowResponse,
  buildChatArgv,
  buildDenyResponse,
  buildDynamicSystemPrompt,
  buildStreamChatArgv,
  buildStreamChatStdin,
  CHAT_SYSTEM_PROMPT,
  checkBasicAuth,
  formatBuenosAiresDateTime,
  formatPermissionLog,
  formatUtcIso,
  isAllowedOrigin,
  isValidEffort,
  isValidImages,
  isValidModel,
  isValidSessionId,
  MAX_BODY_BYTES,
  MAX_BODY_BYTES_WITH_IMAGES,
  parseClaudeResult,
  parseStreamChatResult,
  parseStreamLine,
  policyForTool,
} from './args'

// PNG real de 1x1 rojo (RGB), verificado en vivo: Claude respondió "Rojo".
const RED_PIXEL_PNG_BASE64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAIAAACQd1PeAAAADElEQVR4nGP4z8AAAAMBAQDJ/pLvAAAAAElFTkSuQmCC'

describe('isValidModel', () => {
  test('acepta los alias históricos (compatibilidad hacia atrás)', () => {
    expect(isValidModel('haiku')).toBe(true)
    expect(isValidModel('sonnet')).toBe(true)
    expect(isValidModel('opus')).toBe(true)
    expect(isValidModel('fable')).toBe(true)
  })

  test('acepta ids completos de Anthropic (T4)', () => {
    expect(isValidModel('claude-opus-4-5')).toBe(true)
    expect(isValidModel('claude-opus-5-5')).toBe(true)
    expect(isValidModel('claude-sonnet-4-6')).toBe(true)
    expect(isValidModel('claude-haiku-4-5')).toBe(true)
    expect(isValidModel('claude-fable-5-1')).toBe(true)
  })

  test('rechaza valores que no son alias ni empiezan con claude-', () => {
    expect(isValidModel('gpt-4o')).toBe(false)
    expect(isValidModel('Claude-Opus-4-5')).toBe(false) // mayúsculas
    expect(isValidModel('')).toBe(false)
    expect(isValidModel(undefined)).toBe(false)
    expect(isValidModel(123)).toBe(false)
  })
})

describe('isValidEffort', () => {
  test('acepta los 5 niveles', () => {
    expect(isValidEffort('low')).toBe(true)
    expect(isValidEffort('medium')).toBe(true)
    expect(isValidEffort('high')).toBe(true)
    expect(isValidEffort('xhigh')).toBe(true)
    expect(isValidEffort('max')).toBe(true)
  })

  test('rechaza cualquier otro valor', () => {
    expect(isValidEffort('turbo')).toBe(false)
    expect(isValidEffort('')).toBe(false)
    expect(isValidEffort(undefined)).toBe(false)
    expect(isValidEffort(1)).toBe(false)
  })
})

describe('isValidImages', () => {
  test('acepta 1 a 4 imágenes con mime permitido y base64 con forma válida', () => {
    expect(
      isValidImages([{ mimeType: 'image/png', data: RED_PIXEL_PNG_BASE64 }]),
    ).toBe(true)
    expect(
      isValidImages([
        { mimeType: 'image/png', data: RED_PIXEL_PNG_BASE64 },
        { mimeType: 'image/jpeg', data: RED_PIXEL_PNG_BASE64 },
        { mimeType: 'image/webp', data: RED_PIXEL_PNG_BASE64 },
        { mimeType: 'image/gif', data: RED_PIXEL_PNG_BASE64 },
      ]),
    ).toBe(true)
  })

  test('rechaza más de 4 imágenes o un array vacío', () => {
    const image = { mimeType: 'image/png', data: RED_PIXEL_PNG_BASE64 }
    expect(isValidImages([image, image, image, image, image])).toBe(false)
    expect(isValidImages([])).toBe(false)
  })

  test('rechaza un mime type no permitido', () => {
    expect(
      isValidImages([{ mimeType: 'image/svg+xml', data: RED_PIXEL_PNG_BASE64 }]),
    ).toBe(false)
    expect(
      isValidImages([{ mimeType: 'application/pdf', data: RED_PIXEL_PNG_BASE64 }]),
    ).toBe(false)
  })

  test('rechaza datos que no tienen forma de base64', () => {
    expect(
      isValidImages([{ mimeType: 'image/png', data: 'no-es-base64!!' }]),
    ).toBe(false)
    expect(isValidImages([{ mimeType: 'image/png', data: '' }])).toBe(false)
  })

  test('rechaza valores que no son un array de objetos', () => {
    expect(isValidImages(undefined)).toBe(false)
    expect(isValidImages('nope')).toBe(false)
    expect(isValidImages([{ mimeType: 'image/png' }])).toBe(false)
    expect(isValidImages([null])).toBe(false)
  })
})

describe('MAX_BODY_BYTES_WITH_IMAGES', () => {
  test('~16 MB, mayor que el límite normal', () => {
    expect(MAX_BODY_BYTES_WITH_IMAGES).toBe(16 * 1024 * 1024)
    expect(MAX_BODY_BYTES_WITH_IMAGES).toBeGreaterThan(MAX_BODY_BYTES)
  })
})

describe('isValidSessionId', () => {
  test('acepta un UUID v4-like', () => {
    expect(isValidSessionId('550e8400-e29b-41d4-a716-446655440000')).toBe(
      true,
    )
  })

  test('rechaza strings arbitrarios (protege contra inyección de argv)', () => {
    expect(isValidSessionId('; rm -rf /')).toBe(false)
    expect(isValidSessionId('not-a-uuid')).toBe(false)
    expect(isValidSessionId(undefined)).toBe(false)
    expect(isValidSessionId(42)).toBe(false)
  })
})

describe('buildChatArgv', () => {
  test('caso base: sin sesión ni búsqueda web', () => {
    const argv = buildChatArgv({ model: 'haiku', message: 'hola' })
    expect(argv).toEqual([
      '-p',
      'hola',
      '--output-format',
      'json',
      '--model',
      'haiku',
      '--setting-sources',
      '',
      '--strict-mcp-config',
      '--system-prompt',
      CHAT_SYSTEM_PROMPT,
      '--tools',
      '',
    ])
    // Nunca se habilitan herramientas locales.
    expect(argv).not.toContain('Bash')
    expect(argv).not.toContain('Edit')
    expect(argv).not.toContain('Read')
  })

  test('con sessionId agrega --resume', () => {
    const argv = buildChatArgv({
      model: 'sonnet',
      message: 'hola de nuevo',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
    })
    expect(argv).toContain('--resume')
    expect(argv[argv.indexOf('--resume') + 1]).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    )
  })

  test('con webSearch reemplaza --tools "" por WebSearch', () => {
    const argv = buildChatArgv({
      model: 'opus',
      message: 'buscá algo',
      webSearch: true,
    })
    expect(argv).toContain('WebSearch')
    expect(argv).toContain('--allowedTools')
    // No debe quedar el --tools "" vacío además del de WebSearch.
    const toolsIndex = argv.indexOf('--tools')
    expect(argv[toolsIndex + 1]).toBe('WebSearch')
  })

  test('el mensaje viaja como un único argumento (nunca concatenado a shell)', () => {
    const dangerous = 'hola; rm -rf / && echo pwned'
    const argv = buildChatArgv({ model: 'haiku', message: dangerous })
    expect(argv[1]).toBe(dangerous)
    expect(argv.join(' ')).not.toBe(dangerous) // no se colapsó a un string ejecutable
  })

  test('con effort agrega --effort <nivel>', () => {
    const argv = buildChatArgv({
      model: 'claude-sonnet-4-6',
      message: 'hola',
      effort: 'low',
    })
    expect(argv).toContain('--effort')
    expect(argv[argv.indexOf('--effort') + 1]).toBe('low')
  })

  test('sin effort no agrega --effort', () => {
    const argv = buildChatArgv({ model: 'claude-haiku-4-5', message: 'hola' })
    expect(argv).not.toContain('--effort')
  })

  test('acepta un id completo de modelo (T4)', () => {
    const argv = buildChatArgv({
      model: 'claude-opus-4-8',
      message: 'hola',
    })
    expect(argv[argv.indexOf('--model') + 1]).toBe('claude-opus-4-8')
  })
})

describe('buildStreamChatArgv (T5 visión + T7 permisos)', () => {
  test('caso base: permission-prompt-tool stdio + Bash,WebFetch,WebSearch, sin mensaje posicional', () => {
    const argv = buildStreamChatArgv({ model: 'claude-sonnet-4-6' })
    expect(argv).toEqual([
      '-p',
      '--input-format',
      'stream-json',
      '--output-format',
      'stream-json',
      '--verbose',
      '--permission-prompt-tool',
      'stdio',
      '--tools',
      'Bash,WebFetch,WebSearch',
      '--model',
      'claude-sonnet-4-6',
      '--setting-sources',
      '',
      '--strict-mcp-config',
      '--system-prompt',
      CHAT_SYSTEM_PROMPT,
    ])
    // Nunca se habilitan herramientas de archivos, ni siquiera de lectura.
    expect(argv).not.toContain('Edit')
    expect(argv).not.toContain('Write')
    expect(argv).not.toContain('Read')
    expect(argv).not.toContain('NotebookEdit')
  })

  test('con systemPrompt, usa ese en vez de CHAT_SYSTEM_PROMPT (T7, fecha/hora)', () => {
    const argv = buildStreamChatArgv({
      model: 'claude-haiku-4-5',
      systemPrompt: 'Prompt con fecha y hora incluida.',
    })
    expect(argv[argv.indexOf('--system-prompt') + 1]).toBe(
      'Prompt con fecha y hora incluida.',
    )
  })

  test('con sessionId y effort agrega --resume y --effort', () => {
    const argv = buildStreamChatArgv({
      model: 'claude-opus-4-8',
      sessionId: '550e8400-e29b-41d4-a716-446655440000',
      effort: 'high',
    })
    expect(argv).toContain('--effort')
    expect(argv[argv.indexOf('--effort') + 1]).toBe('high')
    expect(argv).toContain('--resume')
    expect(argv[argv.indexOf('--resume') + 1]).toBe(
      '550e8400-e29b-41d4-a716-446655440000',
    )
  })

  test('sin sessionId ni effort, no agrega --resume ni --effort', () => {
    const argv = buildStreamChatArgv({ model: 'claude-haiku-4-5' })
    expect(argv).not.toContain('--resume')
    expect(argv).not.toContain('--effort')
  })
})

describe('buildStreamChatStdin (T5, visión)', () => {
  test('una imagen: content = [imagen, texto], termina en salto de línea', () => {
    const stdin = buildStreamChatStdin({
      message: '¿De qué color es esta imagen?',
      images: [{ mimeType: 'image/png', data: RED_PIXEL_PNG_BASE64 }],
    })

    expect(stdin.endsWith('\n')).toBe(true)
    // Una sola línea (el salto final no cuenta como línea extra).
    expect(stdin.trimEnd().split('\n')).toHaveLength(1)

    const parsed = JSON.parse(stdin)
    expect(parsed).toEqual({
      type: 'user',
      message: {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: RED_PIXEL_PNG_BASE64,
            },
          },
          { type: 'text', text: '¿De qué color es esta imagen?' },
        ],
      },
    })
  })

  test('varias imágenes: se preserva el orden y el texto queda al final', () => {
    const stdin = buildStreamChatStdin({
      message: 'compará estas dos',
      images: [
        { mimeType: 'image/png', data: 'AAA' },
        { mimeType: 'image/jpeg', data: 'BBB' },
      ],
    })
    const parsed = JSON.parse(stdin)
    const content = parsed.message.content
    expect(content).toHaveLength(3)
    expect(content[0].source.data).toBe('AAA')
    expect(content[1].source.data).toBe('BBB')
    expect(content[2]).toEqual({ type: 'text', text: 'compará estas dos' })
  })
})

describe('parseClaudeResult', () => {
  test('caso feliz: extrae texto, sesión, modelo real y tokens', () => {
    const raw = JSON.stringify({
      result: 'Hola Julio',
      is_error: false,
      session_id: 'abc-123',
      usage: { input_tokens: 700, output_tokens: 12 },
      modelUsage: { 'claude-haiku-4-5-20251001': {} },
      total_cost_usd: 0.0021,
    })
    const parsed = parseClaudeResult(raw, 'haiku')
    expect(parsed).toEqual({
      text: 'Hola Julio',
      sessionId: 'abc-123',
      model: 'claude-haiku-4-5-20251001',
      tokens: { input: 700, output: 12 },
      costUsd: 0.0021,
      isError: false,
      error: undefined,
    })
  })

  test('sin modelUsage conserva el alias pedido', () => {
    const raw = JSON.stringify({ result: 'ok', is_error: false })
    const parsed = parseClaudeResult(raw, 'sonnet')
    expect(parsed.model).toBe('sonnet')
  })

  test('is_error true propaga el mensaje de error', () => {
    const raw = JSON.stringify({
      result: 'API_ERROR: algo salió mal',
      is_error: true,
    })
    const parsed = parseClaudeResult(raw, 'haiku')
    expect(parsed.isError).toBe(true)
    expect(parsed.error).toBe('API_ERROR: algo salió mal')
  })

  test('JSON inválido no lanza: devuelve isError con mensaje claro', () => {
    const parsed = parseClaudeResult('esto no es json', 'haiku')
    expect(parsed.isError).toBe(true)
    expect(parsed.text).toBe('')
    expect(parsed.error).toMatch(/JSON inválido/)
  })

  test('modelUsage con el id pedido exacto lo prioriza aunque haya otras claves', () => {
    const raw = JSON.stringify({
      result: 'ok',
      is_error: false,
      modelUsage: {
        'claude-haiku-4-5': {},
        'claude-sonnet-4-6': {},
      },
    })
    const parsed = parseClaudeResult(raw, 'claude-sonnet-4-6')
    expect(parsed.model).toBe('claude-sonnet-4-6')
  })

  test('modelUsage con haiku de fondo + el modelo pedido (id resuelto distinto) descarta el haiku', () => {
    const raw = JSON.stringify({
      result: 'ok',
      is_error: false,
      // El id pedido no está resuelto tal cual (p. ej. vino de un alias
      // viejo); modelUsage trae el haiku interno de guardas + el modelo real.
      modelUsage: {
        'claude-haiku-4-5-20251001': {},
        'claude-sonnet-5': {},
      },
    })
    const parsed = parseClaudeResult(raw, 'sonnet')
    expect(parsed.model).toBe('claude-sonnet-5')
  })

  test('modelUsage de un solo haiku cuando se pidió haiku no lo descarta', () => {
    const raw = JSON.stringify({
      result: 'ok',
      is_error: false,
      modelUsage: { 'claude-haiku-4-5-20251001': {} },
    })
    const parsed = parseClaudeResult(raw, 'haiku')
    expect(parsed.model).toBe('claude-haiku-4-5-20251001')
  })
})

describe('parseStreamChatResult (T5, visión)', () => {
  // Formato real de --output-format stream-json: un JSON por línea, eventos
  // de sistema/thinking/assistant intercalados antes de la línea "result"
  // (verificado en vivo con una imagen real).
  const systemLine = JSON.stringify({
    type: 'system',
    subtype: 'init',
    session_id: 'sess-1',
  })
  const thinkingLine = JSON.stringify({
    type: 'system',
    subtype: 'thinking_tokens',
    estimated_tokens: 50,
  })
  const assistantLine = JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text: 'Rojo' }] },
  })
  const resultLine = (overrides: Record<string, unknown> = {}) =>
    JSON.stringify({
      type: 'result',
      result: 'Rojo',
      is_error: false,
      session_id: 'sess-1',
      usage: { input_tokens: 681, output_tokens: 97 },
      modelUsage: { 'claude-haiku-4-5-20251001': {} },
      total_cost_usd: 0.002129,
      ...overrides,
    })

  test('encuentra la línea "result" e ignora las demás', () => {
    const raw = [systemLine, thinkingLine, assistantLine, resultLine()].join(
      '\n',
    )
    const parsed = parseStreamChatResult(raw, 'haiku')
    expect(parsed).toEqual({
      text: 'Rojo',
      sessionId: 'sess-1',
      model: 'claude-haiku-4-5-20251001',
      tokens: { input: 681, output: 97 },
      costUsd: 0.002129,
      isError: false,
      error: undefined,
    })
  })

  test('ignora líneas vacías y basura no-JSON entre eventos', () => {
    const raw = [
      '',
      systemLine,
      '   ',
      'esto no es json',
      resultLine(),
      '',
    ].join('\n')
    const parsed = parseStreamChatResult(raw, 'sonnet')
    expect(parsed.text).toBe('Rojo')
    expect(parsed.isError).toBe(false)
  })

  test('is_error true en la línea result propaga el mensaje', () => {
    const raw = [
      systemLine,
      resultLine({ result: 'API_ERROR: algo salió mal', is_error: true }),
    ].join('\n')
    const parsed = parseStreamChatResult(raw, 'haiku')
    expect(parsed.isError).toBe(true)
    expect(parsed.error).toBe('API_ERROR: algo salió mal')
  })

  test('sin línea "result" (proceso cortado) devuelve isError con mensaje claro', () => {
    const raw = [systemLine, thinkingLine, assistantLine].join('\n')
    const parsed = parseStreamChatResult(raw, 'haiku')
    expect(parsed.isError).toBe(true)
    expect(parsed.text).toBe('')
    expect(parsed.model).toBe('haiku')
    expect(parsed.error).toMatch(/línea de resultado/)
  })

  test('modelUsage con haiku de fondo descarta el haiku cuando se pidió otro modelo', () => {
    const raw = resultLine({
      modelUsage: {
        'claude-haiku-4-5-20251001': {},
        'claude-sonnet-5': {},
      },
    })
    const parsed = parseStreamChatResult(raw, 'sonnet')
    expect(parsed.model).toBe('claude-sonnet-5')
  })
})

describe('checkBasicAuth', () => {
  const encode = (user: string, pass: string) =>
    `Basic ${btoa(`${user}:${pass}`)}`

  test('acepta usuario y password correctos', () => {
    expect(
      checkBasicAuth(encode('claude', 'secreto'), 'claude', 'secreto'),
    ).toBe(true)
  })

  test('rechaza password incorrecta', () => {
    expect(
      checkBasicAuth(encode('claude', 'mala'), 'claude', 'secreto'),
    ).toBe(false)
  })

  test('rechaza header ausente, vacío o mal formado', () => {
    expect(checkBasicAuth(null, 'claude', 'secreto')).toBe(false)
    expect(checkBasicAuth('', 'claude', 'secreto')).toBe(false)
    expect(checkBasicAuth('Bearer abc', 'claude', 'secreto')).toBe(false)
    expect(checkBasicAuth('Basic %%%not-base64%%%', 'claude', 'secreto')).toBe(
      false,
    )
  })
})

describe('isAllowedOrigin', () => {
  const allowlist = [
    'https://localhost:5173',
    'https://prompting-chat.vercel.app',
  ]

  test('acepta orígenes de la allowlist', () => {
    expect(isAllowedOrigin('https://localhost:5173', allowlist)).toBe(true)
    expect(
      isAllowedOrigin('https://prompting-chat.vercel.app', allowlist),
    ).toBe(true)
  })

  test('rechaza null y orígenes fuera de la allowlist', () => {
    expect(isAllowedOrigin(null, allowlist)).toBe(false)
    expect(isAllowedOrigin('https://evil.example', allowlist)).toBe(false)
  })
})

describe('MAX_BODY_BYTES', () => {
  test('límite de 200 KB', () => {
    expect(MAX_BODY_BYTES).toBe(200 * 1024)
  })
})

describe('policyForTool (T7)', () => {
  test('WebSearch y WebFetch se auto-aprueban sin YOLO', () => {
    expect(policyForTool('WebSearch', false)).toBe('auto-allow')
    expect(policyForTool('WebFetch', false)).toBe('auto-allow')
  })

  test('Bash pregunta al usuario sin YOLO', () => {
    expect(policyForTool('Bash', false)).toBe('ask')
  })

  test('con autoApprove (YOLO), todo se auto-aprueba', () => {
    expect(policyForTool('Bash', true)).toBe('auto-allow')
    expect(policyForTool('WebSearch', true)).toBe('auto-allow')
    expect(policyForTool('WebFetch', true)).toBe('auto-allow')
  })
})

describe('parseStreamLine (T7)', () => {
  test('reconoce un control_request can_use_tool', () => {
    const line = JSON.stringify({
      type: 'control_request',
      request_id: 'req-1',
      request: {
        subtype: 'can_use_tool',
        tool_name: 'Bash',
        input: { command: 'echo hola', description: 'Saluda' },
      },
    })
    expect(parseStreamLine(line)).toEqual({
      kind: 'can_use_tool',
      requestId: 'req-1',
      toolName: 'Bash',
      input: { command: 'echo hola', description: 'Saluda' },
    })
  })

  test('reconoce un control_request de otro subtype', () => {
    const line = JSON.stringify({
      type: 'control_request',
      request_id: 'init-1',
      request: { subtype: 'initialize' },
    })
    expect(parseStreamLine(line)).toEqual({
      kind: 'other_control_request',
      requestId: 'init-1',
      subtype: 'initialize',
    })
  })

  test('reconoce la línea de resultado', () => {
    const line = JSON.stringify({ type: 'result', result: 'ok' })
    expect(parseStreamLine(line)).toEqual({ kind: 'result', raw: line })
  })

  test('reconoce el system init con session_id', () => {
    const line = JSON.stringify({
      type: 'system',
      subtype: 'init',
      session_id: 'sess-abc',
    })
    expect(parseStreamLine(line)).toEqual({
      kind: 'session_init',
      sessionId: 'sess-abc',
    })
  })

  test('líneas vacías, basura no-JSON y eventos sin manejo dan "other"', () => {
    expect(parseStreamLine('')).toEqual({ kind: 'other' })
    expect(parseStreamLine('   ')).toEqual({ kind: 'other' })
    expect(parseStreamLine('esto no es json')).toEqual({ kind: 'other' })
    expect(parseStreamLine(JSON.stringify({ type: 'assistant' }))).toEqual({
      kind: 'other',
    })
    expect(
      parseStreamLine(JSON.stringify({ type: 'system', subtype: 'thinking_tokens' })),
    ).toEqual({ kind: 'other' })
  })

  test('can_use_tool sin input da {} (nunca undefined)', () => {
    const line = JSON.stringify({
      type: 'control_request',
      request_id: 'req-2',
      request: { subtype: 'can_use_tool', tool_name: 'WebFetch' },
    })
    const parsed = parseStreamLine(line)
    expect(parsed.kind).toBe('can_use_tool')
    expect((parsed as { input: unknown }).input).toEqual({})
  })
})

describe('buildAllowResponse / buildDenyResponse (T7)', () => {
  test('allow: behavior allow + updatedInput, termina en salto de línea', () => {
    const line = buildAllowResponse('req-1', { command: 'echo hola' })
    expect(line.endsWith('\n')).toBe(true)
    expect(JSON.parse(line)).toEqual({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: 'req-1',
        response: { behavior: 'allow', updatedInput: { command: 'echo hola' } },
      },
    })
  })

  test('deny: behavior deny + message, termina en salto de línea', () => {
    const line = buildDenyResponse('req-1', 'El usuario denegó este comando.')
    expect(line.endsWith('\n')).toBe(true)
    expect(JSON.parse(line)).toEqual({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: 'req-1',
        response: {
          behavior: 'deny',
          message: 'El usuario denegó este comando.',
        },
      },
    })
  })
})

describe('formatPermissionLog (T7)', () => {
  test('Bash: usa el comando, recorta a 120 caracteres', () => {
    const long = 'x'.repeat(200)
    const line = formatPermissionLog('Bash', { command: long }, 'allow', 'ask')
    expect(line).toContain('Bash -> allow')
    expect(line).not.toContain('[YOLO]')
    expect(line).not.toContain('[auto]')
    expect(line.length).toBeLessThan(200)
  })

  test('WebFetch auto-aprobado: marca [auto]', () => {
    const line = formatPermissionLog(
      'WebFetch',
      { url: 'https://example.com' },
      'allow',
      'auto',
    )
    expect(line).toContain('[auto]')
    expect(line).toContain('https://example.com')
  })

  test('YOLO: marca [YOLO]', () => {
    const line = formatPermissionLog('Bash', { command: 'ls' }, 'allow', 'yolo')
    expect(line).toContain('[YOLO]')
  })

  test('nunca incluye el texto del mensaje (solo lee command/url del input)', () => {
    const line = formatPermissionLog(
      'Bash',
      { command: 'ls', message: 'esto no debería aparecer' },
      'deny',
      'ask',
    )
    expect(line).not.toContain('esto no debería aparecer')
  })
})

describe('fecha/hora del system prompt (T7)', () => {
  // 2026-09-28T15:00:00Z -> Argentina (UTC-3) es 12:00.
  const fixedUtc = new Date('2026-09-28T15:00:00.000Z')

  test('formatUtcIso devuelve el ISO exacto', () => {
    expect(formatUtcIso(fixedUtc)).toBe('2026-09-28T15:00:00.000Z')
  })

  test('formatBuenosAiresDateTime convierte a UTC-3', () => {
    const formatted = formatBuenosAiresDateTime(fixedUtc)
    expect(formatted).toContain('2026')
    expect(formatted).toContain('12:00')
  })

  test('buildDynamicSystemPrompt incluye el prompt base, la fecha y la nota de Bash', () => {
    const prompt = buildDynamicSystemPrompt(fixedUtc)
    expect(prompt).toContain(CHAT_SYSTEM_PROMPT)
    expect(prompt).toContain('12:00')
    expect(prompt).toContain('2026-09-28T15:00:00.000Z')
    expect(prompt.toLowerCase()).toContain('bash')
    expect(prompt.toLowerCase()).toContain('aprueb')
  })

  test('buildDynamicSystemPrompt sin argumento usa la hora actual (no lanza)', () => {
    expect(() => buildDynamicSystemPrompt()).not.toThrow()
  })
})

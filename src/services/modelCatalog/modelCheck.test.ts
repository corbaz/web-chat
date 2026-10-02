import { describe, expect, test } from 'bun:test'
import { capProbePayload, classifyProbeResponse } from './modelCheck'

describe('classifyProbeResponse', () => {
  test('2xx es ok', () => {
    expect(classifyProbeResponse(200, '')).toBe('ok')
  })

  test('una key inválida no dice nada del modelo', () => {
    expect(classifyProbeResponse(401, 'Invalid API Key')).toBe('unknown')
    expect(classifyProbeResponse(400, 'API key not valid')).toBe('unknown')
    expect(classifyProbeResponse(403, 'AuthError')).toBe('unknown')
  })

  test('sin crédito o sin cuota es quota', () => {
    expect(
      classifyProbeResponse(400, 'Your credit balance is too low to access'),
    ).toBe('quota')
    expect(classifyProbeResponse(429, 'You exceeded your current quota')).toBe(
      'quota',
    )
    expect(classifyProbeResponse(402, 'Insufficient account funds')).toBe(
      'quota',
    )
    expect(classifyProbeResponse(400, 'Insufficient balance')).toBe('quota')
  })

  test('404 o modelo no usable es unavailable', () => {
    expect(classifyProbeResponse(404, 'not_found_error: model: x')).toBe(
      'unavailable',
    )
    expect(
      classifyProbeResponse(400, 'The model `x` has been decommissioned'),
    ).toBe('unavailable')
    expect(classifyProbeResponse(403, 'blocked at the project level')).toBe(
      'unavailable',
    )
  })

  test('límite por minuto, 5xx y el resto son unknown', () => {
    expect(classifyProbeResponse(429, 'Rate limit reached, retry in 2s')).toBe(
      'unknown',
    )
    expect(classifyProbeResponse(503, 'Service unavailable')).toBe('unknown')
    expect(classifyProbeResponse(400, 'bad request')).toBe('unknown')
  })
})

describe('capProbePayload', () => {
  test('Chat Completions: max_tokens a 1, sin razonamiento ni herramientas', () => {
    const capped = capProbePayload({
      model: 'm',
      messages: [{ role: 'user', content: 'ok' }],
      max_tokens: 8192,
      temperature: 0.7,
      reasoning_effort: 'high',
      tools: [{ type: 'web_search' }],
    })
    expect(capped).toEqual({
      model: 'm',
      messages: [{ role: 'user', content: 'ok' }],
      max_tokens: 1,
    })
  })

  test('OpenAI: max_completion_tokens al piso indicado y sin service_tier', () => {
    const capped = capProbePayload(
      { model: 'm', max_completion_tokens: 4096, service_tier: 'priority' },
      16,
    )
    expect(capped).toEqual({ model: 'm', max_completion_tokens: 16 })
  })

  test('Responses: max_output_tokens 16 y sin reasoning ni include', () => {
    const capped = capProbePayload({
      model: 'm',
      input: [{ role: 'user', content: 'ok' }],
      reasoning: { effort: 'high' },
      tools: [{ type: 'web_search' }],
      include: ['web_search_call.action.sources'],
    })
    expect(capped).toEqual({
      model: 'm',
      input: [{ role: 'user', content: 'ok' }],
      max_output_tokens: 16,
    })
  })

  test('Anthropic: max_tokens 1 y sin output_config', () => {
    const capped = capProbePayload({
      model: 'm',
      max_tokens: 4096,
      messages: [{ role: 'user', content: 'ok' }],
      output_config: { effort: 'high' },
    })
    expect(capped.max_tokens).toBe(1)
    expect(capped.output_config).toBeUndefined()
  })

  test('Gemini: maxOutputTokens 1 y sin systemInstruction ni tools', () => {
    const capped = capProbePayload({
      contents: [{ role: 'user', parts: [{ text: 'ok' }] }],
      systemInstruction: { parts: [{ text: 'x' }] },
      generationConfig: {
        maxOutputTokens: 8192,
        temperature: 1,
        thinkingConfig: { thinkingLevel: 'high' },
      },
      tools: [{ google_search: {} }],
    })
    expect(capped).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'ok' }] }],
      generationConfig: { maxOutputTokens: 1 },
    })
  })

  test('no modifica el payload original', () => {
    const original = { model: 'm', max_tokens: 100, tools: [] }
    capProbePayload(original)
    expect(original.max_tokens).toBe(100)
    expect(original.tools).toEqual([])
  })
})

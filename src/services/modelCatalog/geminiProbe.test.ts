import { describe, expect, test } from 'bun:test'
import { classifyGeminiProbe } from './geminiProbe'

describe('classifyGeminiProbe', () => {
  test('200: el modelo anda', () => {
    expect(classifyGeminiProbe(200, '')).toBe('ok')
  })

  test('429 con "limit: 0": sin cuota para ese modelo', () => {
    expect(
      classifyGeminiProbe(
        429,
        'Quota exceeded for metric: generativelanguage.googleapis.com/generate_content_free_tier_requests, limit: 0, model: gemini-3.1-pro',
      ),
    ).toBe('quota')
  })

  test('429 común (límite por minuto): no se sabe, no se deshabilita', () => {
    expect(
      classifyGeminiProbe(
        429,
        'Resource has been exhausted (e.g. check quota).',
      ),
    ).toBe('unknown')
  })

  test('404: el modelo no existe para la cuenta', () => {
    expect(classifyGeminiProbe(404, 'models/x is not found')).toBe(
      'unavailable',
    )
  })

  test('key inválida: no se culpa al modelo', () => {
    expect(
      classifyGeminiProbe(
        400,
        'API key not valid. Please pass a valid API key.',
      ),
    ).toBe('unknown')
  })

  test('403 de facturación o permiso: sin crédito', () => {
    expect(
      classifyGeminiProbe(403, 'This model requires billing to be enabled'),
    ).toBe('quota')
  })
})

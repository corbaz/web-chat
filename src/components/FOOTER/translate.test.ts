import { describe, expect, test } from 'bun:test'
import {
  buildImprovePrompt,
  buildTranslateRequest,
  TRANSLATE_LANGUAGES,
} from './translate'

describe('TRANSLATE_LANGUAGES', () => {
  test('ofrece español, inglés americano, inglés británico y portugués de Brasil, en ese orden', () => {
    expect(TRANSLATE_LANGUAGES.map((l) => l.id)).toEqual([
      'es',
      'en-US',
      'en-GB',
      'pt-BR',
    ])
  })
})

describe('buildTranslateRequest (mensaje que se envía al chat)', () => {
  test('pide traducir el texto a la variante elegida y responder solo con la traducción', () => {
    const request = buildTranslateRequest('Hola, ¿cómo estás?', 'en-GB')
    expect(request).toContain('Hola, ¿cómo estás?')
    expect(request).toContain('inglés británico')
    expect(request).toMatch(/solo con la traducción/i)
  })

  test('pide traducir todo (títulos incluidos), sin repetir el original, con el texto delimitado', () => {
    const request = buildTranslateRequest('Línea uno\nLínea dos', 'pt-BR')
    expect(request).toContain('<texto>\nLínea uno\nLínea dos\n</texto>')
    expect(request).toContain('Traducí todas las líneas, incluidos los títulos')
    expect(request).toContain('No incluyas el texto original ni lo repitas')
  })

  test('cada idioma nombra su variante', () => {
    expect(buildTranslateRequest('x', 'en-US')).toContain('inglés americano')
    expect(buildTranslateRequest('x', 'pt-BR')).toContain('portugués de Brasil')
    expect(buildTranslateRequest('x', 'es')).toContain('español')
  })
})

describe('buildImprovePrompt (varita: mejora y deja el texto en el input)', () => {
  test('corrige, formatea en Markdown y redacta en el idioma elegido', () => {
    const prompt = buildImprovePrompt('helo, can yu help me', 'es')
    expect(prompt).toContain('helo, can yu help me')
    expect(prompt).toContain('redactado en español')
    expect(prompt).toMatch(/markdown/i)
    expect(prompt).toMatch(/sin explicaciones/i)
  })

  test('con otro idioma lo redacta en ese idioma', () => {
    expect(buildImprovePrompt('hola', 'pt-BR')).toContain(
      'redactado en portugués de Brasil',
    )
  })
})

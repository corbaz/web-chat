import { describe, expect, test } from 'bun:test'
import { joinPageTexts, joinTextItems } from './pdfText'

describe('joinTextItems', () => {
  test('junta los items de texto con espacios', () => {
    expect(joinTextItems([{ str: 'Hola' }, { str: 'mundo' }])).toBe(
      'Hola mundo',
    )
  })

  test('recorta y colapsa espacios repetidos', () => {
    expect(
      joinTextItems([{ str: '  Hola  ' }, { str: '' }, { str: 'mundo' }]),
    ).toBe('Hola mundo')
  })

  test('ignora items sin `str`', () => {
    expect(joinTextItems([{}, { str: 'A' }])).toBe('A')
  })

  test('array vacío da string vacío', () => {
    expect(joinTextItems([])).toBe('')
  })
})

describe('joinPageTexts', () => {
  test('junta páginas no vacías con doble salto de línea', () => {
    expect(joinPageTexts(['Página 1', 'Página 2'])).toBe('Página 1\n\nPágina 2')
  })

  test('descarta páginas vacías', () => {
    expect(joinPageTexts(['A', '', 'B'])).toBe('A\n\nB')
  })

  test('array vacío da string vacío', () => {
    expect(joinPageTexts([])).toBe('')
  })
})

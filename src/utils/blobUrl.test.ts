import { describe, expect, test } from 'bun:test'
import { base64ToBytes } from './blobUrl'

describe('base64ToBytes', () => {
  test('decodifica un base64 conocido a los bytes esperados', () => {
    // "PERA" en ASCII: 80, 69, 82, 65.
    const bytes = base64ToBytes(btoa('PERA'))
    expect(Array.from(bytes)).toEqual([80, 69, 82, 65])
  })

  test('string vacío da un array vacío', () => {
    expect(base64ToBytes('').length).toBe(0)
  })

  test('redondea viaje completo con btoa/atob para bytes arbitrarios', () => {
    const original = new Uint8Array([0, 1, 2, 250, 255, 128])
    const binary = String.fromCharCode(...original)
    const bytes = base64ToBytes(btoa(binary))
    expect(Array.from(bytes)).toEqual(Array.from(original))
  })
})

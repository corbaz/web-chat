import { describe, expect, test } from 'bun:test'
import {
  checkFrameable,
  isFrameableHeaders,
  toPublicHttpUrl,
} from './frameCheck'

const headers = (values: Record<string, string>) => (name: string) =>
  values[name.toLowerCase()] ?? null

describe('isFrameableHeaders', () => {
  test('sin headers de bloqueo se puede embeber', () => {
    expect(isFrameableHeaders(headers({}))).toBe(true)
  })

  test('X-Frame-Options DENY o SAMEORIGIN bloquea', () => {
    expect(isFrameableHeaders(headers({ 'x-frame-options': 'DENY' }))).toBe(
      false,
    )
    expect(
      isFrameableHeaders(headers({ 'x-frame-options': 'SAMEORIGIN' })),
    ).toBe(false)
  })

  test("frame-ancestors 'self' o 'none' bloquea; * lo permite", () => {
    expect(
      isFrameableHeaders(
        headers({
          'content-security-policy':
            "default-src 'self'; frame-ancestors 'self'",
        }),
      ),
    ).toBe(false)
    expect(
      isFrameableHeaders(
        headers({ 'content-security-policy': "frame-ancestors 'none'" }),
      ),
    ).toBe(false)
    expect(
      isFrameableHeaders(
        headers({ 'content-security-policy': 'frame-ancestors *' }),
      ),
    ).toBe(true)
  })

  test('CSP sin frame-ancestors no bloquea', () => {
    expect(
      isFrameableHeaders(
        headers({ 'content-security-policy': "default-src 'self'" }),
      ),
    ).toBe(true)
  })
})

describe('toPublicHttpUrl', () => {
  test('acepta URLs públicas http(s)', () => {
    expect(toPublicHttpUrl('https://www.clarin.com/')?.hostname).toBe(
      'www.clarin.com',
    )
  })

  test('rechaza hosts locales, IPs privadas, credenciales y otros esquemas', () => {
    for (const raw of [
      'http://localhost:4096/',
      'http://127.0.0.1:4098/chat',
      'http://192.168.1.10/',
      'http://10.0.0.5/',
      'http://172.20.0.1/',
      'http://169.254.169.254/latest/meta-data',
      'http://[::1]/',
      'https://user:pass@example.com/',
      'file:///etc/passwd',
      'no es url',
    ]) {
      expect(toPublicHttpUrl(raw)).toBeNull()
    }
  })
})

describe('checkFrameable', () => {
  const fakeFetch = (init: ResponseInit, url = 'https://example.com/') =>
    (async () => {
      const response = new Response('ok', init)
      Object.defineProperty(response, 'url', { value: url })
      return response
    }) as unknown as typeof fetch

  test('usa los headers de la respuesta final', async () => {
    expect(await checkFrameable('https://example.com/', fakeFetch({}))).toBe(
      true,
    )
    expect(
      await checkFrameable(
        'https://example.com/',
        fakeFetch({ headers: { 'x-frame-options': 'SAMEORIGIN' } }),
      ),
    ).toBe(false)
  })

  test('null si la URL no es pública o si falla la red', async () => {
    expect(await checkFrameable('http://localhost/', fakeFetch({}))).toBeNull()
    const failing = (async () => {
      throw new Error('red')
    }) as unknown as typeof fetch
    expect(await checkFrameable('https://example.com/', failing)).toBeNull()
  })

  test('null si una redirección termina en un host privado', async () => {
    expect(
      await checkFrameable(
        'https://example.com/',
        fakeFetch({}, 'http://127.0.0.1/admin'),
      ),
    ).toBeNull()
  })
})

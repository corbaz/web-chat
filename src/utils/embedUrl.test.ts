import { describe, expect, test } from 'bun:test'
import { toEmbedUrl } from './embedUrl'

const mapsFor = (q: string) =>
  `https://maps.google.com/maps?q=${encodeURIComponent(q)}&output=embed`

describe('toEmbedUrl', () => {
  test('Google Maps search con api=1 y query', () => {
    const href =
      'https://www.google.com/maps/search/?api=1&query=Azcu%C3%A9naga%202736%2C%20Mar%20del%20Plata'
    expect(toEmbedUrl(href)).toEqual({
      kind: 'map',
      embedUrl: mapsFor('Azcuénaga 2736, Mar del Plata'),
    })
  })

  test('Google Maps con ?q= y dominio de país', () => {
    expect(
      toEmbedUrl('https://www.google.com.ar/maps?q=Obelisco')?.embedUrl,
    ).toBe(mapsFor('Obelisco'))
    expect(toEmbedUrl('https://maps.google.com/?q=Obelisco')?.embedUrl).toBe(
      mapsFor('Obelisco'),
    )
  })

  test('Google Maps /place/<nombre>', () => {
    const href =
      'https://www.google.com/maps/place/Faro+Punta+Mogotes/@-38.08,-57.53,15z'
    expect(toEmbedUrl(href)?.embedUrl).toBe(mapsFor('Faro Punta Mogotes'))
  })

  test('Google Maps solo con coordenadas', () => {
    expect(
      toEmbedUrl('https://www.google.com/maps/@-38.0055,-57.5426,14z')
        ?.embedUrl,
    ).toBe(mapsFor('-38.0055,-57.5426'))
  })

  test('Cómo llegar muestra el destino', () => {
    expect(
      toEmbedUrl(
        'https://www.google.com/maps/dir/?api=1&destination=Azcu%C3%A9naga+2736%2C+Mar+del+Plata',
      )?.embedUrl,
    ).toBe(mapsFor('Azcuénaga 2736, Mar del Plata'))
    expect(
      toEmbedUrl(
        'https://www.google.com/maps/dir/Plaza+Mitre/Azcu%C3%A9naga+2736,+Mar+del+Plata/@-38,-57,14z',
      )?.embedUrl,
    ).toBe(mapsFor('Azcuénaga 2736, Mar del Plata'))
  })

  test('links cortos de Maps no se pueden embeber', () => {
    expect(toEmbedUrl('https://maps.app.goo.gl/abc123')).toBeNull()
  })

  test('YouTube watch, youtu.be y shorts', () => {
    const embed = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
    expect(
      toEmbedUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')?.embedUrl,
    ).toBe(embed)
    expect(toEmbedUrl('https://youtu.be/dQw4w9WgXcQ')?.embedUrl).toBe(embed)
    expect(toEmbedUrl('https://youtube.com/shorts/dQw4w9WgXcQ')?.kind).toBe(
      'video',
    )
  })

  test('otros sitios, google.com sin /maps y URLs inválidas -> null', () => {
    expect(toEmbedUrl('https://es.wikipedia.org/wiki/Mar_del_Plata')).toBeNull()
    expect(toEmbedUrl('https://www.google.com/search?q=mapa')).toBeNull()
    expect(toEmbedUrl('javascript:alert(1)')).toBeNull()
    expect(toEmbedUrl('no es una url')).toBeNull()
  })
})

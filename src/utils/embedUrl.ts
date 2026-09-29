// Links de las respuestas que se pueden mostrar dentro de la app (iframe en un
// modal) sin salir del chat. La mayoría de los sitios bloquean iframes
// (X-Frame-Options / CSP frame-ancestors) y eso no se puede detectar desde el
// navegador, así que solo se embeben servicios conocidos con URL de embed
// pública y sin API key; el resto se abre en una pestaña nueva.

export interface EmbedTarget {
  kind: 'map' | 'video'
  embedUrl: string
}

const MAPS_EMBED_BASE = 'https://maps.google.com/maps'

function mapsEmbed(query: string): EmbedTarget | null {
  const q = query.trim()
  if (!q) return null
  return {
    kind: 'map',
    embedUrl: `${MAPS_EMBED_BASE}?q=${encodeURIComponent(q)}&output=embed`,
  }
}

function isGoogleMapsHost(host: string, path: string): boolean {
  if (host === 'maps.google.com' || /^maps\.google\.[a-z.]+$/.test(host)) {
    return true
  }
  return /^(www\.)?google\.[a-z.]+$/.test(host) && path.startsWith('/maps')
}

function googleMapsQuery(url: URL): string | null {
  const params = url.searchParams
  const direct = params.get('query') || params.get('q')
  if (direct) return direct

  const destination = params.get('destination')
  if (destination) return destination

  const segments = url.pathname.split('/').filter(Boolean)
  // "Cómo llegar" (/maps/dir/<origen>/<destino>/@...): se muestra el destino.
  const dirIndex = segments.indexOf('dir')
  if (dirIndex >= 0) {
    const stops = segments
      .slice(dirIndex + 1)
      .filter(
        (segment) => !segment.startsWith('@') && !segment.startsWith('data='),
      )
    const last = stops.at(-1)
    if (last) return decodeURIComponent(last.replace(/\+/g, ' '))
  }
  const placeIndex = segments.indexOf('place')
  const searchIndex = segments.indexOf('search')
  const nameIndex = placeIndex >= 0 ? placeIndex : searchIndex
  const name = nameIndex >= 0 ? segments[nameIndex + 1] : undefined
  if (name && !name.startsWith('@')) {
    return decodeURIComponent(name.replace(/\+/g, ' '))
  }

  const coords = segments.find((segment) => segment.startsWith('@'))
  const match = coords?.match(/^@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/)
  if (match) return `${match[1]},${match[2]}`
  return null
}

const YOUTUBE_ID = /^[\w-]{11}$/

function youtubeId(url: URL, host: string): string | null {
  if (host === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null
  if (host !== 'youtube.com' && host !== 'm.youtube.com') return null
  if (url.pathname === '/watch') return url.searchParams.get('v')
  const match = url.pathname.match(/^\/(?:shorts|embed|live)\/([^/]+)/)
  return match ? match[1] : null
}

/** URL de embed para un link conocido, o null si hay que abrirlo afuera. */
export function toEmbedUrl(href: string): EmbedTarget | null {
  let url: URL
  try {
    url = new URL(href)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null

  const host = url.hostname.toLowerCase().replace(/^www\./, '')

  if (isGoogleMapsHost(url.hostname.toLowerCase(), url.pathname)) {
    const query = googleMapsQuery(url)
    return query ? mapsEmbed(query) : null
  }

  const id = youtubeId(url, host)
  if (id && YOUTUBE_ID.test(id)) {
    return {
      kind: 'video',
      embedUrl: `https://www.youtube-nocookie.com/embed/${id}`,
    }
  }
  return null
}

// Links de las respuestas (texto markdown y "Fuentes") -> vista en el modal
// del chat (LinkPreviewModal), ver odd/tasks/link-and-image-previews.md.
import type React from 'react'
import type { LinkPreview } from '../components/chat/LinkPreviewModal'
import { toEmbedUrl } from './embedUrl'

export const PREVIEW_TITLE: Record<LinkPreview['kind'], string> = {
  map: 'Ver el mapa en el chat',
  video: 'Ver el video en el chat',
  page: 'Ver la página en el chat',
}

// Link de una respuesta -> vista en el modal. Mapas y videos conocidos usan
// su URL de embed; cualquier otra página http(s) se intenta mostrar tal cual
// (el modal consulta antes si el sitio lo permite). Otros esquemas (mailto:,
// tel:...) quedan con el comportamiento normal del navegador.
export function toLinkPreview(href: string, title: string): LinkPreview | null {
  const embed = toEmbedUrl(href)
  if (embed) return { ...embed, href, title }
  if (!/^https?:\/\//i.test(href)) return null
  return { kind: 'page', embedUrl: href, href, title }
}

// Clic "normal" (sin Ctrl/Cmd/Shift ni botón del medio): ese abre el modal;
// los demás mantienen el comportamiento del navegador (pestaña nueva).
export function isPlainClick(event: React.MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

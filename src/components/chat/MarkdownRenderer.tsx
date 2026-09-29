import type React from 'react'
import { useState } from 'react'
import ReactMarkdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { toEmbedUrl } from '../../utils/embedUrl'
import ImageLightbox from './ImageLightbox'
import LinkPreviewModal, { type LinkPreview } from './LinkPreviewModal'

interface MarkdownRendererProps {
  content: string
  theme: ColorPalette
}

// Texto visible de un link de markdown, para el título del modal.
function textOf(children: React.ReactNode): string {
  if (typeof children === 'string' || typeof children === 'number') {
    return String(children)
  }
  if (Array.isArray(children)) return children.map(textOf).join('')
  return ''
}

// Clic "normal" (sin Ctrl/Cmd/Shift ni botón del medio): ese abre el modal;
// los demás mantienen el comportamiento del navegador (pestaña nueva).
function isPlainClick(event: React.MouseEvent): boolean {
  return (
    event.button === 0 &&
    !event.ctrlKey &&
    !event.metaKey &&
    !event.shiftKey &&
    !event.altKey
  )
}

// Imagen de markdown `![alt](url)`: se ajusta al ancho del mensaje, se amplía
// en la app al hacer clic y, si la URL no carga, queda como link.
function MarkdownImage({
  src,
  alt,
  onOpen,
}: {
  src?: string
  alt?: string
  onOpen: (src: string, alt: string) => void
}) {
  const [broken, setBroken] = useState(false)
  if (!src) return null
  if (broken) {
    return (
      <a href={src} target="_blank" rel="noopener noreferrer">
        🖼️ {alt || src}
      </a>
    )
  }
  return (
    <button
      type="button"
      onClick={() => onOpen(src, alt || 'Imagen')}
      title="Ver imagen"
      className="block my-2 p-0 border-0 bg-transparent cursor-zoom-in"
    >
      <img
        src={src}
        alt={alt || ''}
        loading="lazy"
        referrerPolicy="no-referrer"
        onError={() => setBroken(true)}
        className="max-w-full max-h-96 h-auto rounded-lg"
      />
    </button>
  )
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({
  content,
  theme,
}) => {
  const [linkPreview, setLinkPreview] = useState<LinkPreview | null>(null)
  const [image, setImage] = useState<{ src: string; alt: string } | null>(null)

  const components: Components = {
    a: ({ href, children }) => {
      if (!href) return <span>{children}</span>
      const embed = toEmbedUrl(href)
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          title={
            embed
              ? `Ver ${embed.kind === 'map' ? 'el mapa' : 'el video'} en el chat`
              : 'Abrir en una pestaña nueva'
          }
          onClick={(event) => {
            if (!embed || !isPlainClick(event)) return
            event.preventDefault()
            setLinkPreview({
              ...embed,
              href,
              title: textOf(children).trim() || href,
            })
          }}
        >
          {embed?.kind === 'map' && !textOf(children).includes('📍') && '📍 '}
          {children}
        </a>
      )
    },
    img: ({ src, alt }) => (
      <MarkdownImage
        src={typeof src === 'string' ? src : undefined}
        alt={alt}
        onOpen={(imageSrc, imageAlt) =>
          setImage({ src: imageSrc, alt: imageAlt })
        }
      />
    ),
  }

  return (
    <>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
      <LinkPreviewModal
        preview={linkPreview}
        theme={theme}
        onClose={() => setLinkPreview(null)}
      />
      <ImageLightbox
        src={image?.src ?? null}
        alt={image?.alt}
        theme={theme}
        onClose={() => setImage(null)}
      />
    </>
  )
}

export default MarkdownRenderer

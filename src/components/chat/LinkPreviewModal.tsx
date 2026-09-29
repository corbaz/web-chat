import { useEffect } from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'
import type { EmbedTarget } from '../../utils/embedUrl'

export interface LinkPreview extends EmbedTarget {
  href: string
  title: string
}

interface LinkPreviewModalProps {
  preview: LinkPreview | null
  theme: ColorPalette
  onClose: () => void
}

// Vista en la app de un link embebible de una respuesta (mapa de Google Maps
// o video de YouTube, ver src/utils/embedUrl.ts), para no salir del chat.
// Mismo patrón que FilePreviewModal: overlay + Esc para cerrar. El iframe
// ocupa todo el alto disponible, así que se adapta a cualquier pantalla.
export default function LinkPreviewModal({
  preview,
  theme,
  onClose,
}: LinkPreviewModalProps) {
  useEffect(() => {
    if (!preview) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview, onClose])

  if (!preview) return null

  const buttonStyle = {
    backgroundColor: theme.background,
    color: theme.text,
    boxShadow: theme.shadow.sm,
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={preview.title}
      className="fixed inset-0 z-10000 flex items-center justify-center p-2 sm:p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div
        role="document"
        className="flex flex-col w-full max-w-5xl h-[90vh] rounded-xl overflow-hidden"
        style={{
          backgroundColor: theme.background,
          boxShadow: theme.shadow.outer,
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center gap-2 px-4 py-2.5 shrink-0"
          style={{ boxShadow: theme.shadow.sm }}
        >
          <span
            className="grow text-sm font-medium truncate"
            style={{ color: theme.text }}
            title={preview.title}
          >
            {preview.kind === 'map' ? '📍 ' : '▶️ '}
            {preview.title}
          </span>
          <a
            href={preview.href}
            target="_blank"
            rel="noopener noreferrer"
            title="Abrir en una pestaña nueva"
            className="h-8 px-3 rounded-full flex items-center text-xs shrink-0 no-underline"
            style={buttonStyle}
          >
            ↗ <span className="hidden sm:inline ml-1">Pestaña nueva</span>
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            title="Cerrar (Esc)"
            className="size-8 rounded-full flex items-center justify-center text-lg shrink-0"
            style={buttonStyle}
          >
            ✕
          </button>
        </div>

        <div className="grow overflow-hidden">
          <iframe
            src={preview.embedUrl}
            title={preview.title}
            className="w-full h-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allow="fullscreen; picture-in-picture; encrypted-media"
            allowFullScreen
          />
        </div>
      </div>
    </div>
  )
}

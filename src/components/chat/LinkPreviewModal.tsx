import { useEffect, useState } from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { FRAME_CHECK_PATH } from '../../utils/frameCheck'

export interface LinkPreview {
  kind: 'map' | 'video' | 'page'
  /** URL que se carga en el iframe (la de embed para mapas y videos). */
  embedUrl: string
  /** URL original del link, para "abrir en una pestaña nueva". */
  href: string
  title: string
}

interface LinkPreviewModalProps {
  preview: LinkPreview | null
  theme: ColorPalette
  onClose: () => void
}

type FrameStatus = 'checking' | 'ok' | 'blocked'

const KIND_ICON: Record<LinkPreview['kind'], string> = {
  map: '📍',
  video: '▶️',
  page: '🌐',
}

// Sin allow-top-navigation: una página embebida no puede reemplazar la app
// (el chat nunca se pierde). allow-popups-to-escape-sandbox deja que sus
// propios links a pestañas nuevas funcionen normalmente.
const PAGE_SANDBOX =
  'allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation'

/**
 * Consulta /api/frame-check (ver src/utils/frameCheck.ts). Mapas y videos
 * usan URLs de embed conocidas y no se consultan. Si el endpoint no responde
 * (por ejemplo, sin red) se intenta mostrar igual la página.
 */
function useFrameStatus(preview: LinkPreview | null): FrameStatus {
  const [status, setStatus] = useState<FrameStatus>('checking')

  useEffect(() => {
    if (!preview) return
    if (preview.kind !== 'page') {
      setStatus('ok')
      return
    }
    setStatus('checking')
    const controller = new AbortController()
    fetch(`${FRAME_CHECK_PATH}?url=${encodeURIComponent(preview.href)}`, {
      signal: controller.signal,
    })
      .then((response) => (response.ok ? response.json() : null))
      .then((data: { framable?: boolean | null } | null) => {
        setStatus(data?.framable === false ? 'blocked' : 'ok')
      })
      .catch(() => {
        if (!controller.signal.aborted) setStatus('ok')
      })
    return () => controller.abort()
  }, [preview])

  return status
}

// Vista en la app de un link de una respuesta, para no salir del chat.
// Mismo patrón que FilePreviewModal: overlay + Esc para cerrar. El iframe
// ocupa todo el alto disponible, así que se adapta a cualquier pantalla.
export default function LinkPreviewModal({
  preview,
  theme,
  onClose,
}: LinkPreviewModalProps) {
  const status = useFrameStatus(preview)

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

  const openInNewTab = (
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
  )

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
            title={preview.href}
          >
            {KIND_ICON[preview.kind]} {preview.title}
          </span>
          {openInNewTab}
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
          {status === 'ok' && (
            <iframe
              src={preview.embedUrl}
              title={preview.title}
              className="w-full h-full border-0 bg-white"
              referrerPolicy="no-referrer-when-downgrade"
              sandbox={preview.kind === 'page' ? PAGE_SANDBOX : undefined}
              allow="fullscreen; picture-in-picture; encrypted-media"
              allowFullScreen
            />
          )}
          {status !== 'ok' && (
            <div
              className="w-full h-full flex flex-col items-center justify-center gap-4 p-6 text-center text-sm"
              style={{ color: theme.textMuted }}
            >
              {status === 'checking' ? (
                <span>Revisando si la página se puede ver acá…</span>
              ) : (
                <>
                  <span>
                    Este sitio no permite mostrarse dentro de otra página.
                    <br />
                    Abrilo en una pestaña nueva: el chat queda abierto en esta.
                  </span>
                  {openInNewTab}
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

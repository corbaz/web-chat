import { useEffect } from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'

export type FilePreview =
  | { kind: 'text'; title: string; text: string }
  | { kind: 'pdf'; title: string; blobUrl: string }

interface FilePreviewModalProps {
  preview: FilePreview | null
  theme: ColorPalette
  onClose: () => void
}

// Vista previa en la app de un archivo adjunto (texto/código, PDF-como-texto
// o PDF nativo), ver Scope en odd/tasks/file-attachments.md. Mismo patrón
// que ImageLightbox: overlay + Esc para cerrar. El PDF nativo se previsualiza
// con un blob: URL (nunca data:, que algunos navegadores bloquean en
// <iframe>/<object>); esa URL la crea y revoca quien abre el modal (ver
// Footer.tsx / ChatMessage.tsx).
export default function FilePreviewModal({
  preview,
  theme,
  onClose,
}: FilePreviewModalProps) {
  useEffect(() => {
    if (!preview) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [preview, onClose])

  if (!preview) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={preview.title}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div
        role="document"
        className="flex flex-col w-full max-w-3xl h-[85vh] rounded-xl overflow-hidden"
        style={{
          backgroundColor: theme.background,
          boxShadow: theme.shadow.outer,
        }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={(event) => event.stopPropagation()}
      >
        <div
          className="flex items-center justify-between px-4 py-2.5 shrink-0"
          style={{ boxShadow: theme.shadow.sm }}
        >
          <span
            className="text-sm font-medium truncate"
            style={{ color: theme.text }}
            title={preview.title}
          >
            {preview.title}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar vista previa"
            title="Cerrar (Esc)"
            className="size-8 rounded-full flex items-center justify-center text-lg shrink-0"
            style={{
              backgroundColor: theme.background,
              color: theme.text,
              boxShadow: theme.shadow.sm,
            }}
          >
            ✕
          </button>
        </div>

        <div className="grow overflow-hidden">
          {preview.kind === 'text' ? (
            <pre
              className="w-full h-full overflow-auto p-4 text-xs whitespace-pre-wrap break-words font-mono"
              style={{ color: theme.text }}
            >
              {preview.text}
            </pre>
          ) : (
            <iframe
              src={preview.blobUrl}
              title={preview.title}
              className="w-full h-full border-0"
            />
          )}
        </div>
      </div>
    </div>
  )
}

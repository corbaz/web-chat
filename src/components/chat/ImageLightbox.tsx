import { useEffect } from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'

interface ImageLightboxProps {
  src: string | null
  alt?: string
  theme: ColorPalette
  onClose: () => void
}

// Vista previa de una imagen dentro de la app. Reemplaza abrir el data: URL
// en una pestaña nueva, que Chrome/Edge bloquean (queda en blanco).
export default function ImageLightbox({
  src,
  alt = 'Vista previa',
  theme,
  onClose,
}: ImageLightboxProps) {
  useEffect(() => {
    if (!src) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [src, onClose])

  if (!src) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={alt}
      className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.75)' }}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <button
        type="button"
        onClick={onClose}
        aria-label="Cerrar vista previa"
        title="Cerrar (Esc)"
        className="absolute top-4 right-4 size-10 rounded-full flex items-center justify-center text-xl"
        style={{
          backgroundColor: theme.background,
          color: theme.text,
          boxShadow: theme.shadow.sm,
        }}
      >
        ✕
      </button>
      <img
        src={src}
        alt={alt}
        className="max-w-full max-h-full object-contain rounded-xl"
        style={{ boxShadow: theme.shadow.outer }}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={() => {}}
      />
    </div>
  )
}

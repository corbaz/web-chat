import { useEffect } from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'

interface ImageLightboxProps {
  src: string | null
  alt?: string
  theme: ColorPalette
  onClose: () => void
}

// Vista previa de una imagen dentro de la app. Reemplaza abrir el data: URL
// en una pestaña nueva, que Chrome/Edge bloquean (queda en blanco). Ocupa
// todo el viewport; clic en el fondo o Esc cierran.
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
      className="fixed inset-0 z-10000 flex h-dvh w-full items-center justify-center"
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.92)' }}
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
        className="absolute top-3 right-3 z-10 size-10 rounded-full flex items-center justify-center text-xl"
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
        className="w-full h-full object-contain"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={() => {}}
      />
    </div>
  )
}

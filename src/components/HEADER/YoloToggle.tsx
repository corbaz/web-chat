// Toggle "YOLO" (T7 follow-up, user request 2026-09-28): auto-aprueba sin
// preguntar los permisos de herramientas que el modelo pida en su PC.
// Visible solo para proveedores que corren herramientas locales (Claude
// suscripción, OpenCode Free). Nunca se persiste (useState en App.tsx: se
// pierde al recargar la página) y nunca cambia qué herramientas están
// habilitadas — Bash sigue siendo la única que puede tocar el sistema,
// Edit/Write/Read/NotebookEdit nunca se activan. Prender el toggle muestra
// una confirmación una sola vez por carga de página (hasConfirmedRef).

import type React from 'react'
import { useRef } from 'react'
import Swal from 'sweetalert2'
import type { ColorPalette } from '../../interfaces/temas/temas'

const YOLO_PROVIDERS = new Set(['claudecode', 'opencodefree'])

interface YoloToggleProps {
  selectedProvider?: string
  enabled: boolean
  onChange: (next: boolean) => void
  theme: ColorPalette
  isDarkTheme: boolean
}

const YOLO_WARNING_COLOR = '#ef4444'

const YoloToggle: React.FC<YoloToggleProps> = ({
  selectedProvider,
  enabled,
  onChange,
  theme,
  isDarkTheme,
}) => {
  const hasConfirmedRef = useRef(false)

  if (!selectedProvider || !YOLO_PROVIDERS.has(selectedProvider)) return null

  const handleClick = async () => {
    if (enabled) {
      onChange(false)
      return
    }

    if (!hasConfirmedRef.current) {
      const result = await Swal.fire({
        title: 'Activar modo YOLO',
        html: 'El modelo va a poder ejecutar <strong>comandos en tu computadora sin preguntarte cada vez</strong>. Puede borrar o cambiar archivos por error. Solo afecta a las herramientas ya habilitadas (por ejemplo Bash); nunca se activan herramientas de archivos (Edit/Write/Read).',
        icon: 'warning',
        iconColor: YOLO_WARNING_COLOR,
        showCancelButton: true,
        reverseButtons: true,
        focusCancel: true,
        confirmButtonText: 'Activar de todos modos',
        confirmButtonColor: YOLO_WARNING_COLOR,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: isDarkTheme ? theme.surface : theme.secondary,
        background: theme.background,
        color: theme.text,
      })
      if (!result.isConfirmed) return
      hasConfirmedRef.current = true
    }

    onChange(true)
  }

  return (
    <button
      type="button"
      onClick={() => void handleClick()}
      title="Aprueba sin preguntar los comandos que el modelo quiera ejecutar en tu PC"
      aria-pressed={enabled}
      aria-label="YOLO: aprobar comandos automáticamente, sin preguntar"
      className="nm-press flex items-center justify-center px-2.5 h-8 rounded-xl text-xs font-bold shrink-0"
      style={{
        backgroundColor: enabled ? YOLO_WARNING_COLOR : theme.background,
        color: enabled ? '#fff' : theme.textMuted,
        boxShadow: enabled
          ? `${theme.shadow.sm}, 0 0 0 2px ${YOLO_WARNING_COLOR}55`
          : theme.shadow.sm,
        border: 'none',
        cursor: 'pointer',
        transition: 'background-color 0.2s ease, color 0.2s ease',
      }}
    >
      YOLO
    </button>
  )
}

export default YoloToggle

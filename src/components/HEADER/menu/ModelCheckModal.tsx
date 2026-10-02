import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import type { ColorPalette } from '../../../interfaces/temas/temas.tsx'
import {
  type ModelCheckEntry,
  type ProviderCheckReport,
  runModelCheck,
} from '../../../services/modelCatalog/modelCheckRunner'
import { UNAVAILABLE_REASON_LABELS } from '../../../services/modelCatalog/unavailableModels'

interface ModelCheckModalProps {
  isOpen: boolean
  onClose: () => void
  theme: ColorPalette
}

interface Progress {
  done: number
  total: number
}

const entryIcon = (entry: ModelCheckEntry): string => {
  switch (entry.result) {
    case 'ok':
      return '✅'
    case 'quota':
    case 'unavailable':
      return '🚫'
    case 'subscription':
    case 'skipped':
      return '➖'
    default:
      return '❓'
  }
}

const entryLabel = (entry: ModelCheckEntry): string => {
  switch (entry.result) {
    case 'ok':
      return 'Disponible'
    case 'quota':
    case 'unavailable':
      return UNAVAILABLE_REASON_LABELS[entry.result]
    case 'subscription':
      return 'Incluido en la suscripción'
    case 'skipped':
      return 'No se prueba'
    default:
      return 'No se pudo comprobar'
  }
}

const countBy = (
  report: ProviderCheckReport,
  results: ModelCheckEntry['result'][],
): number =>
  report.models.filter((entry) => results.includes(entry.result)).length

// Revisión de todos los modelos de los proveedores habilitados (ver
// modelCheckRunner.ts). Se dibuja en un portal a <body> para tapar el menú de
// configuración y el resto de la app, como LinkPreviewModal.
export default function ModelCheckModal({
  isOpen,
  onClose,
  theme,
}: ModelCheckModalProps) {
  const [progress, setProgress] = useState<Progress>({ done: 0, total: 0 })
  const [reports, setReports] = useState<ProviderCheckReport[] | null>(null)
  // Una sola revisión vigente: si se cierra o se relanza, la anterior no
  // pisa el estado (sus marcas en el catálogo igual se aplican).
  const runId = useRef(0)

  const start = useCallback(() => {
    const id = ++runId.current
    setReports(null)
    setProgress({ done: 0, total: 0 })
    void runModelCheck((done, total) => {
      if (runId.current === id) setProgress({ done, total })
    }).then((result) => {
      if (runId.current === id) setReports(result)
    })
  }, [])

  useEffect(() => {
    if (!isOpen) return
    start()
    return () => {
      runId.current += 1
    }
  }, [isOpen, start])

  useEffect(() => {
    if (!isOpen) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, onClose])

  if (!isOpen) return null

  const buttonStyle = {
    backgroundColor: theme.background,
    color: theme.text,
    boxShadow: theme.shadow.sm,
  }

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Revisar modelos"
      className="fixed inset-0 z-10000 flex h-dvh w-full"
      style={{ backgroundColor: theme.background }}
    >
      <div role="document" className="flex flex-col w-full h-full min-w-0">
        <div
          className="flex items-center gap-2 px-4 py-2.5 shrink-0"
          style={{ boxShadow: theme.shadow.sm }}
        >
          <span
            className="grow text-sm font-medium truncate"
            style={{ color: theme.text }}
          >
            🔎 Revisar modelos
          </span>
          <button
            type="button"
            onClick={start}
            disabled={reports === null}
            className="h-8 px-3 rounded-full text-xs shrink-0 disabled:opacity-50"
            style={buttonStyle}
          >
            Volver a revisar
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar revisión de modelos"
            title="Cerrar (Esc)"
            className="size-8 rounded-full flex items-center justify-center text-lg shrink-0"
            style={buttonStyle}
          >
            ✕
          </button>
        </div>

        <div className="grow overflow-y-auto overflow-x-hidden p-4 space-y-4">
          <p className="text-xs" style={{ color: theme.textMuted }}>
            Cada modelo recibe un mensaje mínimo con tu clave; puede consumir
            una fracción de centavo en proveedores pagos.
          </p>

          {reports === null ? (
            <p className="text-sm" style={{ color: theme.text }}>
              {progress.total === 0
                ? 'Actualizando las listas de modelos…'
                : `Probando ${progress.done} de ${progress.total}…`}
            </p>
          ) : reports.length === 0 ? (
            <p className="text-sm" style={{ color: theme.textMuted }}>
              No hay proveedores habilitados: guardá una API key para revisar
              sus modelos.
            </p>
          ) : (
            reports.map((report) => {
              const included = countBy(report, ['subscription', 'skipped'])
              return (
                <section
                  key={report.provider}
                  className="rounded-xl p-3"
                  style={{
                    backgroundColor: theme.background,
                    boxShadow: theme.shadow.sm,
                  }}
                >
                  <h3
                    className="text-sm font-semibold flex flex-wrap items-center gap-x-3"
                    style={{ color: theme.accent }}
                  >
                    <span>{report.label}</span>
                    <span
                      className="text-xs font-normal"
                      style={{ color: theme.textMuted }}
                    >
                      ✅ {countBy(report, ['ok'])} · 🚫{' '}
                      {countBy(report, ['quota', 'unavailable'])} · ❓{' '}
                      {countBy(report, ['unknown'])}
                      {included > 0 && ` · ➖ ${included}`}
                    </span>
                  </h3>
                  {report.error && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: theme.textMuted }}
                    >
                      ❓ {report.error}
                    </p>
                  )}
                  <ul className="mt-2 space-y-1">
                    {report.models.map((entry) => (
                      <li
                        key={entry.id}
                        title={entry.message}
                        className="flex items-start gap-2 text-xs"
                        style={{ color: theme.text }}
                      >
                        <span aria-hidden="true">{entryIcon(entry)}</span>
                        <span className="min-w-0 grow break-words">
                          {entry.name && entry.name !== entry.id
                            ? `${entry.name} (${entry.id})`
                            : entry.id}
                        </span>
                        <span
                          className="shrink-0 text-right"
                          style={{ color: theme.textMuted }}
                        >
                          {entryLabel(entry)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body,
  )
}

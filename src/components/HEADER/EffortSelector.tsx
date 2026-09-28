// Control de nivel de esfuerzo (`--effort`), entre el selector de proveedor y
// el de modelo (T4 follow-up, ver odd/tasks/claude-subscription-bridge.md).
// Slider nativo (<input type="range">): accesible por teclado de fábrica,
// estilizado con los tokens neumórficos del tema (theme.background,
// theme.shadow.inset/sm, theme.accent). Se oculta (return null) cuando el
// modelo actual no tiene niveles (getEffortLevels) — genérico, listo para
// otros proveedores a futuro. Sin opción "Por defecto": todo modelo con
// niveles siempre tiene uno explícito seleccionado (ver resolveEffort en
// config/effortSettings.ts), por defecto el más bajo.

import type React from 'react'
import { useEffect, useState } from 'react'
import { getEffortLevels } from '../../config/effort'
import { getStoredEffort, setStoredEffort } from '../../config/effortSettings'
import type { ColorPalette } from '../../interfaces/temas/temas'

const EFFORT_LABELS: Record<string, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  xhigh: 'Muy alto',
  max: 'Máximo',
}

// Estilos del thumb/track solo se pueden tematizar vía pseudo-elementos
// (::-webkit-slider-thumb, ::-moz-range-thumb), inalcanzables desde un
// `style` inline: el texto de este bloque es estático (todos los colores
// viajan por CSS custom properties, seteadas por instancia en el div
// contenedor), así que no se recrea en cada render.
const SLIDER_CSS = `
.effort-range {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 6px;
  border-radius: 999px;
  background: linear-gradient(
    to right,
    var(--effort-accent) var(--effort-fill),
    var(--effort-track-bg) var(--effort-fill)
  );
  box-shadow: var(--effort-track-shadow);
  outline: none;
  cursor: pointer;
  margin: 0;
}
.effort-range::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--effort-thumb-bg);
  box-shadow: var(--effort-thumb-shadow);
  border: 2px solid var(--effort-accent);
  cursor: pointer;
}
.effort-range::-moz-range-thumb {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--effort-thumb-bg);
  box-shadow: var(--effort-thumb-shadow);
  border: 2px solid var(--effort-accent);
  cursor: pointer;
}
.effort-range::-moz-range-track {
  height: 6px;
  border-radius: 999px;
  background: transparent;
}
.effort-range:focus-visible::-webkit-slider-thumb {
  box-shadow: var(--effort-thumb-shadow), var(--effort-focus-shadow);
}
.effort-range:focus-visible::-moz-range-thumb {
  box-shadow: var(--effort-thumb-shadow), var(--effort-focus-shadow);
}
`

interface EffortSelectorProps {
  selectedProvider?: string
  selectedModel?: string
  theme: ColorPalette
}

/** Índice del nivel guardado; si no hay nada guardado o ya no es válido para
 * este modelo, el más bajo (índice 0) — mismo criterio que resolveEffort. */
function resolveIndex(levels: string[], stored: string): number {
  const idx = levels.indexOf(stored)
  return idx === -1 ? 0 : idx
}

const EffortSelector: React.FC<EffortSelectorProps> = ({
  selectedProvider,
  selectedModel,
  theme,
}) => {
  const levels =
    selectedProvider && selectedModel
      ? getEffortLevels(selectedProvider, selectedModel)
      : []

  const [index, setIndex] = useState<number>(() =>
    selectedProvider && selectedModel
      ? resolveIndex(levels, getStoredEffort(selectedProvider, selectedModel))
      : 0,
  )

  // Al cambiar de modelo o proveedor, releer la elección guardada para ESE
  // par (la persistencia es por provider:model, no global) y recalcular el
  // índice contra los niveles del nuevo modelo.
  useEffect(() => {
    if (!selectedProvider || !selectedModel) return
    const currentLevels = getEffortLevels(selectedProvider, selectedModel)
    setIndex(
      resolveIndex(
        currentLevels,
        getStoredEffort(selectedProvider, selectedModel),
      ),
    )
  }, [selectedProvider, selectedModel])

  if (!selectedProvider || !selectedModel || levels.length === 0) return null

  const maxIndex = levels.length - 1
  const clampedIndex = Math.min(index, maxIndex)
  const level = levels[clampedIndex]
  const label = EFFORT_LABELS[level] ?? level
  const fillPercent = maxIndex === 0 ? 100 : (clampedIndex / maxIndex) * 100

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Number(event.target.value)
    setIndex(newIndex)
    setStoredEffort(selectedProvider, selectedModel, levels[newIndex])
  }

  const sliderVars = {
    '--effort-accent': theme.accent,
    '--effort-track-bg': theme.background,
    '--effort-thumb-bg': theme.background,
    '--effort-track-shadow': theme.shadow.inset,
    '--effort-thumb-shadow': theme.shadow.sm,
    '--effort-focus-shadow': theme.shadow.accent,
    '--effort-fill': `${fillPercent}%`,
  } as React.CSSProperties

  return (
    <div
      className="flex flex-col items-center gap-1 w-20 sm:w-24 shrink-0"
      style={sliderVars}
      title="Esfuerzo de razonamiento"
    >
      <style>{SLIDER_CSS}</style>
      <input
        type="range"
        className="effort-range"
        min={0}
        max={maxIndex}
        step={1}
        value={clampedIndex}
        onChange={handleChange}
        aria-label="Esfuerzo de razonamiento"
        aria-valuetext={label}
      />
      <span
        className="text-[11px] font-semibold select-none truncate max-w-full"
        style={{ color: theme.textMuted }}
      >
        {label}
      </span>
    </div>
  )
}

export default EffortSelector

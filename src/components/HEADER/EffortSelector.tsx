// Control de nivel de esfuerzo (`--effort`), entre el selector de proveedor y
// el de modelo (T4 follow-up, ver odd/tasks/claude-subscription-bridge.md).
// Slider nativo (<input type="range">): accesible por teclado de fábrica,
// estilizado con los tokens neumórficos del tema (theme.background,
// theme.shadow.inset/sm, theme.accent). Se oculta (return null) cuando el
// modelo actual no tiene niveles (getEffortLevels) — genérico, listo para
// otros proveedores a futuro. Sin opción "Por defecto": todo modelo con
// niveles siempre tiene uno explícito seleccionado. La posición sale de
// resolveEffort (config/effortSettings.ts), la misma función que usa el envío
// del mensaje: sin elección guardada muestra el default del proveedor (p. ej.
// "Medio" en Codex), nunca un nivel distinto del que realmente se manda.

import type React from 'react'
import { useState } from 'react'
import { getEffortLevels } from '../../config/effort'
import { resolveEffort, setStoredEffort } from '../../config/effortSettings'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { useModelCatalog } from '../../services/modelCatalog/useModelCatalog'

const EFFORT_LABELS: Record<string, string> = {
  low: 'Bajo',
  medium: 'Medio',
  high: 'Alto',
  xhigh: 'Muy alto',
  max: 'Máximo',
  ultra: 'Ultra',
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

const EffortSelector: React.FC<EffortSelectorProps> = ({
  selectedProvider,
  selectedModel,
  theme,
}) => {
  // Se suscribe al catálogo para re-renderizar cuando llegan niveles nuevos
  // (en Codex salen del refresh de model/list, ver
  // services/codexBridge/capabilities.ts).
  useModelCatalog()
  // Fuerza un render tras guardar una elección (el valor vive en
  // localStorage, no en este estado).
  const [, setRevision] = useState(0)

  const levels =
    selectedProvider && selectedModel
      ? getEffortLevels(selectedProvider, selectedModel)
      : []

  if (!selectedProvider || !selectedModel || levels.length === 0) return null

  const maxIndex = levels.length - 1
  const clampedIndex = Math.max(
    0,
    levels.indexOf(resolveEffort(selectedProvider, selectedModel)),
  )
  const level = levels[clampedIndex]
  const label = EFFORT_LABELS[level] ?? level
  const fillPercent = maxIndex === 0 ? 100 : (clampedIndex / maxIndex) * 100

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newIndex = Number(event.target.value)
    setStoredEffort(selectedProvider, selectedModel, levels[newIndex])
    setRevision((revision) => revision + 1)
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

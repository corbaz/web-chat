// Botón del footer con desplegable de banderas: al elegir un idioma llama a
// onSelect. Lo usan el traductor y la varita mágica (ver translate.ts).

import type React from 'react'
import { useEffect, useRef, useState } from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'
import LanguageFlag from './LanguageFlag'
import { TRANSLATE_LANGUAGES, type TranslateLanguageId } from './translate'

interface LanguageMenuProps {
  theme: ColorPalette
  disabled: boolean
  title: string
  ariaLabel: string
  // Encabezado del desplegable ("Traducir a", "Mejorar en").
  menuTitle: string
  icon: React.ReactNode
  buttonStyle: React.CSSProperties
  onSelect: (languageId: TranslateLanguageId) => void
}

const LanguageMenu: React.FC<LanguageMenuProps> = ({
  theme,
  disabled,
  title,
  ariaLabel,
  menuTitle,
  icon,
  buttonStyle,
  onSelect,
}) => {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handlePointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  useEffect(() => {
    if (disabled) setOpen(false)
  }, [disabled])

  return (
    <div ref={containerRef} style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        title={title}
        aria-label={ariaLabel}
        aria-haspopup="menu"
        aria-expanded={open}
        className="nm-press"
        style={buttonStyle}
        disabled={disabled}
      >
        {icon}
      </button>

      {open && (
        <div
          role="menu"
          aria-label={menuTitle}
          style={{
            position: 'absolute',
            bottom: 'calc(100% + 10px)',
            right: 0,
            minWidth: '210px',
            padding: '6px',
            borderRadius: '14px',
            backgroundColor: theme.background,
            boxShadow: theme.shadow.outer,
            border: `1px solid ${theme.accent}30`,
            zIndex: 60,
          }}
        >
          <div
            className="px-3 pt-1 pb-2 text-xs font-semibold"
            style={{ color: theme.textMuted }}
          >
            {menuTitle}
          </div>
          {TRANSLATE_LANGUAGES.map((language) => (
            <button
              key={language.id}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                onSelect(language.id)
              }}
              className="nm-press w-full flex items-center gap-3 px-3 py-2 rounded-xl text-sm text-left"
              style={{
                backgroundColor: 'transparent',
                color: theme.text,
                border: 'none',
                cursor: 'pointer',
              }}
            >
              <LanguageFlag id={language.id} />
              {language.label}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

export default LanguageMenu

// Banderas en SVG para el menú de traducción: Windows no dibuja las banderas
// emoji (muestra las letras "ES", "US"...).

import type React from 'react'
import type { TranslateLanguageId } from './translate'

const FLAGS: Record<TranslateLanguageId, React.ReactNode> = {
  es: (
    <>
      <rect width="30" height="20" fill="#AA151B" />
      <rect y="5" width="30" height="10" fill="#F1BF00" />
    </>
  ),
  'en-US': (
    <>
      <rect width="30" height="20" fill="#fff" />
      {[0, 2, 4, 6, 8, 10, 12].map((i) => (
        <rect
          key={i}
          y={(i * 20) / 13}
          width="30"
          height={20 / 13}
          fill="#B22234"
        />
      ))}
      <rect width="13" height={(7 * 20) / 13} fill="#3C3B6E" />
    </>
  ),
  'en-GB': (
    <>
      <rect width="30" height="20" fill="#012169" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#fff" strokeWidth="4" />
      <path d="M0 0L30 20M30 0L0 20" stroke="#C8102E" strokeWidth="1.5" />
      <path d="M15 0V20M0 10H30" stroke="#fff" strokeWidth="6" />
      <path d="M15 0V20M0 10H30" stroke="#C8102E" strokeWidth="3.5" />
    </>
  ),
  'pt-BR': (
    <>
      <rect width="30" height="20" fill="#009C3B" />
      <path d="M15 2.5L27 10L15 17.5L3 10Z" fill="#FFDF00" />
      <circle cx="15" cy="10" r="4.2" fill="#002776" />
    </>
  ),
}

const LanguageFlag: React.FC<{ id: TranslateLanguageId; size?: number }> = ({
  id,
  size = 20,
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 30 20"
    width={size * 1.5}
    height={size}
    aria-hidden="true"
    style={{ borderRadius: '3px', flexShrink: 0, overflow: 'hidden' }}
  >
    {FLAGS[id]}
  </svg>
)

export default LanguageFlag

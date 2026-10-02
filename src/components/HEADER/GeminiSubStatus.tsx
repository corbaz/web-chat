// Indicador de estado del bridge local de Gemini (suscripción de Google AI
// Pro, ver odd/tasks/gemini-subscription-bridge.md). Espejo de
// CodexSubStatus.tsx.

import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { health } from '../../services/geminiBridge/client'
import {
  getGeminiSubPassword,
  getGeminiSubServerUrl,
} from '../../services/geminiBridge/settings'

type Status = 'checking' | 'connected' | 'unreachable'

export function showGeminiSubUnreachableModal(theme: ColorPalette): void {
  void Swal.fire({
    title: 'Gemini (suscripción) no está disponible',
    html: `
      <p style="text-align:left; margin-bottom: 0.75em;">No se pudo conectar con el bridge local. Pasos:</p>
      <ol style="text-align:left; padding-left: 1.2em; line-height: 1.6;">
        <li>Instalá <a href="https://antigravity.google/" target="_blank" rel="noopener noreferrer">Antigravity CLI</a> (<code>agy</code>) si todavía no lo tenés.</li>
        <li>Iniciá sesión con tu cuenta de Google AI Pro: ejecutá <code>agy</code> y seguí el login.</li>
        <li>Corré el bridge desde el repo: <code>bun run gemini:bridge</code> (queda en primer plano; se arranca a mano cada vez).</li>
        <li>Pegá la contraseña que imprime la consola en Configuración &gt; Gemini (suscripción).</li>
      </ol>
      <p style="text-align:left; margin-top: 0.75em;">Cada respuesta tarda entre 25 y 45 segundos.</p>
    `,
    icon: 'warning',
    iconColor: theme.accent,
    background: theme.background,
    color: theme.text,
    confirmButtonText: 'Entendido',
    confirmButtonColor: theme.accent,
  })
}

interface GeminiSubStatusProps {
  active: boolean
  theme: ColorPalette
}

export function GeminiSubStatus({ active, theme }: GeminiSubStatusProps) {
  const [status, setStatus] = useState<Status>('checking')
  const hasAutoShownRef = useRef(false)

  useEffect(() => {
    if (!active) {
      hasAutoShownRef.current = false
      return
    }

    let cancelled = false
    setStatus('checking')

    const run = async () => {
      const ok = await health(getGeminiSubServerUrl(), getGeminiSubPassword())
      if (cancelled) return
      setStatus(ok ? 'connected' : 'unreachable')
      if (!ok && !hasAutoShownRef.current) {
        hasAutoShownRef.current = true
        showGeminiSubUnreachableModal(theme)
      }
    }

    void run()

    const handleSaved = () => void run()
    window.addEventListener('apikey-changed', handleSaved)
    return () => {
      cancelled = true
      window.removeEventListener('apikey-changed', handleSaved)
    }
  }, [active, theme])

  if (!active) return null

  const color =
    status === 'connected'
      ? '#22c55e'
      : status === 'unreachable'
        ? '#ef4444'
        : theme.textMuted

  const title =
    status === 'connected'
      ? 'Gemini (suscripción): conectado'
      : status === 'unreachable'
        ? 'Gemini (suscripción): no disponible (click para ver instrucciones)'
        : 'Gemini (suscripción): verificando…'

  return (
    <button
      type="button"
      onClick={() => {
        if (status === 'unreachable') showGeminiSubUnreachableModal(theme)
      }}
      title={title}
      aria-label="Estado del bridge de Gemini (suscripción)"
      className="inline-flex items-center justify-center"
      style={{
        background: 'transparent',
        border: 'none',
        padding: '2px',
        cursor: status === 'unreachable' ? 'pointer' : 'default',
      }}
    >
      <span
        className="inline-block rounded-full"
        style={{ width: '8px', height: '8px', backgroundColor: color }}
      />
    </button>
  )
}

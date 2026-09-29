// Indicador de estado del bridge local de Codex (suscripción de ChatGPT, ver
// odd/tasks/openai-subscription-bridge.md). Espejo de ClaudeCodeStatus.tsx:
// corre el health check al seleccionarlo y cada vez que se guarda una
// contraseña/servidor (evento `apikey-changed`).

import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { health } from '../../services/codexBridge/client'
import {
  getCodexPassword,
  getCodexServerUrl,
} from '../../services/codexBridge/settings'

type Status = 'checking' | 'connected' | 'unreachable'

export function showCodexUnreachableModal(theme: ColorPalette): void {
  void Swal.fire({
    title: 'Codex (suscripción) no está disponible',
    html: `
      <p style="text-align:left; margin-bottom: 0.75em;">No se pudo conectar con el bridge local. Pasos:</p>
      <ol style="text-align:left; padding-left: 1.2em; line-height: 1.6;">
        <li>Instalá <a href="https://developers.openai.com/codex/cli" target="_blank" rel="noopener noreferrer">Codex CLI</a> si todavía no lo tenés.</li>
        <li>Iniciá sesión con tu suscripción de ChatGPT: ejecutá <code>codex</code> y seguí el login.</li>
        <li>Corré el bridge desde el repo: <code>bun run codex:bridge</code> (queda en primer plano; se arranca a mano cada vez).</li>
        <li>Pegá la contraseña que imprime la consola en Configuración &gt; Codex (suscripción).</li>
      </ol>
    `,
    icon: 'warning',
    iconColor: theme.accent,
    background: theme.background,
    color: theme.text,
    confirmButtonText: 'Entendido',
    confirmButtonColor: theme.accent,
  })
}

interface CodexSubStatusProps {
  active: boolean
  theme: ColorPalette
}

export function CodexSubStatus({ active, theme }: CodexSubStatusProps) {
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
      const ok = await health(getCodexServerUrl(), getCodexPassword())
      if (cancelled) return
      setStatus(ok ? 'connected' : 'unreachable')
      if (!ok && !hasAutoShownRef.current) {
        hasAutoShownRef.current = true
        showCodexUnreachableModal(theme)
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
      ? 'Codex (suscripción): conectado'
      : status === 'unreachable'
        ? 'Codex (suscripción): no disponible (click para ver instrucciones)'
        : 'Codex (suscripción): verificando…'

  return (
    <button
      type="button"
      onClick={() => {
        if (status === 'unreachable') showCodexUnreachableModal(theme)
      }}
      title={title}
      aria-label="Estado del bridge de Codex (suscripción)"
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

// Indicador de estado del bridge local de Claude (suscripción, ver
// odd/tasks/claude-subscription-bridge.md). Solo se muestra con este
// proveedor seleccionado: corre el health check al seleccionarlo y cada vez
// que se guarda una API key/servidor (evento `apikey-changed`). Si no está
// disponible, un click muestra los pasos para instalarlo/arrancarlo.

import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { health } from '../../services/claudeBridge/client'
import {
  getClaudeCodePassword,
  getClaudeCodeServerUrl,
} from '../../services/claudeBridge/settings'

type Status = 'checking' | 'connected' | 'unreachable'

export function showClaudeCodeUnreachableModal(theme: ColorPalette): void {
  void Swal.fire({
    title: 'Claude (suscripción) no está disponible',
    html: `
      <p style="text-align:left; margin-bottom: 0.75em;">No se pudo conectar con el bridge local. Pasos:</p>
      <ol style="text-align:left; padding-left: 1.2em; line-height: 1.6;">
        <li>Instalá <a href="https://claude.com/claude-code" target="_blank" rel="noopener noreferrer">Claude Code</a> si todavía no lo tenés.</li>
        <li>Iniciá sesión con tu suscripción: ejecutá <code>claude</code> y luego <code>/login</code>.</li>
        <li>Corré el bridge desde el repo: <code>bun run claude:bridge</code> (queda en primer plano; se arranca a mano cada vez).</li>
        <li>Pegá la contraseña que imprime la consola en Configuración &gt; Claude (suscripción).</li>
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

interface ClaudeCodeStatusProps {
  active: boolean
  theme: ColorPalette
}

export function ClaudeCodeStatus({ active, theme }: ClaudeCodeStatusProps) {
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
      const ok = await health(getClaudeCodeServerUrl(), getClaudeCodePassword())
      if (cancelled) return
      setStatus(ok ? 'connected' : 'unreachable')
      if (!ok && !hasAutoShownRef.current) {
        hasAutoShownRef.current = true
        showClaudeCodeUnreachableModal(theme)
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
      ? 'Claude (suscripción): conectado'
      : status === 'unreachable'
        ? 'Claude (suscripción): no disponible (click para ver instrucciones)'
        : 'Claude (suscripción): verificando…'

  return (
    <button
      type="button"
      onClick={() => {
        if (status === 'unreachable') showClaudeCodeUnreachableModal(theme)
      }}
      title={title}
      aria-label="Estado del bridge de Claude (suscripción)"
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

// Indicador de estado del servidor local de OpenCode Free (T3, ver
// odd/tasks/opencode-free-local.md). Solo se muestra con este proveedor
// seleccionado: corre el health check al seleccionarlo y cada vez que se
// guarda una API key/servidor (evento `apikey-changed`). Si no está
// disponible, un click muestra los pasos para instalarlo/arrancarlo.

import { useEffect, useRef, useState } from 'react'
import Swal from 'sweetalert2'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { health } from '../../services/opencodeLocal/client'
import {
  getOpenCodeFreePassword,
  getOpenCodeFreeServerUrl,
} from '../../services/opencodeLocal/settings'

type Status = 'checking' | 'connected' | 'unreachable'

export function showOpenCodeFreeUnreachableModal(theme: ColorPalette): void {
  void Swal.fire({
    title: 'OpenCode Free no está disponible',
    html: `
      <p style="text-align:left; margin-bottom: 0.75em;">No se pudo conectar con el servidor local. Pasos:</p>
      <ol style="text-align:left; padding-left: 1.2em; line-height: 1.6;">
        <li>Si no tenés OpenCode instalado, instalalo desde <a href="https://opencode.ai" target="_blank" rel="noopener noreferrer">opencode.ai</a>.</li>
        <li>Ejecutá <code>bun run opencode:free:install</code> en la carpeta del proyecto.</li>
        <li>Pegá la contraseña impresa en Configuración &gt; OpenCode Free.</li>
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

interface OpenCodeFreeStatusProps {
  active: boolean
  theme: ColorPalette
}

export function OpenCodeFreeStatus({ active, theme }: OpenCodeFreeStatusProps) {
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
      const ok = await health(
        getOpenCodeFreeServerUrl(),
        getOpenCodeFreePassword(),
      )
      if (cancelled) return
      setStatus(ok ? 'connected' : 'unreachable')
      if (!ok && !hasAutoShownRef.current) {
        hasAutoShownRef.current = true
        showOpenCodeFreeUnreachableModal(theme)
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
      ? 'OpenCode Free: conectado'
      : status === 'unreachable'
        ? 'OpenCode Free: no disponible (click para ver instrucciones)'
        : 'OpenCode Free: verificando…'

  return (
    <button
      type="button"
      onClick={() => {
        if (status === 'unreachable') showOpenCodeFreeUnreachableModal(theme)
      }}
      title={title}
      aria-label="Estado de OpenCode Free"
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

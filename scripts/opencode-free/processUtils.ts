// Helpers de proceso/red para los scripts de OpenCode Free (Windows-first).

import { spawnSync } from 'node:child_process'

/** true si `opencode --version` corre correctamente desde el PATH actual. */
export function isOpenCodeInstalled(): boolean {
  const result = spawnSync('opencode', ['--version'], {
    stdio: 'ignore',
    shell: true,
  })
  return result.status === 0
}

const OPENCODE_INSTALL_MESSAGE =
  'OpenCode no está instalado o no está en el PATH. Instálalo desde https://opencode.ai y volvé a intentar.'

export function printOpenCodeMissing(): void {
  console.error(OPENCODE_INSTALL_MESSAGE)
}

/**
 * Espera a que el health check responda `{healthy:true}`, con timeout.
 * GET /global/health exige Basic auth (verificado en vivo 2026-09-26: sin
 * credenciales devuelve 401), así que se manda con la password del sandbox.
 */
export async function waitForHealth(
  url: string,
  password: string,
  timeoutMs = 15000,
): Promise<boolean> {
  const authHeader = `Basic ${Buffer.from(`opencode:${password}`).toString('base64')}`
  const deadline = Date.now() + timeoutMs
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/global/health`, {
        headers: { Authorization: authHeader },
      })
      if (res.ok) {
        const data = (await res.json()) as { healthy?: boolean }
        if (data?.healthy === true) return true
      }
    } catch {
      // El servidor todavía no responde; se reintenta hasta el timeout.
    }
    await new Promise((resolve) => setTimeout(resolve, 500))
  }
  return false
}

/** PID que escucha en `127.0.0.1:<port>` según `netstat`, o null si ninguno. */
export function findListeningPid(
  hostname: string,
  port: number,
): string | null {
  const result = spawnSync('netstat', ['-ano', '-p', 'tcp'], {
    encoding: 'utf8',
  })
  if (result.status !== 0 || !result.stdout) return null

  const needle = `${hostname}:${port}`
  for (const line of result.stdout.split(/\r?\n/)) {
    if (line.includes(needle) && line.includes('LISTENING')) {
      const parts = line.trim().split(/\s+/)
      const pid = parts[parts.length - 1]
      if (pid && /^\d+$/.test(pid)) return pid
    }
  }
  return null
}

/** Nombre de imagen del proceso con ese PID (p. ej. "opencode.exe"), o null. */
export function processImageName(pid: string): string | null {
  const result = spawnSync(
    'tasklist',
    ['/FI', `PID eq ${pid}`, '/FO', 'CSV', '/NH'],
    { encoding: 'utf8' },
  )
  if (result.status !== 0 || !result.stdout) return null
  const line = result.stdout.trim()
  if (!line || /no tasks|información|info:/i.test(line)) return null
  const name = line.split(',')[0]?.replace(/^"|"$/g, '')
  return name || null
}

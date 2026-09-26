// Lanzador oculto del servidor (compartido por install/password/uninstall).

import { spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, writeFileSync } from 'node:fs'
import {
  CORS_ORIGINS,
  HOSTNAME,
  LAUNCHER_PATH,
  PORT,
  SANDBOX_DIR,
  STARTUP_LAUNCHER_PATH,
} from './config'
import { findListeningPid, processImageName } from './processUtils'

// El .vbs escapa comillas dobles duplicándolas (regla estándar de VBScript).
const vbsEscape = (value: string): string => value.replace(/"/g, '""')

function buildServeCommandLine(): string {
  const parts = [
    'opencode',
    'serve',
    '--port',
    String(PORT),
    '--hostname',
    HOSTNAME,
  ]
  for (const origin of CORS_ORIGINS) parts.push('--cors', origin)
  return parts.join(' ')
}

export function writeLauncher(password: string): void {
  const commandLine = buildServeCommandLine()
  const script = [
    'Dim shell',
    'Set shell = CreateObject("WScript.Shell")',
    `shell.CurrentDirectory = "${vbsEscape(SANDBOX_DIR)}"`,
    `shell.Environment("Process")("OPENCODE_SERVER_PASSWORD") = "${vbsEscape(password)}"`,
    `shell.Run "${vbsEscape(commandLine)}", 0, False`,
    '',
  ].join('\r\n')
  writeFileSync(LAUNCHER_PATH, script, 'utf8')
}

// La carpeta Inicio ejecuta los .vbs al iniciar sesión. A diferencia de
// `schtasks /SC ONLOGON`, no requiere permisos de administrador.
export function installStartupLauncher(): boolean {
  try {
    copyFileSync(LAUNCHER_PATH, STARTUP_LAUNCHER_PATH)
    return true
  } catch (error) {
    console.error(error)
    return false
  }
}

export function startLauncherNow(): void {
  spawnSync('wscript.exe', [LAUNCHER_PATH], { stdio: 'inherit' })
}

/** true si el lanzador está en la carpeta Inicio (arranque automático). */
export function isStartupLauncherInstalled(): boolean {
  return existsSync(STARTUP_LAUNCHER_PATH)
}

export function stopServer(): string {
  const pid = findListeningPid(HOSTNAME, PORT)
  if (!pid) return 'El servidor no estaba corriendo (nada escuchando en el puerto).'

  const imageName = processImageName(pid)
  if (!imageName || !/opencode/i.test(imageName)) {
    return `Había algo escuchando en ${HOSTNAME}:${PORT} (PID ${pid}, proceso "${
      imageName ?? 'desconocido'
    }") que no parece ser OpenCode; no se detuvo por seguridad.`
  }

  const result = spawnSync('taskkill', ['/PID', pid, '/F'], {
    stdio: 'inherit',
  })
  if (result.status === 0) {
    return `Servidor detenido (PID ${pid}, proceso "${imageName}").`
  }
  return `No se pudo detener el proceso PID ${pid} ("${imageName}").`
}


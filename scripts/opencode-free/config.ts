// Configuración compartida de los scripts de OpenCode Free (T1, ver
// odd/tasks/opencode-free-local.md). Sandbox aislado que expone los modelos
// gratuitos de OpenCode Zen (ids `-free`, `big-pickle`) vía `opencode serve`:
// OpenCode solo sirve esos modelos a peticiones que parecen un agente de
// código con herramientas declaradas (ver Problem/Why en el feature doc).
// Windows-first: pensado para correr con bun en Windows 11.

import { randomBytes } from 'node:crypto'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export const TASK_NAME = 'PromptingOpenCodeFree'
export const PORT = 4096
export const HOSTNAME = '127.0.0.1'
export const CORS_ORIGINS = [
  'https://localhost:5173',
  'https://prompting-chat.vercel.app',
]

const localAppData =
  process.env.LOCALAPPDATA ||
  join(process.env.USERPROFILE || 'C:/Users/Default', 'AppData', 'Local')

export const SANDBOX_DIR = join(localAppData, 'prompting', 'opencode-free')
export const CONFIG_PATH = join(SANDBOX_DIR, 'opencode.json')
export const PASSWORD_PATH = join(SANDBOX_DIR, 'password.txt')
export const PID_PATH = join(SANDBOX_DIR, 'server.pid')
export const LAUNCHER_PATH = join(SANDBOX_DIR, 'launch.vbs')

// Carpeta Inicio del usuario: Windows ejecuta lo que hay acá al iniciar sesión.
const roamingAppData =
  process.env.APPDATA ||
  join(process.env.USERPROFILE || 'C:/Users/Default', 'AppData', 'Roaming')
export const STARTUP_LAUNCHER_PATH = join(
  roamingAppData,
  'Microsoft',
  'Windows',
  'Start Menu',
  'Programs',
  'Startup',
  'PromptingOpenCodeFree.vbs',
)

// Permisos "ask" (nunca "deny" ni tools deshabilitadas): el modelo puede
// pedir ejecutar bash/editar/etc., pero la llamada de chat queda bloqueada
// hasta que se responda vía POST /session/:id/permissions/:permissionID
// (ver src/services/opencodeLocal/client.ts). Verificado 2026-09-25/26: sin
// este archivo, OpenCode responde FreeTierError a los modelos gratuitos.
const SANDBOX_OPENCODE_CONFIG = {
  $schema: 'https://opencode.ai/config.json',
  permission: {
    bash: 'ask',
    edit: 'ask',
    webfetch: 'ask',
    external_directory: 'ask',
  },
}

export function ensureSandboxDir(): void {
  if (!existsSync(SANDBOX_DIR)) mkdirSync(SANDBOX_DIR, { recursive: true })
}

/** Crea `opencode.json` con permisos "ask" solo si todavía no existe. */
export function ensureConfigFile(): void {
  ensureSandboxDir()
  if (!existsSync(CONFIG_PATH)) {
    writeFileSync(
      CONFIG_PATH,
      JSON.stringify(SANDBOX_OPENCODE_CONFIG, null, 2),
      'utf8',
    )
  }
}

/** Genera la contraseña una sola vez y la reutiliza en corridas siguientes. */
export function ensurePassword(): string {
  ensureSandboxDir()
  if (existsSync(PASSWORD_PATH)) {
    const existing = readFileSync(PASSWORD_PATH, 'utf8').trim()
    if (existing) return existing
  }
  const password = randomBytes(18).toString('hex')
  writeFileSync(PASSWORD_PATH, password, 'utf8')
  return password
}

export function readPassword(): string | null {
  if (!existsSync(PASSWORD_PATH)) return null
  const value = readFileSync(PASSWORD_PATH, 'utf8').trim()
  return value || null
}

/** Argumentos de `opencode serve` para el sandbox (puerto, host, CORS). */
export function serverArgs(): string[] {
  const args = ['serve', '--port', String(PORT), '--hostname', HOSTNAME]
  for (const origin of CORS_ORIGINS) args.push('--cors', origin)
  return args
}

export function serverUrl(): string {
  return `http://${HOSTNAME}:${PORT}`
}

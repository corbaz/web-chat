#!/usr/bin/env bun
// `bun run opencode:free:install` — deja el lanzador oculto en la carpeta
// Inicio de Windows (arranca al iniciar sesión, sin permisos de
// administrador) y arranca el servidor ahora mismo.

import { writeFileSync } from 'node:fs'
import {
  ensureConfigFile,
  ensurePassword,
  HOSTNAME,
  PID_PATH,
  PORT,
  STARTUP_LAUNCHER_PATH,
  serverUrl,
} from './config'
import {
  installStartupLauncher,
  startLauncherNow,
  writeLauncher,
} from './launcher'
import {
  findListeningPid,
  isOpenCodeInstalled,
  printOpenCodeMissing,
  waitForHealth,
} from './processUtils'

async function main(): Promise<void> {
  if (!isOpenCodeInstalled()) {
    printOpenCodeMissing()
    process.exitCode = 1
    return
  }

  ensureConfigFile()
  const password = ensurePassword()
  writeLauncher(password)

  console.log(`Agregando el lanzador a la carpeta Inicio: ${STARTUP_LAUNCHER_PATH}`)
  if (!installStartupLauncher()) {
    console.error('No se pudo copiar el lanzador a la carpeta Inicio.')
    process.exitCode = 1
    return
  }

  const running = findListeningPid(HOSTNAME, PORT)
  if (!running) {
    console.log('Iniciando el servidor ahora...')
    startLauncherNow()
  }

  const url = serverUrl()
  const healthy = await waitForHealth(url, password)
  if (!healthy) {
    console.error(
      `El lanzador quedó instalado pero el servidor no respondió en ${url} a tiempo. Revisá que OpenCode esté instalado y volvé a intentar con "bun run opencode:free" en primer plano para ver el error.`,
    )
    process.exitCode = 1
    return
  }

  const pid = findListeningPid(HOSTNAME, PORT)
  if (pid) writeFileSync(PID_PATH, pid, 'utf8')

  console.log('')
  console.log('OpenCode Free instalado y corriendo.')
  console.log(`URL: ${url}`)
  console.log(`Password: ${password}`)
  console.log(
    'Pegá estos valores en Configuración > OpenCode Free (servidor + password).',
  )
}

void main()

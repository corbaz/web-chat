#!/usr/bin/env bun
// `bun run opencode:free:password` — copia la contraseña del servidor local al
// portapapeles de Windows.
// `bun run opencode:free:password <nueva>` — cambia la contraseña por una
// elegida por el usuario, actualiza el lanzador y reinicia el servidor.

import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import {
  ensureConfigFile,
  PASSWORD_PATH,
  serverUrl,
} from './config'
import {
  installStartupLauncher,
  isStartupLauncherInstalled,
  startLauncherNow,
  stopServer,
  writeLauncher,
} from './launcher'
import { waitForHealth } from './processUtils'

const MIN_LENGTH = 6

function copyToClipboard(password: string): void {
  const result = spawnSync('clip.exe', { input: password })
  if (result.status === 0) {
    console.log(
      `Contraseña copiada al portapapeles (${password.length} caracteres). Pegala en la app con Ctrl+V.`,
    )
  } else {
    console.log(`No se pudo usar el portapapeles. Contraseña: ${password}`)
  }
}

async function setPassword(password: string): Promise<void> {
  if (password.length < MIN_LENGTH || /\s/.test(password)) {
    console.error(
      `La contraseña debe tener al menos ${MIN_LENGTH} caracteres y no llevar espacios.`,
    )
    process.exitCode = 1
    return
  }

  ensureConfigFile()
  writeFileSync(PASSWORD_PATH, password, 'utf8')
  writeLauncher(password)
  if (isStartupLauncherInstalled()) installStartupLauncher()

  // El servidor toma la contraseña al arrancar: hay que reiniciarlo.
  console.log(stopServer())
  startLauncherNow()

  const url = serverUrl()
  if (await waitForHealth(url, password)) {
    console.log(`Contraseña actualizada y servidor reiniciado en ${url}.`)
    console.log('Usá esa misma contraseña en la app (OpenCode Free).')
  } else {
    console.error(
      `La contraseña se guardó, pero el servidor no respondió en ${url}. Probá "bun run opencode:free" para ver el error.`,
    )
    process.exitCode = 1
  }
}

const newPassword = process.argv[2]?.trim()

if (newPassword) {
  await setPassword(newPassword)
} else if (!existsSync(PASSWORD_PATH)) {
  console.error(
    'Todavía no hay contraseña. Corré primero "bun run opencode:free:install".',
  )
  process.exitCode = 1
} else {
  copyToClipboard(readFileSync(PASSWORD_PATH, 'utf8').trim())
}

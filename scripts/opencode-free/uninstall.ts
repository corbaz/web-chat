#!/usr/bin/env bun
// `bun run opencode:free:uninstall` — quita el lanzador de la carpeta Inicio
// (y la tarea programada de versiones anteriores, si existe) y detiene el
// servidor. Solo mata el proceso que sigue escuchando en 127.0.0.1:<PORT>
// (nuestro sandbox) y solo si su imagen contiene "opencode": nunca toca
// OpenCode Desktop (otro puerto, otro proceso).

import { existsSync, rmSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { PID_PATH, STARTUP_LAUNCHER_PATH, TASK_NAME } from './config'
import { stopServer } from './launcher'

function taskExists(): boolean {
  const result = spawnSync('schtasks', ['/Query', '/TN', TASK_NAME], {
    stdio: 'ignore',
  })
  return result.status === 0
}

function deleteScheduledTask(): boolean {
  if (!taskExists()) return false
  spawnSync('schtasks', ['/Delete', '/TN', TASK_NAME, '/F'], {
    stdio: 'inherit',
  })
  return true
}

function removeStartupLauncher(): boolean {
  if (!existsSync(STARTUP_LAUNCHER_PATH)) return false
  rmSync(STARTUP_LAUNCHER_PATH, { force: true })
  return true
}

function main(): void {
  const hadLauncher = removeStartupLauncher()
  const hadTask = deleteScheduledTask()
  const serverMessage = stopServer()

  if (existsSync(PID_PATH)) rmSync(PID_PATH, { force: true })

  console.log(
    hadLauncher
      ? 'Lanzador quitado de la carpeta Inicio.'
      : 'No había lanzador en la carpeta Inicio.',
  )
  if (hadTask) console.log(`Tarea programada "${TASK_NAME}" eliminada.`)
  console.log(serverMessage)
}

main()

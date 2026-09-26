#!/usr/bin/env bun
// `bun run opencode:free` — corre el servidor en primer plano (uso manual /
// debug). Para autoarranque con Windows usar `bun run opencode:free:install`.

import { spawn } from 'node:child_process'
import {
  ensureConfigFile,
  ensurePassword,
  SANDBOX_DIR,
  serverArgs,
  serverUrl,
} from './config'
import { isOpenCodeInstalled, printOpenCodeMissing } from './processUtils'

function main(): void {
  if (!isOpenCodeInstalled()) {
    printOpenCodeMissing()
    process.exitCode = 1
    return
  }

  ensureConfigFile()
  const password = ensurePassword()

  console.log(`Carpeta del sandbox: ${SANDBOX_DIR}`)
  console.log(`Iniciando OpenCode Free en ${serverUrl()}`)
  console.log(`Password: ${password}`)
  console.log('Presiona Ctrl+C para detener el servidor.')

  const child = spawn('opencode', serverArgs(), {
    cwd: SANDBOX_DIR,
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, OPENCODE_SERVER_PASSWORD: password },
  })

  child.on('exit', (code) => {
    process.exitCode = code ?? 0
  })
}

main()

# Instalador de Prompting para Windows: revisa los CLI (pregunta antes de
# instalar lo que falte), prepara las carpetas de los 3 puentes locales y
# agrega al perfil de PowerShell los comandos zen-server, claude-server,
# codex-server, gemini-server y ollama-server (uno por terminal).
# Uso (PowerShell):
#   irm https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/install-windows.ps1 | iex
# Se puede repetir: sirve también para actualizar los puentes, y el bloque
# del perfil se reemplaza (nunca se duplica). Espejo de install-mac.sh.

$ErrorActionPreference = 'Stop'

$PromptingBase = Join-Path $env:LOCALAPPDATA 'prompting'
$PromptingRaw = 'https://raw.githubusercontent.com/corbaz/web-chat/main/scripts'
$PromptingMarkStart = '# >>> prompting servers >>>'
$PromptingMarkEnd = '# <<< prompting servers <<<'

function Confirm-Prompting([string]$Question) {
  $answer = Read-Host "$Question [s/N]"
  return $answer -match '^[sSyY]$'
}

function Install-PromptingTool([string]$Command, [string]$Name, [string]$InstallCommand) {
  if (Get-Command $Command -ErrorAction SilentlyContinue) {
    Write-Host "✔ $Name ya está instalado ($((Get-Command $Command).Source))"
  } elseif (Confirm-Prompting "✖ $Name no está instalado. ¿Instalarlo ahora?") {
    Invoke-Expression $InstallCommand
  } else {
    Write-Host "  Salteado: $Name (instalalo después con: $InstallCommand)"
  }
}

function Save-PromptingDownload([string]$Url, [string]$Path, [string]$Label) {
  try {
    Invoke-WebRequest -Uri $Url -OutFile $Path -UseBasicParsing
    Write-Host "✔ $Label"
  } catch {
    Write-Host "✖ No se pudo bajar $Label"
  }
}

# Contraseña de los servidores: en $PromptingBase\password.txt, nunca en el
# perfil. $env:PROMPTING_PASSWORD evita la pregunta.
function Set-PromptingPassword([string]$PasswordFile) {
  $password = $env:PROMPTING_PASSWORD
  $hasCurrent = (Test-Path $PasswordFile) -and ((Get-Item $PasswordFile).Length -gt 0)
  if (-not $password) {
    $question = if ($hasCurrent) {
      'Contraseña de los servidores (Enter = conservar la actual)'
    } else {
      'Contraseña para los servidores (Enter = generar una)'
    }
    $secure = Read-Host $question -AsSecureString
    $password = [Runtime.InteropServices.Marshal]::PtrToStringAuto(
      [Runtime.InteropServices.Marshal]::SecureStringToBSTR($secure))
  }
  if ($password) {
    Set-Content -Path $PasswordFile -Value $password -NoNewline -Encoding ascii
  } elseif (-not $hasCurrent) {
    $chars = [char[]]'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    $password = -join (1..16 | ForEach-Object { $chars | Get-Random })
    Set-Content -Path $PasswordFile -Value $password -NoNewline -Encoding ascii
    Write-Host "  Contraseña generada: $password"
  }
}

function Get-PromptingProfileBlock {
  return @'
# >>> prompting servers >>>
# Servidores locales de Prompting (uno por terminal). Generado por
# install-windows.ps1: se reemplaza al volver a correrlo. La contraseña
# está en %LOCALAPPDATA%\prompting\password.txt.
$PromptingDir = Join-Path $env:LOCALAPPDATA 'prompting'
function prompting-password { Get-Content -Raw (Join-Path $PromptingDir 'password.txt') }

# OpenCode Free (puerto 4096)
function zen-server {
  Push-Location (Join-Path $PromptingDir 'opencode-free')
  $env:XDG_CONFIG_HOME = Join-Path $PromptingDir 'opencode-free\config-home'
  $env:OPENCODE_SERVER_PASSWORD = prompting-password
  try {
    opencode serve --port 4096 --hostname 127.0.0.1 `
      --cors https://localhost:5173 --cors https://prompting-chat.vercel.app
  } finally { Pop-Location }
}

# Claude (suscripción) (puerto 4098)
function claude-server {
  Push-Location (Join-Path $PromptingDir 'claude-bridge')
  $env:CLAUDE_BRIDGE_PASSWORD = prompting-password
  try { bun claude-bridge.js } finally { Pop-Location }
}

# OpenAI (suscripción) (puerto 4094)
function codex-server {
  Push-Location (Join-Path $PromptingDir 'codex-bridge')
  $env:CODEX_BRIDGE_PASSWORD = prompting-password
  try { bun codex-bridge.js } finally { Pop-Location }
}

# Gemini (suscripción) (puerto 4092)
function gemini-server {
  Push-Location (Join-Path $PromptingDir 'gemini-bridge')
  $env:GEMINI_BRIDGE_PASSWORD = prompting-password
  try { bun gemini-bridge.js } finally { Pop-Location }
}

# Ollama Cloud (puerto 11434), sin contraseña. Si la app de Ollama está
# abierta en la bandeja del sistema, ya ocupa el puerto: cerrala antes.
function ollama-server {
  $env:OLLAMA_ORIGINS = 'https://localhost:5173,https://prompting-chat.vercel.app'
  ollama serve
}
# <<< prompting servers <<<
'@
}

# Escribe (o reemplaza) el bloque en cada perfil. Sin -Paths: el perfil de
# todos los hosts de Windows PowerShell 5.1 y de PowerShell 7.
function Set-PromptingProfile([string[]]$Paths) {
  if (-not $Paths) {
    $docs = [Environment]::GetFolderPath('MyDocuments')
    $Paths = @(
      (Join-Path $docs 'WindowsPowerShell\profile.ps1'),
      (Join-Path $docs 'PowerShell\profile.ps1')
    )
  }
  $block = Get-PromptingProfileBlock
  $pattern = '(?s)\r?\n?' + [regex]::Escape($PromptingMarkStart) + '.*?' +
    [regex]::Escape($PromptingMarkEnd) + '\r?\n?'
  foreach ($path in $Paths) {
    $dir = Split-Path $path -Parent
    if (-not (Test-Path $dir)) { New-Item -ItemType Directory -Path $dir -Force | Out-Null }
    $current = if (Test-Path $path) { Get-Content -Raw $path } else { '' }
    if ($null -eq $current) { $current = '' }
    $clean = [regex]::Replace($current, $pattern, "`n").TrimEnd()
    $content = if ($clean) { "$clean`n`n$block`n" } else { "$block`n" }
    Set-Content -Path $path -Value $content -NoNewline -Encoding utf8
    Write-Host "✔ Comandos agregados a $path"
  }
}

function Install-Prompting {
  Write-Host '== 1. Programas =='
  Install-PromptingTool bun 'Bun' 'powershell -c "irm bun.sh/install.ps1 | iex"'
  $env:PATH = "$env:USERPROFILE\.bun\bin;$env:PATH"
  Install-PromptingTool opencode 'OpenCode' 'bun add -g opencode-ai'
  Install-PromptingTool claude 'Claude Code' 'irm https://claude.ai/install.ps1 | iex'
  Install-PromptingTool codex 'Codex CLI' 'bun add -g @openai/codex'

  Write-Host ''
  Write-Host '== 2. OpenCode Free =='
  $openCodeDir = Join-Path $PromptingBase 'opencode-free'
  New-Item -ItemType Directory -Path (Join-Path $openCodeDir 'config-home') -Force | Out-Null
  $openCodeConfig = @'
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "chat",
  "agent": {
    "chat": {
      "mode": "primary",
      "description": "Asistente de chat general",
      "prompt": "Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos, no leas ni edites archivos y no uses herramientas. Si algo requiere información que no tenés, decilo. Si el usuario pide un mapa, una ubicación o una dirección, incluí un link de Google Maps en markdown con esa dirección en la búsqueda: la app lo muestra como mapa dentro del chat. No podés generar imágenes ni capturas de pantalla; si tenés la URL directa de una imagen pública real, mostrala como imagen markdown. Nunca inventes URLs de imágenes.",
      "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
    }
  },
  "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
}
'@
  Set-Content -Path (Join-Path $openCodeDir 'opencode.json') -Value $openCodeConfig -Encoding utf8
  Write-Host "✔ $openCodeDir"

  Write-Host ''
  Write-Host '== 3. Puentes (Claude, OpenAI, Gemini) =='
  foreach ($bridge in 'claude', 'codex', 'gemini') {
    $dir = Join-Path $PromptingBase "$bridge-bridge"
    New-Item -ItemType Directory -Path $dir -Force | Out-Null
    Save-PromptingDownload "$PromptingRaw/$bridge-bridge/$bridge-bridge.js" (Join-Path $dir "$bridge-bridge.js") "$bridge-bridge.js"
  }
  if (-not (Get-Command agy -ErrorAction SilentlyContinue)) {
    Write-Host '  Nota: Antigravity CLI (agy) no está instalado y este script no lo instala.'
    Write-Host '  Instalalo desde https://antigravity.google/ para usar Gemini (suscripción).'
  }

  Write-Host ''
  Write-Host '== 4. Comandos de la terminal =='
  New-Item -ItemType Directory -Path $PromptingBase -Force | Out-Null
  Set-PromptingPassword (Join-Path $PromptingBase 'password.txt')
  Set-PromptingProfile
  # Con la política por defecto de Windows (Restricted) el perfil no se
  # carga y los comandos no existirían.
  $policy = Get-ExecutionPolicy -Scope CurrentUser
  if ($policy -in 'Undefined', 'Restricted', 'AllSigned') {
    if (Confirm-Prompting "La política de ejecución ($policy) no deja cargar el perfil. ¿Cambiarla a RemoteSigned solo para tu usuario?") {
      Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
      Write-Host '✔ Política de ejecución: RemoteSigned (tu usuario)'
    } else {
      Write-Host '  Sin cambiar la política, los comandos no van a aparecer. Para hacerlo después:'
      Write-Host '  Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned'
    }
  }

  Write-Host ''
  Write-Host '== Pendiente a mano (una sola vez) =='
  Write-Host '  claude   → /login        (con tu suscripción de Claude)'
  Write-Host '  codex login              (con tu cuenta de ChatGPT)'
  Write-Host '  agy                      (con tu cuenta de Google AI Pro)'
  Write-Host '  ollama signin            (si vas a usar Ollama Cloud: instalá Ollama desde https://ollama.com)'
  Write-Host "  opencode → mandá 'hola' con un modelo gratis y salí"
  Write-Host ''
  Write-Host '== Arranque (cada vez, una terminal para cada uno) =='
  Write-Host '  Abrí una terminal de PowerShell nueva y usá:'
  Write-Host '    zen-server      OpenCode Free (4096)'
  Write-Host '    claude-server   Claude (suscripción) (4098)'
  Write-Host '    codex-server    OpenAI (suscripción) (4094)'
  Write-Host '    gemini-server   Gemini (suscripción) (4092)'
  Write-Host '    ollama-server   Ollama Cloud (11434)'
  Write-Host '  En la app, cada proveedor lleva la contraseña de los servidores'
  Write-Host '  (para verla: prompting-password).'
}

# $env:PROMPTING_INSTALL_LIB = '1' carga las funciones sin instalar nada
# (para probarlas).
if ($env:PROMPTING_INSTALL_LIB -ne '1') { Install-Prompting }

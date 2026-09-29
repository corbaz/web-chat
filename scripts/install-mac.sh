#!/usr/bin/env bash
# Instalador de Prompting para macOS: revisa los CLI (pregunta antes de
# instalar lo que falte) y prepara las carpetas de los 3 puentes locales.
# Uso: curl -fsSL https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/install-mac.sh | bash
# (o descargarlo y correr: bash install-mac.sh). Se puede repetir: sirve
# también para actualizar claude-bridge.js y codex-bridge.js.
set -u

BASE="$HOME/Library/Application Support/prompting"
RAW="https://raw.githubusercontent.com/corbaz/web-chat/main/scripts"

preguntar() {
  # Lee de la terminal aunque el script llegue por "curl | bash".
  local resp
  read -r -p "$1 [s/N] " resp </dev/tty
  [[ "$resp" =~ ^[sSyY]$ ]]
}

instalar_si_falta() {
  # $1 = comando, $2 = nombre, $3 = comando de instalación
  if command -v "$1" >/dev/null 2>&1; then
    echo "✔ $2 ya está instalado ($(command -v "$1"))"
  elif preguntar "✖ $2 no está instalado. ¿Instalarlo ahora?"; then
    bash -c "$3"
  else
    echo "  Salteado: $2 (instalalo después con: $3)"
  fi
}

echo "== 1. Programas =="
instalar_si_falta bun      "Bun"         "curl -fsSL https://bun.sh/install | bash"
export PATH="$HOME/.bun/bin:$PATH"
instalar_si_falta opencode "OpenCode"    "curl -fsSL https://opencode.ai/install | bash"
instalar_si_falta claude   "Claude Code" "curl -fsSL https://claude.ai/install.sh | bash"
instalar_si_falta codex    "Codex CLI"   "bun add -g @openai/codex"

echo
echo "== 2. OpenCode Free =="
mkdir -p "$BASE/opencode-free/config-home"
cat > "$BASE/opencode-free/opencode.json" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "chat",
  "agent": {
    "chat": {
      "mode": "primary",
      "description": "Asistente de chat general",
      "prompt": "Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos, no leas ni edites archivos y no uses herramientas. Si algo requiere información que no tenés, decilo.",
      "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
    }
  },
  "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
}
EOF
echo "✔ $BASE/opencode-free"

echo
echo "== 3. Puente de Claude =="
mkdir -p "$BASE/claude-bridge"
curl -fsSLo "$BASE/claude-bridge/claude-bridge.js" "$RAW/claude-bridge/claude-bridge.js" \
  && echo "✔ claude-bridge.js" || echo "✖ No se pudo bajar claude-bridge.js"

echo
echo "== 4. Puente de OpenAI (Codex) =="
mkdir -p "$BASE/codex-bridge"
curl -fsSLo "$BASE/codex-bridge/codex-bridge.js" "$RAW/codex-bridge/codex-bridge.js" \
  && echo "✔ codex-bridge.js" || echo "✖ No se pudo bajar codex-bridge.js"

echo
echo "== Pendiente a mano (una sola vez) =="
echo "  claude   → /login        (con tu suscripción de Claude)"
echo "  codex login              (con tu cuenta de ChatGPT)"
echo "  opencode → mandá 'hola' con un modelo gratis y salí"
echo
echo "== Arranque (cada vez, una terminal para cada uno; la contraseña la elegís vos) =="
echo "  cd \"$BASE/opencode-free\" && XDG_CONFIG_HOME=\"\$PWD/config-home\" OPENCODE_SERVER_PASSWORD='TuClave' opencode serve --port 4096 --hostname 127.0.0.1 --cors https://localhost:5173 --cors https://prompting-chat.vercel.app"
echo "  cd \"$BASE/claude-bridge\" && CLAUDE_BRIDGE_PASSWORD='TuClave' bun claude-bridge.js"
echo "  cd \"$BASE/codex-bridge\" && CODEX_BRIDGE_PASSWORD='TuClave' bun codex-bridge.js"

#!/usr/bin/env bash
# Instalador de Prompting para macOS: revisa los CLI (pregunta antes de
# instalar lo que falte), prepara las carpetas de los 3 puentes locales y
# agrega a ~/.zshrc los comandos zen-server, claude-server, codex-server,
# gemini-server y ollama-server (uno por terminal).
# Uso: curl -fsSL https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/install-mac.sh | bash
# (o descargarlo y correr: bash install-mac.sh). Se puede repetir: sirve
# también para actualizar claude-bridge.js, codex-bridge.js y gemini-bridge.js.
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
      "prompt": "Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos, no leas ni edites archivos y no uses herramientas. Si algo requiere información que no tenés, decilo. Si el usuario pide un mapa, una ubicación o una dirección, incluí un link de Google Maps en markdown con esa dirección en la búsqueda: la app lo muestra como mapa dentro del chat. No podés generar imágenes ni capturas de pantalla; si tenés la URL directa de una imagen pública real, mostrala como imagen markdown. Nunca inventes URLs de imágenes.",
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
echo "== 5. Puente de Gemini (Antigravity CLI) =="
mkdir -p "$BASE/gemini-bridge"
curl -fsSLo "$BASE/gemini-bridge/gemini-bridge.js" "$RAW/gemini-bridge/gemini-bridge.js" \
  && echo "✔ gemini-bridge.js" || echo "✖ No se pudo bajar gemini-bridge.js"
if ! command -v agy >/dev/null 2>&1; then
  echo "  Nota: Antigravity CLI (agy) no está instalado y este script no lo instala."
  echo "  Instalalo desde https://antigravity.google/ para usar Gemini (suscripción)."
fi


configurar_comandos() {
  # Bloque administrado en ~/.zshrc: al repetir el instalador se reemplaza
  # (nunca se duplica). La contraseña no va en ~/.zshrc: queda en
  # $BASE/password.txt (solo tu usuario la puede leer) y las funciones la
  # leen de ahí. PROMPTING_PASSWORD en el entorno evita la pregunta.
  local zshrc="$HOME/.zshrc"
  local pass_file="$BASE/password.txt"
  local marca_ini="# >>> prompting servers >>>"
  local marca_fin="# <<< prompting servers <<<"
  local clave="${PROMPTING_PASSWORD:-}"

  mkdir -p "$BASE"
  if [ -z "$clave" ]; then
    if [ -s "$pass_file" ]; then
      read -r -s -p "Contraseña de los servidores (Enter = conservar la actual): " clave </dev/tty || clave=""
    else
      read -r -s -p "Contraseña para los servidores (Enter = generar una): " clave </dev/tty || clave=""
    fi
    echo
  fi
  if [ -n "$clave" ]; then
    printf '%s' "$clave" > "$pass_file"
  elif [ ! -s "$pass_file" ]; then
    clave="$(LC_ALL=C tr -dc 'A-Za-z0-9' </dev/urandom | head -c 16)"
    printf '%s' "$clave" > "$pass_file"
    echo "  Contraseña generada: $clave"
  fi
  chmod 600 "$pass_file"

  touch "$zshrc"
  local tmp
  tmp="$(mktemp)"
  awk -v ini="$marca_ini" -v fin="$marca_fin" '
    $0 == ini { saltar = 1; next }
    $0 == fin { saltar = 0; next }
    !saltar { print }
  ' "$zshrc" > "$tmp"
  cat >> "$tmp" <<'BLOQUE'
# >>> prompting servers >>>
# Servidores locales de Prompting (uno por terminal). Generado por
# install-mac.sh: se reemplaza al volver a correrlo. La contraseña está en
# "$HOME/Library/Application Support/prompting/password.txt".
PROMPTING_DIR="$HOME/Library/Application Support/prompting"
prompting-password() { cat "$PROMPTING_DIR/password.txt"; }

# OpenCode Free (puerto 4096)
zen-server() {
  ( cd "$PROMPTING_DIR/opencode-free" && \
    XDG_CONFIG_HOME="$PWD/config-home" OPENCODE_SERVER_PASSWORD="$(prompting-password)" \
    opencode serve --port 4096 --hostname 127.0.0.1 \
      --cors https://localhost:5173 --cors https://prompting-chat.vercel.app )
}

# Claude (suscripción) (puerto 4098)
claude-server() {
  ( cd "$PROMPTING_DIR/claude-bridge" && \
    CLAUDE_BRIDGE_PASSWORD="$(prompting-password)" bun claude-bridge.js )
}

# OpenAI (suscripción) (puerto 4094)
codex-server() {
  ( cd "$PROMPTING_DIR/codex-bridge" && \
    CODEX_BRIDGE_PASSWORD="$(prompting-password)" bun codex-bridge.js )
}

# Gemini (suscripción) (puerto 4092)
gemini-server() {
  ( cd "$PROMPTING_DIR/gemini-bridge" && \
    GEMINI_BRIDGE_PASSWORD="$(prompting-password)" bun gemini-bridge.js )
}

# Ollama Cloud (puerto 11434), sin contraseña. Si la app de Ollama está
# abierta en la barra de arriba, ya ocupa el puerto: cerrala antes.
ollama-server() {
  OLLAMA_ORIGINS='https://localhost:5173,https://prompting-chat.vercel.app' ollama serve
}
# <<< prompting servers <<<
BLOQUE
  mv "$tmp" "$zshrc"
  echo "✔ Comandos agregados a $zshrc"
}

echo
echo "== 6. Comandos de la terminal =="
configurar_comandos

echo
echo "== Pendiente a mano (una sola vez) =="
echo "  claude   → /login        (con tu suscripción de Claude)"
echo "  codex login              (con tu cuenta de ChatGPT)"
echo "  agy                      (con tu cuenta de Google AI Pro)"
echo "  ollama signin            (si vas a usar Ollama Cloud: instalá Ollama desde https://ollama.com)"
echo "  opencode → mandá 'hola' con un modelo gratis y salí"
echo
echo "== Arranque (cada vez, una terminal para cada uno) =="
echo "  Abrí una terminal nueva (o corré: source ~/.zshrc) y usá:"
echo "    zen-server      OpenCode Free (4096)"
echo "    claude-server   Claude (suscripción) (4098)"
echo "    codex-server    OpenAI (suscripción) (4094)"
echo "    gemini-server   Gemini (suscripción) (4092)"
echo "    ollama-server   Ollama Cloud (11434)"
echo "  En la app, cada proveedor lleva la contraseña de los servidores"
echo "  (para verla: prompting-password)."

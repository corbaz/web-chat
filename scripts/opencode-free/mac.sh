#!/usr/bin/env bash
# Instalador de OpenCode Free para macOS (sin Bun ni el repo).
#
#   bash mac.sh                 instala (o reinstala) y deja el servidor corriendo
#   bash mac.sh password        copia la contraseña al portapapeles
#   bash mac.sh password CLAVE  cambia la contraseña y reinicia el servidor
#   bash mac.sh uninstall       quita el arranque automático y detiene el servidor
#
# Arranca `opencode serve` en una carpeta propia, con un agente "chat" y
# permisos "ask" (OpenCode solo sirve los modelos gratis a pedidos con
# herramientas declaradas), y lo registra como LaunchAgent para que arranque
# solo al iniciar sesión.

set -euo pipefail

PORT=4096
HOST=127.0.0.1
LABEL="com.prompting.opencode-free"
DIR="$HOME/Library/Application Support/prompting/opencode-free"
CONFIG_HOME="$DIR/config-home"
PASSWORD_FILE="$DIR/password.txt"
PLIST="$HOME/Library/LaunchAgents/$LABEL.plist"
LOG="$DIR/server.log"
URL="http://$HOST:$PORT"

find_opencode() {
  command -v opencode 2>/dev/null && return
  for candidate in "$HOME/.opencode/bin/opencode" "/opt/homebrew/bin/opencode" "/usr/local/bin/opencode" "$HOME/.bun/bin/opencode"; do
    if [ -x "$candidate" ]; then echo "$candidate"; return; fi
  done
}

# Mismas reglas en los tres instaladores (Bun, windows.bat, mac.sh): sin
# espacios, comillas ni caracteres que rompan el .bat o el plist (XML).
PASSWORD_PATTERN='^[A-Za-z0-9._*@#+=?-]{6,}$'
valid_password() {
  [[ "$1" =~ $PASSWORD_PATTERN ]]
}

write_config() {
  mkdir -p "$CONFIG_HOME"
  cat > "$DIR/opencode.json" <<'EOF'
{
  "$schema": "https://opencode.ai/config.json",
  "default_agent": "chat",
  "agent": {
    "chat": {
      "mode": "primary",
      "description": "Asistente de chat general",
      "prompt": "Sos un asistente de chat general dentro de una app web. Respondé directamente con tu conocimiento, en el idioma del usuario. No ejecutes comandos, no leas ni edites archivos y no uses herramientas: el usuario no está programando en esta máquina. Si algo requiere información que no tenés, decilo. Si el usuario pide un mapa, una ubicación o una dirección, incluí un link de Google Maps en markdown con esa dirección en la búsqueda: la app lo muestra como mapa dentro del chat. No podés generar imágenes ni capturas de pantalla; si tenés la URL directa de una imagen pública real, mostrala como imagen markdown. Nunca inventes URLs de imágenes.",
      "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
    }
  },
  "permission": { "bash": "ask", "edit": "ask", "webfetch": "ask", "external_directory": "ask" }
}
EOF
}

ensure_password() {
  if [ -s "$PASSWORD_FILE" ]; then
    tr -d '\r\n' < "$PASSWORD_FILE"
  else
    local generated
    generated="$(openssl rand -hex 18)"
    printf '%s' "$generated" > "$PASSWORD_FILE"
    printf '%s' "$generated"
  fi
}

write_plist() {
  local opencode_bin="$1" password="$2"
  mkdir -p "$HOME/Library/LaunchAgents"
  cat > "$PLIST" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>$LABEL</string>
  <key>ProgramArguments</key>
  <array>
    <string>$opencode_bin</string>
    <string>serve</string>
    <string>--port</string><string>$PORT</string>
    <string>--hostname</string><string>$HOST</string>
    <string>--cors</string><string>https://localhost:5173</string>
    <string>--cors</string><string>https://prompting-chat.vercel.app</string>
  </array>
  <key>WorkingDirectory</key><string>$DIR</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>OPENCODE_SERVER_PASSWORD</key><string>$password</string>
    <key>XDG_CONFIG_HOME</key><string>$CONFIG_HOME</string>
    <key>PATH</key><string>$(dirname "$opencode_bin"):/usr/local/bin:/opt/homebrew/bin:/usr/bin:/bin</string>
  </dict>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>StandardOutPath</key><string>$LOG</string>
  <key>StandardErrorPath</key><string>$LOG</string>
</dict>
</plist>
EOF
  chmod 600 "$PLIST"
}

stop_agent() {
  launchctl bootout "gui/$(id -u)/$LABEL" 2>/dev/null || true
}

start_agent() {
  stop_agent
  launchctl bootstrap "gui/$(id -u)" "$PLIST"
}

wait_health() {
  local password="$1"
  for _ in $(seq 1 30); do
    if curl -fsS -u "opencode:$password" "$URL/global/health" 2>/dev/null | grep -q '"healthy":true'; then
      return 0
    fi
    sleep 1
  done
  return 1
}

copy_password() {
  printf '%s' "$1" | pbcopy
  echo "Contraseña copiada al portapapeles (${#1} caracteres). Pegala en la app con Cmd+V."
}

install() {
  local opencode_bin
  opencode_bin="$(find_opencode || true)"
  if [ -z "$opencode_bin" ]; then
    echo "OpenCode no está instalado. Instalalo con:"
    echo "  curl -fsSL https://opencode.ai/install | bash"
    echo "Abrilo una vez con 'opencode', mandá un mensaje con un modelo gratis y volvé a correr este script."
    exit 1
  fi

  mkdir -p "$DIR"
  write_config
  local password
  password="$(ensure_password)"
  if ! valid_password "$password"; then
    echo "La contraseña guardada en $PASSWORD_FILE tiene caracteres no permitidos."
    echo "Elegí otra con: bash mac.sh password NUEVA_CLAVE (letras, números o . _ - * @ # + = ?)."
    exit 1
  fi
  write_plist "$opencode_bin" "$password"
  start_agent

  if wait_health "$password"; then
    echo ""
    echo "OpenCode Free instalado y corriendo (arranca solo al iniciar sesión)."
    echo "Servidor: $URL"
    copy_password "$password"
    echo "En la app: elegí OpenCode Free, pegá la contraseña y tocá Guardar contraseña."
  else
    echo "El servidor no respondió en $URL. Revisá el log: $LOG"
    exit 1
  fi
}

set_password() {
  local new_password="$1"
  if ! valid_password "$new_password"; then
    echo "La contraseña debe tener al menos 6 caracteres: letras, números o . _ - * @ # + = ?"
    exit 1
  fi
  printf '%s' "$new_password" > "$PASSWORD_FILE"
  install
}

uninstall() {
  stop_agent
  rm -f "$PLIST"
  echo "OpenCode Free quitado: ya no arranca al iniciar sesión y el servidor se detuvo."
  echo "La carpeta $DIR se conserva (borrala a mano si querés una contraseña nueva)."
}

case "${1:-install}" in
  install) install ;;
  password)
    if [ -n "${2:-}" ]; then
      set_password "$2"
    elif [ -s "$PASSWORD_FILE" ]; then
      copy_password "$(tr -d '\r\n' < "$PASSWORD_FILE")"
    else
      echo "Todavía no hay contraseña. Corré primero: bash mac.sh"
      exit 1
    fi
    ;;
  uninstall) uninstall ;;
  *)
    echo "Uso: bash mac.sh [install | password [CLAVE] | uninstall]"
    exit 1
    ;;
esac

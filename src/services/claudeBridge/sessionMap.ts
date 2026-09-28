// Mapa chat de la app -> sessionId de Claude Code, persistido en
// localStorage. El bridge (--resume) mantiene el historial del lado del
// proceso `claude` por sessionId: la app solo necesita recordar qué
// sessionId le corresponde a cada chat local para reusarlo (ver Scope en
// odd/tasks/claude-subscription-bridge.md).

const STORAGE_KEY = 'claudecodeSessions:v1'

function readMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, string>)
      : {}
  } catch {
    return {}
  }
}

export function getClaudeCodeSessionId(chatId: string): string | undefined {
  return readMap()[chatId]
}

export function setClaudeCodeSessionId(
  chatId: string,
  sessionId: string,
): void {
  try {
    const map = readMap()
    map[chatId] = sessionId
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Sin localStorage disponible; la sesión solo dura en memoria para este chat.
  }
}

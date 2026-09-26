// Mapa chat de la app -> sesión de OpenCode Free, persistido en localStorage.
// OpenCode mantiene el historial del lado del servidor por sesión: la app
// solo necesita recordar qué sessionID le corresponde a cada chat local para
// reusarlo (ver T3 en odd/tasks/opencode-free-local.md).

const STORAGE_KEY = 'opencodefreeSessions:v1'

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

export function getOpenCodeFreeSessionId(chatId: string): string | undefined {
  return readMap()[chatId]
}

export function setOpenCodeFreeSessionId(
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

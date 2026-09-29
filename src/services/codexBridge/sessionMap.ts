// Mapa chat de la app -> threadId de Codex, persistido en localStorage. El
// bridge mantiene el historial del lado de `codex app-server` por threadId
// (`thread/resume`): la app solo necesita recordar qué threadId le
// corresponde a cada chat local para reusarlo. Espejo de
// services/claudeBridge/sessionMap.ts.

const STORAGE_KEY = 'codexsubSessions:v1'

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

export function getCodexSessionId(chatId: string): string | undefined {
  return readMap()[chatId]
}

export function setCodexSessionId(chatId: string, sessionId: string): void {
  try {
    const map = readMap()
    map[chatId] = sessionId
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Sin localStorage disponible; la sesión solo dura en memoria para este chat.
  }
}

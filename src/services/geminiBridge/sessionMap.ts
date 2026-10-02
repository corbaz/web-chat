// Mapa chat de la app -> conversation_id de agy, persistido en localStorage.
// El bridge mantiene el historial del lado de agy por conversación
// (`--conversation <id>`): la app solo recuerda qué id le corresponde a cada
// chat local. Espejo de services/codexBridge/sessionMap.ts.

const STORAGE_KEY = 'geminisubSessions:v1'

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

export function getGeminiSubSessionId(chatId: string): string | undefined {
  return readMap()[chatId]
}

export function setGeminiSubSessionId(chatId: string, sessionId: string): void {
  try {
    const map = readMap()
    map[chatId] = sessionId
    localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
  } catch {
    // Sin localStorage disponible; la sesión solo dura en memoria para este chat.
  }
}

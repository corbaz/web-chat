// Cliente puro del bridge local de Gemini (suscripción de Google AI Pro vía
// Antigravity CLI `agy`, ver odd/tasks/gemini-subscription-bridge.md y
// scripts/gemini-bridge/server.ts). Sin dependencias nuevas (fetch nativo),
// sin acceso a localStorage/window: recibe baseUrl+password explícitos.
//
// Contrato: Basic auth, usuario "gemini". GET /health -> {healthy,
// agyVersion}. GET /models -> [{id, name}]. POST /chat {model, message,
// sessionId?} -> {text, sessionId, model, tokens:{input,output}, isError,
// error?}.

function authHeader(password: string): Record<string, string> {
  return { Authorization: `Basic ${btoa(`gemini:${password}`)}` }
}

async function request<T>(
  baseUrl: string,
  path: string,
  password: string,
  init: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: {
      ...authHeader(password),
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      ...(init.headers as Record<string, string> | undefined),
    },
  })

  if (!res.ok) {
    let message = `HTTP ${res.status}`
    try {
      const data: unknown = await res.json()
      const extracted = extractErrorMessage(data)
      if (extracted) message = extracted
    } catch {
      // Cuerpo no era JSON parseable; se conserva el mensaje HTTP genérico.
    }
    throw new Error(message)
  }

  return (await res.json()) as T
}

function extractErrorMessage(data: unknown): string | null {
  if (!data || typeof data !== 'object') return null
  const record = data as { error?: unknown }
  return typeof record.error === 'string' ? record.error : null
}

export async function health(
  baseUrl: string,
  password: string,
): Promise<boolean> {
  try {
    const data = await request<{ healthy?: boolean }>(
      baseUrl,
      '/health',
      password,
    )
    return data?.healthy === true
  } catch {
    return false
  }
}

export type ServerCheck = 'ok' | 'unauthorized' | 'unreachable'

export async function checkServer(
  baseUrl: string,
  password: string,
): Promise<ServerCheck> {
  try {
    const res = await fetch(`${baseUrl}/health`, {
      headers: authHeader(password),
    })
    if (res.status === 401) return 'unauthorized'
    if (!res.ok) return 'unreachable'
    const data = (await res.json()) as { healthy?: boolean }
    return data?.healthy === true ? 'ok' : 'unreachable'
  } catch {
    return 'unreachable'
  }
}

export interface GeminiSubModelInfo {
  id: string
  name: string
}

export async function listModels(
  baseUrl: string,
  password: string,
): Promise<GeminiSubModelInfo[]> {
  const data = await request<GeminiSubModelInfo[]>(baseUrl, '/models', password)
  return Array.isArray(data) ? data : []
}

export interface GeminiSubChatResult {
  text: string
  sessionId: string
  model: string
  tokens: { input: number; output: number }
  isError: boolean
  error?: string
}

/**
 * Envía un mensaje al bridge. Solo se manda el último mensaje: agy mantiene
 * el historial por conversación (`--conversation`, ver Scope en el feature
 * doc). Sin imágenes ni PDF en v1.
 */
export async function sendMessage(
  baseUrl: string,
  password: string,
  model: string,
  message: string,
  sessionId?: string,
): Promise<GeminiSubChatResult> {
  return request<GeminiSubChatResult>(baseUrl, '/chat', password, {
    method: 'POST',
    body: JSON.stringify({ model, message, sessionId }),
  })
}

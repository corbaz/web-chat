// Cliente puro del bridge local de Claude (suscripción de Claude Code vía
// `claude -p`, ver odd/tasks/claude-subscription-bridge.md y
// scripts/claude-bridge/server.ts). Sin dependencias nuevas (fetch nativo),
// sin acceso a localStorage/window: recibe baseUrl+password explícitos, así
// que es testeable con un fetch mockeado (bun test, sin red real).
//
// Contrato: Basic auth, usuario "claude". GET /health -> {healthy, claudeVersion}.
// GET /models -> [{id, name}]. POST /chat {model, message, sessionId?, webSearch?}
// -> {text, sessionId, model, tokens:{input,output}, costUsd, isError, error?}.

function authHeader(password: string): Record<string, string> {
  const token = btoa(`claude:${password}`)
  return { Authorization: `Basic ${token}` }
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

/**
 * Diagnóstico para la UI: distingue contraseña incorrecta (el bridge
 * responde 401) de bridge apagado o bloqueado por CORS (fetch falla).
 */
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

export interface ClaudeCodeModelInfo {
  id: string
  name: string
}

export async function listModels(
  baseUrl: string,
  password: string,
): Promise<ClaudeCodeModelInfo[]> {
  const data = await request<ClaudeCodeModelInfo[]>(
    baseUrl,
    '/models',
    password,
  )
  return Array.isArray(data) ? data : []
}

export interface ClaudeChatResult {
  text: string
  sessionId: string
  model: string
  tokens: { input: number; output: number }
  costUsd: number
  isError: boolean
  error?: string
}

// Imagen adjunta (T5, visión): mismo shape que ImageAttachment de
// interfaces/chat/chatTypes.ts (mimeType/data), sin el `id` que solo usa la
// UI. El bridge valida mime PNG/JPEG/WEBP/GIF y hasta 4 imágenes.
export interface ClaudeChatImage {
  mimeType: string
  data: string
}

/**
 * Envía un mensaje al bridge. Solo se manda el último mensaje: Claude Code
 * mantiene el historial del lado del proceso por sessionId (--resume, ver
 * Scope en el feature doc). Con `images`, el bridge usa el modo stream-json
 * (visión, T5) en vez del modo `-p "<msg>"` normal.
 */
export async function sendMessage(
  baseUrl: string,
  password: string,
  model: string,
  message: string,
  sessionId?: string,
  webSearch?: boolean,
  effort?: string,
  images?: ClaudeChatImage[],
): Promise<ClaudeChatResult> {
  return request<ClaudeChatResult>(baseUrl, '/chat', password, {
    method: 'POST',
    body: JSON.stringify({
      model,
      message,
      sessionId,
      webSearch,
      effort,
      images,
    }),
  })
}

// Cliente puro del bridge local de Claude (suscripción de Claude Code vía
// `claude -p`, ver odd/tasks/claude-subscription-bridge.md y
// scripts/claude-bridge/server.ts). Sin dependencias nuevas (fetch nativo),
// sin acceso a localStorage/window: recibe baseUrl+password explícitos, así
// que es testeable con un fetch mockeado (bun test, sin red real).
//
// Contrato: Basic auth, usuario "claude". GET /health -> {healthy, claudeVersion}.
// GET /models -> [{id, name}]. POST /chat {model, message, sessionId?, effort?,
// images?, documents?, autoApprove?} -> {text, sessionId, model,
// tokens:{input,output}, costUsd, isError, error?}. T7: GET /permission ->
// [{id, sessionId, tool, command?, description?}], POST /permission/:id
// {decision: "allow"|"deny"}.

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

// PDF nativo adjunto (ver odd/tasks/file-attachments.md): mismo shape que
// DocumentAttachment de interfaces/chat/chatTypes.ts. El bridge valida mime
// application/pdf y hasta 4 documentos.
export interface ClaudeChatDocument {
  mimeType: string
  data: string
  filename: string
}

/**
 * Envía un mensaje al bridge. Solo se manda el último mensaje: Claude Code
 * mantiene el historial del lado del proceso por sessionId (--resume, ver
 * Scope en el feature doc). Con `images`/`documents`, se mandan en la misma
 * línea que el mensaje (visión T5, PDF nativo T-file-attachments). Búsqueda
 * web (WebSearch/WebFetch) ya no se pide por flag: el bridge siempre las
 * ofrece y las auto-aprueba (T7). `autoApprove` es el modo "YOLO" (toggle de
 * la app): auto-aprueba también Bash, sin pedir permiso.
 */
export async function sendMessage(
  baseUrl: string,
  password: string,
  model: string,
  message: string,
  sessionId?: string,
  effort?: string,
  images?: ClaudeChatImage[],
  documents?: ClaudeChatDocument[],
  autoApprove?: boolean,
): Promise<ClaudeChatResult> {
  return request<ClaudeChatResult>(baseUrl, '/chat', password, {
    method: 'POST',
    body: JSON.stringify({
      model,
      message,
      sessionId,
      effort,
      images,
      documents,
      autoApprove,
    }),
  })
}

// T7: permisos pendientes (Bash preguntándole al usuario).
export interface ClaudePendingPermission {
  id: string
  sessionId: string
  tool: string
  command?: string
  description?: string
}

export async function listPermissions(
  baseUrl: string,
  password: string,
): Promise<ClaudePendingPermission[]> {
  const data = await request<ClaudePendingPermission[]>(
    baseUrl,
    '/permission',
    password,
  )
  return Array.isArray(data) ? data : []
}

export async function respondPermission(
  baseUrl: string,
  password: string,
  id: string,
  decision: 'allow' | 'deny',
): Promise<void> {
  await request(baseUrl, `/permission/${encodeURIComponent(id)}`, password, {
    method: 'POST',
    body: JSON.stringify({ decision }),
  })
}

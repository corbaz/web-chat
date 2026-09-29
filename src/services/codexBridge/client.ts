// Cliente puro del bridge local de Codex (suscripción de ChatGPT vía `codex
// app-server`, ver odd/tasks/openai-subscription-bridge.md y
// scripts/codex-bridge/server.ts). Sin dependencias nuevas (fetch nativo),
// sin acceso a localStorage/window: recibe baseUrl+password explícitos, así
// que es testeable con un fetch mockeado. Espejo de
// services/claudeBridge/client.ts.
//
// Contrato: Basic auth, usuario "codex". GET /health -> {healthy,
// codexVersion}. GET /models -> [{id, name, vision, effortLevels,
// defaultEffort, isDefault}]. POST /chat {model, message, sessionId?,
// effort?, images?, autoApprove?} -> {text, sessionId, model,
// tokens:{input,output}, isError, error?}. GET /permission -> [{id,
// sessionId, tool, command?, description?}], POST /permission/:id
// {decision: "allow"|"deny"}.

function authHeader(password: string): Record<string, string> {
  const token = btoa(`codex:${password}`)
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

export interface CodexModelInfo {
  id: string
  name: string
  vision: boolean
  effortLevels: string[]
  defaultEffort: string
  isDefault: boolean
}

export async function listModels(
  baseUrl: string,
  password: string,
): Promise<CodexModelInfo[]> {
  const data = await request<CodexModelInfo[]>(baseUrl, '/models', password)
  return Array.isArray(data) ? data : []
}

export interface CodexChatResult {
  text: string
  sessionId: string
  model: string
  tokens: { input: number; output: number }
  isError: boolean
  error?: string
}

export interface CodexChatImage {
  mimeType: string
  data: string
}

/**
 * Envía un mensaje al bridge. Solo se manda el último mensaje: `codex
 * app-server` mantiene el historial del lado del proceso por threadId
 * (`thread/resume`, ver Scope en el feature doc). Sin `documents`: el
 * protocolo de Codex no tiene un tipo `document`/PDF nativo (ver Verified
 * facts), así que los PDF siempre viajan como texto extraído (pdf.js), igual
 * que en cualquier otro proveedor sin PDF nativo. `autoApprove` es el modo
 * "YOLO": auto-aprueba comandos sin preguntar (sandbox `workspace-write` del
 * lado del bridge, ver server.ts).
 */
export async function sendMessage(
  baseUrl: string,
  password: string,
  model: string,
  message: string,
  sessionId?: string,
  effort?: string,
  images?: CodexChatImage[],
  autoApprove?: boolean,
): Promise<CodexChatResult> {
  return request<CodexChatResult>(baseUrl, '/chat', password, {
    method: 'POST',
    body: JSON.stringify({
      model,
      message,
      sessionId,
      effort,
      images,
      autoApprove,
    }),
  })
}

export interface CodexPendingPermission {
  id: string
  sessionId: string
  tool: string
  command?: string
  description?: string
}

export async function listPermissions(
  baseUrl: string,
  password: string,
): Promise<CodexPendingPermission[]> {
  const data = await request<CodexPendingPermission[]>(
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

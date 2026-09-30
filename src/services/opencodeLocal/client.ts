// Cliente puro del servidor local `opencode serve` (T2, ver
// odd/tasks/opencode-free-local.md). Sin dependencias nuevas (fetch nativo),
// sin acceso a localStorage/window: recibe baseUrl+password explícitos, así
// que es testeable con un fetch mockeado (bun test, sin red real).
//
// Contrato verificado 2026-09-25/26 contra OpenCode 1.18.32:
// - Auth: Basic, usuario "opencode", password = OPENCODE_SERVER_PASSWORD.
// - GET /global/health -> {healthy:true, version}.
// - GET /config/providers -> {providers:[{id, models:{[modelId]:{...}}}]};
//   los modelos gratis viven bajo el provider id "opencode" (ids que
//   terminan en "-free", más "big-pickle"; se excluyen los "jev-*").
// - POST /session {title} -> {id}.
// - POST /session/:id/message {model:{providerID,modelID}, parts:[...]}
//   bloquea hasta la respuesta -> {info:{tokens,error?}, parts:[...]}.
// - GET /permission -> pendientes de la sesión; mientras haya una pendiente,
//   el POST de arriba sigue bloqueado. Se responde con
//   POST /session/:sessionID/permissions/:permissionID {response}.

import { permissionFromEvent, splitSseEvents } from './permissionEvents'

const FREE_PROVIDER_ID = 'opencode'
const EXCLUDED_ID_PREFIX = 'jev-'
const PERMISSION_POLL_MS = 1000

export function isFreeModelId(id: string): boolean {
  if (id.startsWith(EXCLUDED_ID_PREFIX)) return false
  return id.endsWith('-free') || id === 'big-pickle'
}

export interface SendMessageTokens {
  input: number
  output: number
  reasoning: number
  cacheRead: number
  cacheWrite: number
}

export interface SendMessageResult {
  text: string
  tokens: SendMessageTokens
}

export interface PendingPermission {
  id: string
  sessionID: string
  permission: string
  patterns?: string[]
  metadata?: { command?: string; [key: string]: unknown }
  tool?: Record<string, unknown>
}

export type PermissionResponse = 'reject' | 'once'

export interface SendMessageOptions {
  onPermission: (
    permission: PendingPermission,
  ) => Promise<PermissionResponse> | PermissionResponse
}

export function authHeader(password: string): Record<string, string> {
  // btoa asume password/usuario ASCII (contraseña generada en hex, ver
  // scripts/opencode-free/config.ts): seguro para Basic auth.
  const token = btoa(`opencode:${password}`)
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
  const record = data as { message?: unknown; data?: { message?: unknown } }
  if (typeof record.data?.message === 'string') return record.data.message
  if (typeof record.message === 'string') return record.message
  return null
}

export async function health(
  baseUrl: string,
  password: string,
): Promise<boolean> {
  try {
    const data = await request<{ healthy?: boolean }>(
      baseUrl,
      '/global/health',
      password,
    )
    return data?.healthy === true
  } catch {
    return false
  }
}

export type ServerCheck = 'ok' | 'unauthorized' | 'unreachable'

/**
 * Diagnóstico para la UI: distingue contraseña incorrecta (el servidor
 * responde 401) de servidor apagado o bloqueado por CORS (fetch falla).
 */
export async function checkServer(
  baseUrl: string,
  password: string,
): Promise<ServerCheck> {
  try {
    const res = await fetch(`${baseUrl}/global/health`, {
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

interface ProvidersResponse {
  providers?: Array<{ id: string; models?: Record<string, unknown> }>
}

/** IDs de modelos gratis (`-free`, `big-pickle`) bajo el provider "opencode". */
export async function listFreeModels(
  baseUrl: string,
  password: string,
): Promise<string[]> {
  const data = await request<ProvidersResponse>(
    baseUrl,
    '/config/providers',
    password,
  )
  const provider = data?.providers?.find((p) => p.id === FREE_PROVIDER_ID)
  if (!provider?.models) return []
  return Object.keys(provider.models).filter(isFreeModelId)
}

export async function createSession(
  baseUrl: string,
  password: string,
  title: string,
): Promise<string> {
  const data = await request<{ id: string }>(baseUrl, '/session', password, {
    method: 'POST',
    body: JSON.stringify({ title }),
  })
  return data.id
}

async function listPendingPermissions(
  baseUrl: string,
  password: string,
  sessionId: string,
): Promise<PendingPermission[]> {
  const data = await request<PendingPermission[]>(
    baseUrl,
    '/permission',
    password,
  )
  return (Array.isArray(data) ? data : []).filter(
    (permission) => permission.sessionID === sessionId,
  )
}

async function respondPermission(
  baseUrl: string,
  password: string,
  sessionId: string,
  permissionId: string,
  response: PermissionResponse,
): Promise<void> {
  await request(
    baseUrl,
    `/session/${sessionId}/permissions/${permissionId}`,
    password,
    {
      method: 'POST',
      body: JSON.stringify({ response }),
    },
  )
}

/**
 * Escucha `GET /event` (text/event-stream) y avisa cada `permission.asked` de
 * esta sesión (ver permissionEvents.ts). Con fetch y no EventSource porque
 * hace falta el header de Basic auth. Se corta con `signal`; cualquier error
 * de red termina en silencio (el sondeo de `/permission` sigue como respaldo).
 */
async function watchPermissionEvents(
  baseUrl: string,
  password: string,
  sessionId: string,
  signal: AbortSignal,
  onPermission: (permission: PendingPermission) => void,
): Promise<void> {
  try {
    const res = await fetch(`${baseUrl}/event`, {
      headers: authHeader(password),
      signal,
    })
    if (!res.ok || !res.body) return
    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    while (!signal.aborted) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const { events, rest } = splitSseEvents(buffer)
      buffer = rest
      for (const data of events) {
        const permission = permissionFromEvent(data, sessionId)
        if (permission) onPermission(permission)
      }
    }
  } catch {
    // Abortado al terminar el mensaje, o el servidor cortó el stream.
  }
}

const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms))

interface MessageResponse {
  info?: {
    tokens?: {
      input?: number
      output?: number
      reasoning?: number
      cache?: { read?: number; write?: number }
    }
    error?: { name?: string; data?: { message?: string } }
  }
  parts?: Array<{ type?: string; text?: string }>
}

/**
 * Envía un mensaje y bloquea hasta la respuesta. Mientras espera, escucha los
 * permisos por el stream de eventos (`GET /event`) y además sondea
 * `GET /permission` cada ~1s como respaldo; cada permiso nuevo se resuelve una
 * sola vez con `onPermission` (que decide 'reject' | 'once').
 */
export async function sendMessage(
  baseUrl: string,
  password: string,
  sessionId: string,
  modelId: string,
  text: string,
  options: SendMessageOptions,
): Promise<SendMessageResult> {
  const seen = new Set<string>()
  let polling = true
  const events = new AbortController()

  const handlePermission = async (
    permission: PendingPermission,
  ): Promise<void> => {
    if (seen.has(permission.id)) return
    seen.add(permission.id)
    const response = await options.onPermission(permission)
    try {
      await respondPermission(
        baseUrl,
        password,
        sessionId,
        permission.id,
        response,
      )
    } catch {
      // Falló la respuesta (red/servidor): se reintenta cuando el sondeo o
      // el stream lo vuelvan a mostrar, tratándolo como si no se hubiera visto.
      seen.delete(permission.id)
    }
  }

  const eventsLoop = watchPermissionEvents(
    baseUrl,
    password,
    sessionId,
    events.signal,
    (permission) => {
      void handlePermission(permission)
    },
  )

  const pollLoop = (async () => {
    while (polling) {
      await sleep(PERMISSION_POLL_MS)
      if (!polling) break

      let pending: PendingPermission[]
      try {
        pending = await listPendingPermissions(baseUrl, password, sessionId)
      } catch {
        continue
      }

      for (const permission of pending) {
        await handlePermission(permission)
      }
    }
  })()

  try {
    const data = await request<MessageResponse>(
      baseUrl,
      `/session/${sessionId}/message`,
      password,
      {
        method: 'POST',
        body: JSON.stringify({
          model: { providerID: FREE_PROVIDER_ID, modelID: modelId },
          parts: [{ type: 'text', text }],
        }),
      },
    )

    if (data.info?.error) {
      throw new Error(
        data.info.error.data?.message ||
          data.info.error.name ||
          'Error desconocido de OpenCode',
      )
    }

    const responseText = (data.parts ?? [])
      .filter(
        (part): part is { type: string; text: string } =>
          part.type === 'text' && typeof part.text === 'string',
      )
      .map((part) => part.text)
      .join('')

    const tokens = data.info?.tokens
    return {
      text: responseText,
      tokens: {
        input: tokens?.input ?? 0,
        output: tokens?.output ?? 0,
        reasoning: tokens?.reasoning ?? 0,
        cacheRead: tokens?.cache?.read ?? 0,
        cacheWrite: tokens?.cache?.write ?? 0,
      },
    }
  } finally {
    polling = false
    events.abort()
    await Promise.all([pollLoop, eventsLoop])
  }
}

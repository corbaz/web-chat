// Permisos de OpenCode Free por el stream de eventos (`GET /event`,
// text/event-stream). Motivo: en OpenCode 1.18.33, apenas hay un permiso
// pendiente de `webfetch`, `GET /permission` responde 400 ("Expected JSON
// value, got undefined at [0].metadata.timeout") y el sondeo nunca lo ve: el
// mensaje queda colgado esperando una respuesta que no llega. El evento
// `permission.asked` trae el mismo pedido (id, sessionID, permission,
// patterns, metadata) y se contesta con el endpoint de siempre. Verificado en
// vivo 2026-09-29 (ver odd/tasks/opencode-free-local.md).

import type { PendingPermission } from './client'

/**
 * Separa un buffer de SSE en los `data:` de cada evento completo (bloques
 * terminados en línea vacía) y devuelve lo que queda sin terminar.
 */
export function splitSseEvents(buffer: string): {
  events: string[]
  rest: string
} {
  const normalized = buffer.replace(/\r\n/g, '\n')
  const blocks = normalized.split('\n\n')
  const rest = blocks.pop() ?? ''
  const events = blocks
    .map((block) =>
      block
        .split('\n')
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart())
        .join('\n'),
    )
    .filter((data) => data.length > 0)
  return { events, rest }
}

/** Pedido de permiso de ESTA sesión en un evento, o null. */
export function permissionFromEvent(
  data: string,
  sessionId: string,
): PendingPermission | null {
  let event: { type?: unknown; properties?: Record<string, unknown> }
  try {
    event = JSON.parse(data)
  } catch {
    return null
  }
  if (event.type !== 'permission.asked') return null
  const props = event.properties
  if (!props || props.sessionID !== sessionId) return null
  if (typeof props.id !== 'string' || typeof props.permission !== 'string') {
    return null
  }
  return {
    id: props.id,
    sessionID: sessionId,
    permission: props.permission,
    patterns: Array.isArray(props.patterns)
      ? props.patterns.filter((p): p is string => typeof p === 'string')
      : undefined,
    metadata:
      props.metadata && typeof props.metadata === 'object'
        ? (props.metadata as PendingPermission['metadata'])
        : undefined,
  }
}

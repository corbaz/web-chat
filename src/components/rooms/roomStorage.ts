// Persistencia de las salas de chat (T1, ver odd/tasks/chat-rooms.md). Puro:
// no toca React ni el DOM más allá de un Storage inyectado, así que se puede
// testear con un stub en memoria (bun test no trae localStorage real).

// Cantidad fija de salas: 10 cajitas numeradas 1..10, sala 1 siempre abierta.
export const ROOM_COUNT = 10

const ROOMS_STORAGE_KEY = 'rooms:v1'

// Estado persistido de una sala: proveedor/modelo elegidos y el chat actual
// (si ya tiene uno). `chatId` queda undefined para una sala recién creada
// (deja que arranque su propio chat nuevo) o para la sala 1 migrada desde las
// claves legacy (deja que el efecto de inicialización existente de
// ChatContainer elija el último chat del historial, igual que hoy).
export interface RoomEntry {
  provider: string
  model: string
  chatId?: string
}

export interface RoomsState {
  active: number
  opened: number[]
  rooms: Record<number, RoomEntry>
}

// Subconjunto de la interfaz Storage que en realidad se usa acá, para poder
// pasar un stub en los tests sin depender de lib.dom.
export interface StorageLike {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

const getDefaultStorage = (): StorageLike | undefined =>
  typeof globalThis.localStorage === 'undefined'
    ? undefined
    : globalThis.localStorage

function isRoomEntry(value: unknown): value is RoomEntry {
  if (!value || typeof value !== 'object') return false
  const entry = value as Record<string, unknown>
  if (typeof entry.provider !== 'string' || typeof entry.model !== 'string') {
    return false
  }
  return entry.chatId === undefined || typeof entry.chatId === 'string'
}

function isRoomsState(value: unknown): value is RoomsState {
  if (!value || typeof value !== 'object') return false
  const state = value as Record<string, unknown>
  if (typeof state.active !== 'number') return false
  if (
    !Array.isArray(state.opened) ||
    !state.opened.every((id) => typeof id === 'number')
  ) {
    return false
  }
  if (!state.rooms || typeof state.rooms !== 'object') return false
  return Object.values(state.rooms as Record<string, unknown>).every(
    isRoomEntry,
  )
}

// Migración: si todavía no existe `rooms:v1`, la sala 1 toma el
// proveedor/modelo de las claves legacy `selectedProvider`/`selectedModel`
// (single-room de antes de esta funcionalidad). Si tampoco hay claves
// legacy (primera visita), `provider`/`model` quedan en '': ChatRoom resuelve
// el default real (escanea API keys guardadas / consulta el catálogo, que
// este módulo no conoce) con el mismo criterio que usaba App antes de esta
// funcionalidad.
function defaultRoomsState(storage: StorageLike | undefined): RoomsState {
  const legacyProvider = storage?.getItem('selectedProvider') || ''
  const legacyModel = storage?.getItem('selectedModel') || ''
  return {
    active: 1,
    opened: [1],
    rooms: {
      1: { provider: legacyProvider, model: legacyModel },
    },
  }
}

// Lee `rooms:v1`, con migración desde las claves legacy si no existe y
// saneamiento si el JSON está corrupto o tiene una forma inesperada (nunca
// lanza). La sala 1 siempre queda en `opened`, y `active` siempre es una sala
// abierta.
export function readRoomsState(
  storage: StorageLike | undefined = getDefaultStorage(),
): RoomsState {
  try {
    const raw = storage?.getItem(ROOMS_STORAGE_KEY)
    if (!raw) return defaultRoomsState(storage)

    const parsed: unknown = JSON.parse(raw)
    if (!isRoomsState(parsed)) return defaultRoomsState(storage)

    const opened = parsed.opened.includes(1)
      ? parsed.opened
      : [1, ...parsed.opened]
    const active = opened.includes(parsed.active) ? parsed.active : opened[0]
    return { active, opened, rooms: parsed.rooms }
  } catch (error) {
    console.error('Error al leer el estado de las salas:', error)
    return defaultRoomsState(storage)
  }
}

export function writeRoomsState(
  state: RoomsState,
  storage: StorageLike | undefined = getDefaultStorage(),
): void {
  try {
    storage?.setItem(ROOMS_STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    console.error('Error al guardar el estado de las salas:', error)
  }
}

// ── Indicadores de la cajita (T4/T5) ────────────────────────────────────────

export interface RoomIndicatorStatus {
  isLoading?: boolean
  unread?: boolean
  permissionPending?: boolean
}

export type RoomIndicator = 'permission' | 'loading' | 'unread' | 'none'

// Prioridad cuando hay más de un indicador activo a la vez: un permiso
// pendiente es lo más urgente (bloquea la conversación), después "está
// pensando", y por último la respuesta sin leer.
export function resolveRoomIndicator(
  status: RoomIndicatorStatus,
): RoomIndicator {
  if (status.permissionPending) return 'permission'
  if (status.isLoading) return 'loading'
  if (status.unread) return 'unread'
  return 'none'
}

// Texto del tooltip de una cajita: "Sala N · <título> · <modelo>" si la sala
// ya tiene un chat, o "Sala N · vacía" si nunca se abrió.
export function describeRoomTooltip(
  roomId: number,
  chatTitle: string | undefined,
  model: string | undefined,
): string {
  if (!chatTitle) return `Sala ${roomId} · vacía`
  return model
    ? `Sala ${roomId} · ${chatTitle} · ${model}`
    : `Sala ${roomId} · ${chatTitle}`
}

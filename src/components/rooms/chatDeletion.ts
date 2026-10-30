// Qué hace cada sala cuando se borran chats del historial. Borrar no crea un
// chat nuevo: la sala que tenía abierto un chat borrado pasa al chat más
// reciente que no esté abierto en otra sala (si no queda ninguno libre, ahí
// sí arranca uno nuevo). Si no queda ningún chat (se borró el último, o se
// borraron todos), se reinicia: solo la sala 1, con un chat nuevo.

import type { RoomsState } from './roomStorage'

export type ChatDeletionPlan =
  | { kind: 'reset' }
  // Sala -> chat que pasa a mostrar (null: chat nuevo).
  | { kind: 'reassign'; assignments: Record<number, string | null> }

export function planChatDeletion(
  state: RoomsState,
  history: ReadonlyArray<{ id: string; date: Date | string }>,
  deletedIds: readonly string[],
): ChatDeletionPlan {
  const deleted = new Set(deletedIds)
  const remaining = history
    .filter((chat) => !deleted.has(chat.id))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
  if (remaining.length === 0) return { kind: 'reset' }

  const taken = new Set(
    state.opened
      .map((id) => state.rooms[id]?.chatId)
      .filter((chatId): chatId is string => !!chatId && !deleted.has(chatId)),
  )
  const assignments: Record<number, string | null> = {}
  for (const roomId of state.opened) {
    const chatId = state.rooms[roomId]?.chatId
    if (!chatId || !deleted.has(chatId)) continue
    const free = remaining.find((chat) => !taken.has(chat.id))
    assignments[roomId] = free?.id ?? null
    if (free) taken.add(free.id)
  }
  return { kind: 'reassign', assignments }
}

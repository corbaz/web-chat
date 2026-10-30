import { describe, expect, test } from 'bun:test'
import { planChatDeletion } from './chatDeletion'
import type { RoomsState } from './roomStorage'

const history = [
  { id: 'a', date: new Date('2026-10-01') },
  { id: 'b', date: new Date('2026-10-03') },
  { id: 'c', date: new Date('2026-10-02') },
]

const rooms = (
  opened: number[],
  chats: Record<number, string>,
): RoomsState => ({
  active: opened[0],
  opened,
  rooms: Object.fromEntries(
    opened.map((id) => [
      id,
      { provider: 'groq', model: 'm', chatId: chats[id] },
    ]),
  ),
})

describe('planChatDeletion', () => {
  test('borrar un chat que no está abierto no toca ninguna sala', () => {
    expect(planChatDeletion(rooms([1], { 1: 'b' }), history, ['a'])).toEqual({
      kind: 'reassign',
      assignments: {},
    })
  })

  test('la sala que lo tenía abierto pasa al chat más reciente libre, sin crear uno nuevo', () => {
    // Quedan b (más reciente, abierto en la sala 2) y c: la sala 1 va a c.
    expect(
      planChatDeletion(rooms([1, 2], { 1: 'a', 2: 'b' }), history, ['a']),
    ).toEqual({ kind: 'reassign', assignments: { 1: 'c' } })
  })

  test('dos salas afectadas no reciben el mismo chat', () => {
    const state = rooms([1, 2], { 1: 'a', 2: 'a' })
    expect(planChatDeletion(state, history, ['a'])).toEqual({
      kind: 'reassign',
      assignments: { 1: 'b', 2: 'c' },
    })
  })

  test('si todos los que quedan están abiertos en otras salas, crea uno nuevo (null)', () => {
    const state = rooms([1, 2, 3], { 1: 'a', 2: 'b', 3: 'c' })
    expect(planChatDeletion(state, history, ['a'])).toEqual({
      kind: 'reassign',
      assignments: { 1: null },
    })
  })

  test('borrar el último chat reinicia: un chat nuevo en la sala 1', () => {
    expect(
      planChatDeletion(rooms([1, 3], { 1: 'a', 3: 'x' }), [history[0]], ['a']),
    ).toEqual({ kind: 'reset' })
  })

  test('borrar todos reinicia', () => {
    expect(
      planChatDeletion(rooms([1], { 1: 'a' }), history, ['a', 'b', 'c']),
    ).toEqual({ kind: 'reset' })
  })
})

// Las 10 cajitas de salas (T4, ver odd/tasks/chat-rooms.md), al lado del
// selector de modelo en el Header. Cada sala se monta la primera vez que se
// toca su cajita y sigue montada (ver ChatRoom); acá solo se dibujan los
// botones y sus indicadores, la lógica de qué sala está activa vive en App.

import type React from 'react'
import type { ColorPalette } from '../../interfaces/temas/temas'
import {
  describeRoomTooltip,
  ROOM_COUNT,
  type RoomIndicatorStatus,
  resolveRoomIndicator,
} from './roomStorage'

export interface RoomTabStatus extends RoomIndicatorStatus {
  chatTitle?: string
  model?: string
}

interface RoomTabsProps {
  theme: ColorPalette
  activeRoom: number
  statuses: Partial<Record<number, RoomTabStatus>>
  onSelectRoom: (roomId: number) => void
}

const ROOM_IDS = Array.from({ length: ROOM_COUNT }, (_, i) => i + 1)

const RoomTabs: React.FC<RoomTabsProps> = ({
  theme,
  activeRoom,
  statuses,
  onSelectRoom,
}) => {
  return (
    <div
      role="tablist"
      aria-label="Salas de chat"
      className="flex items-center gap-1 overflow-x-auto max-w-42 sm:max-w-55 xl:max-w-none px-1.5 py-2"
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: `${theme.accent} transparent`,
      }}
    >
      {ROOM_IDS.map((roomId) => {
        const status = statuses[roomId]
        const isActive = roomId === activeRoom
        const indicator = resolveRoomIndicator(status ?? {})

        return (
          <button
            key={roomId}
            type="button"
            role="tab"
            onClick={() => onSelectRoom(roomId)}
            title={describeRoomTooltip(
              roomId,
              status?.chatTitle,
              status?.model,
            )}
            aria-label={`Sala ${roomId}`}
            aria-selected={isActive}
            className="nm-press relative shrink-0 size-6 sm:size-7 rounded-md text-[11px] font-semibold flex items-center justify-center"
            style={{
              backgroundColor: theme.background,
              boxShadow: isActive ? theme.shadow.inset : theme.shadow.sm,
              color: isActive ? theme.accent : theme.textMuted,
            }}
          >
            {roomId}
            {indicator === 'permission' && (
              <span
                aria-hidden="true"
                className="absolute -top-1.5 -right-1.5 text-[10px] leading-none"
              >
                ⚠️
              </span>
            )}
            {indicator === 'loading' && (
              <span
                aria-hidden="true"
                className="absolute -top-1 -right-1 size-2 rounded-full animate-spin"
                style={{
                  border: `1.5px solid ${theme.accent}`,
                  borderTopColor: 'transparent',
                }}
              />
            )}
            {indicator === 'unread' && (
              <span
                aria-hidden="true"
                className="absolute -top-0.5 -right-0.5 size-1.5 rounded-full"
                style={{ backgroundColor: theme.accent }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}

export default RoomTabs

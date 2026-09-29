import { useCallback, useEffect, useState } from 'react'
import ApiKeyModal from './components/ApiKeyModal/ApiKeyModal.tsx'
import ChatRoom, {
  API_KEY_PROVIDER_IDS,
  isOpenCodeGatedProvider,
  pickInitialProvider,
} from './components/rooms/ChatRoom'
import RoomTabs, { type RoomTabStatus } from './components/rooms/RoomTabs'
import {
  type RoomEntry,
  type RoomsState,
  readRoomsState,
  writeRoomsState,
} from './components/rooms/roomStorage'
import { isOpenCodeAvailable } from './config/providers'
import { APP_VERSION } from './constants/appVersion'
import {
  CHAT_HISTORY_KEY,
  type ChatMessageType,
  STORAGE_KEY,
} from './interfaces/chat/chatTypes'
import { darkTheme, lightTheme } from './interfaces/temas/temas.tsx'
import { generateLayoutCSS } from './utils/layoutConstants'
import { setupMobileKeyboardHandler } from './utils/mobileUtils'

type ChatHistoryEntry = {
  id: string
  title: string
  date: Date
  model?: string
}

export const App = () => {
  // Estados para la UI
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const theme = isDarkTheme ? darkTheme : lightTheme

  const hasAnyApiKey = useCallback(
    () =>
      API_KEY_PROVIDER_IDS.some((p) => {
        if (isOpenCodeGatedProvider(p) && !isOpenCodeAvailable()) return false
        const key = localStorage.getItem(`${p}ApiKey`)
        return key && key.trim() !== ''
      }),
    [],
  )

  const [isApiKeySet, setIsApiKeySet] = useState(() => hasAnyApiKey())
  const [apiKeyModalReset, setApiKeyModalReset] = useState(0)

  // Historial de chats: compartido por las 10 salas (T2, ver
  // odd/tasks/chat-rooms.md), igual que antes solo había una.
  const [chatHistory, setChatHistory] = useState<ChatHistoryEntry[]>([])

  const handleUpdateChatHistory = useCallback(
    (value: React.SetStateAction<ChatHistoryEntry[]>) => {
      if (typeof value === 'function') {
        setChatHistory((prev) => {
          const newValue = value(prev)
          try {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newValue))
          } catch (error) {
            console.error('Error al guardar historial de chat:', error)
          }
          return newValue
        })
      } else {
        try {
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(value))
        } catch (error) {
          console.error('Error al guardar historial de chat:', error)
        }
        setChatHistory(value)
      }
    },
    [],
  )

  const handleUpdateChatTitle = useCallback(
    (chatId: string, newTitle: string) => {
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === chatId ? { ...chat, title: newTitle } : chat,
        ),
      )
    },
    [],
  )

  // Estado de las salas (T1/T2): cuál está activa, cuáles están abiertas
  // (montadas) y el proveedor/modelo/chat de cada una, persistido en
  // localStorage (`rooms:v1`).
  const [roomsState, setRoomsState] = useState<RoomsState>(() =>
    readRoomsState(),
  )
  useEffect(() => {
    writeRoomsState(roomsState)
  }, [roomsState])

  // Estado en vivo (no persistido) de cada sala: para los indicadores de la
  // cajita (T4/T5).
  const [roomStatuses, setRoomStatuses] = useState<
    Partial<Record<number, RoomTabStatus>>
  >({})
  const reportRoomStatus = useCallback(
    (roomId: number, status: RoomTabStatus) => {
      setRoomStatuses((prev) => {
        const existing = prev[roomId]
        if (
          existing &&
          existing.isLoading === status.isLoading &&
          existing.unread === status.unread &&
          existing.permissionPending === status.permissionPending &&
          existing.chatTitle === status.chatTitle &&
          existing.model === status.model
        ) {
          return prev
        }
        return { ...prev, [roomId]: status }
      })
    },
    [],
  )

  const handleRoomStateChange = useCallback(
    (roomId: number, entry: RoomEntry) => {
      setRoomsState((prev) => {
        const existing = prev.rooms[roomId]
        if (
          existing &&
          existing.provider === entry.provider &&
          existing.model === entry.model &&
          existing.chatId === entry.chatId
        ) {
          return prev
        }
        return { ...prev, rooms: { ...prev.rooms, [roomId]: entry } }
      })
    },
    [],
  )

  // Abre (si hace falta) y activa una sala al tocar su cajita (T4).
  const handleSelectRoom = useCallback((roomId: number) => {
    setRoomsState((prev) => {
      if (prev.active === roomId && prev.opened.includes(roomId)) return prev
      const opened = prev.opened.includes(roomId)
        ? prev.opened
        : [...prev.opened, roomId]
      return { ...prev, active: roomId, opened }
    })
  }, [])

  // T5: al elegir un chat del historial, si ya está abierto en OTRA sala se
  // activa esa sala en vez de duplicarlo; si no, se le pide a la sala que lo
  // pidió que lo abra ella misma.
  const [selectChatCommands, setSelectChatCommands] = useState<
    Partial<Record<number, { chatId: string; nonce: number }>>
  >({})
  const handleRequestSelectChat = useCallback(
    (requestingRoomId: number, chatId: string) => {
      const otherRoomId = roomsState.opened.find(
        (id) =>
          id !== requestingRoomId && roomsState.rooms[id]?.chatId === chatId,
      )
      if (otherRoomId !== undefined) {
        setRoomsState((prev) => ({ ...prev, active: otherRoomId }))
        return
      }
      setSelectChatCommands((prev) => ({
        ...prev,
        [requestingRoomId]: { chatId, nonce: Date.now() },
      }))
    },
    [roomsState],
  )

  // T5: si se borra un chat que está abierto en alguna sala (la que pidió
  // borrarlo u otra), esa sala arranca un chat nuevo.
  const [newChatCommands, setNewChatCommands] = useState<
    Partial<Record<number, number>>
  >({})
  const handleDeleteChat = useCallback(
    (chatIdToDelete: string) => {
      if (!chatIdToDelete) return

      try {
        const storedConversations = localStorage.getItem(STORAGE_KEY)
        if (storedConversations) {
          const conversations: Record<string, ChatMessageType[]> =
            JSON.parse(storedConversations)
          delete conversations[chatIdToDelete]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
        }
      } catch (error) {
        console.error('Error al eliminar chat:', error)
      }

      handleUpdateChatHistory((prev) =>
        prev.filter((chat) => chat.id !== chatIdToDelete),
      )

      const affectedRooms = roomsState.opened.filter(
        (id) => roomsState.rooms[id]?.chatId === chatIdToDelete,
      )
      if (affectedRooms.length > 0) {
        setNewChatCommands((prev) => {
          const next = { ...prev }
          for (const id of affectedRooms) next[id] = Date.now() + id
          return next
        })
      }
    },
    [roomsState, handleUpdateChatHistory],
  )

  // Reaccionar a cambios en API keys (guardar o borrar)
  useEffect(() => {
    const handleApiKeyChange = () => {
      const hasKey = hasAnyApiKey()
      setIsApiKeySet(hasKey)
      if (!hasKey) {
        setApiKeyModalReset((prev) => prev + 1) // fuerza re-montar el modal
      }
    }

    window.addEventListener('apikey-changed', handleApiKeyChange)
    return () => {
      window.removeEventListener('apikey-changed', handleApiKeyChange)
    }
  }, [hasAnyApiKey])

  // Inyectar las variables CSS de layout y actualizar el título del documento
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.setAttribute('id', 'layout-constants-css')
    styleElement.textContent = generateLayoutCSS()
    document.head.appendChild(styleElement)

    document.title = `PROMPTING ${APP_VERSION}`

    return () => {
      const existingStyle = document.getElementById('layout-constants-css')
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prevIsDark) => !prevIsDark)
  }, [])

  // Configurar el manejador del teclado para dispositivos móviles
  useEffect(() => {
    setupMobileKeyboardHandler()

    const htmlElement = document.documentElement
    const bodyElement = document.body

    const classesToAdd = [
      'm-0',
      'p-0',
      'w-full',
      'h-full',
      'overflow-hidden',
      'max-w-screen',
    ]

    htmlElement.classList.add(...classesToAdd, 'bg-black')
    bodyElement.classList.add(...classesToAdd, 'bg-red-500')

    return () => {
      classesToAdd.forEach((cls) => {
        htmlElement.classList.remove(cls)
        bodyElement.classList.remove(cls)
      })
      htmlElement.classList.remove('bg-black')
      bodyElement.classList.remove('bg-red-500')
    }
  }, [])

  const handleApiKeyProvided = () => {
    setIsApiKeySet(true)
  }

  return (
    <div
      className="flex flex-col h-screen w-full overflow-hidden"
      style={{
        backgroundColor: theme.background,
      }}
    >
      <ApiKeyModal
        key={apiKeyModalReset}
        theme={theme}
        isDarkTheme={isDarkTheme}
        onApiKeyProvided={handleApiKeyProvided}
      />
      {isApiKeySet &&
        roomsState.opened.map((roomId) => {
          const roomEntry = roomsState.rooms[roomId]
          return (
            <ChatRoom
              key={roomId}
              roomId={roomId}
              isActive={roomId === roomsState.active}
              theme={theme}
              isDarkTheme={isDarkTheme}
              toggleTheme={toggleTheme}
              chatHistory={chatHistory}
              setChatHistory={handleUpdateChatHistory}
              onUpdateChatTitle={handleUpdateChatTitle}
              onDeleteChat={handleDeleteChat}
              initialProvider={roomEntry?.provider || pickInitialProvider()}
              initialModel={roomEntry?.model || ''}
              initialChatId={roomEntry?.chatId}
              onRoomStateChange={handleRoomStateChange}
              onStatusChange={reportRoomStatus}
              onRequestSelectChat={handleRequestSelectChat}
              selectChatCommand={selectChatCommands[roomId]}
              newChatCommand={newChatCommands[roomId]}
              roomTabs={
                <RoomTabs
                  theme={theme}
                  activeRoom={roomsState.active}
                  statuses={roomStatuses}
                  onSelectRoom={handleSelectRoom}
                />
              }
            />
          )
        })}
    </div>
  )
}

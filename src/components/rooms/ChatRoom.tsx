// Una sala de chat (T2, ver odd/tasks/chat-rooms.md): el trío Header +
// ChatContainer + Footer con TODO su estado propio (proveedor, modelo,
// mensajes, chat actual, búsqueda web, YOLO, menús), extraído de App.tsx.
// App sigue dueña de lo compartido: tema, modal de API key, historial de
// chats (menú izquierdo, el mismo para las 10 salas) y la lista de salas
// abiertas/activa.
//
// Las salas se montan la primera vez que se toca su cajita y siguen
// montadas (App las envuelve en `hidden` cuando no están activas): así una
// respuesta en curso en una sala oculta sigue llegando a destino. Header,
// ChatContainer y Footer son `position:fixed`, así que ocultar el div
// contenedor con `display:none` también oculta a sus hijos fixed.

import type React from 'react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DEFAULT_MODEL_BY_PROVIDER } from '../../config/modelDefaults'
import { isOpenCodeAvailable } from '../../config/providers'
import { APP_VERSION } from '../../constants/appVersion'
import { createWelcomeMessage } from '../../constants/messages'
import {
  type ChatMessageType,
  STORAGE_KEY,
  TOOLS_STORAGE_KEY,
} from '../../interfaces/chat/chatTypes'
import type { ColorPalette } from '../../interfaces/temas/temas'
import {
  PROVIDER_IDS as CATALOG_PROVIDER_IDS,
  expireUnavailableModels,
  getModels,
} from '../../services/modelCatalog/store'
import type {
  CatalogModel,
  ProviderId,
} from '../../services/modelCatalog/types'
import { useModelCatalog } from '../../services/modelCatalog/useModelCatalog'
import { checkFreeModelsIfDue } from '../../services/opencodeLocal/freeModelCheck'
import { ensureFreshPrices } from '../../services/pricing/store'
import ChatContainer from '../chat/ChatContainer'
import Footer, { type FooterRef } from '../FOOTER/Footer'
import Header from '../HEADER/Header'
import type { RoomTabStatus } from './RoomTabs'
import type { RoomEntry } from './roomStorage'

// Lista de proveedores que se autentican con una API key propia (clave
// `${provider}ApiKey` en localStorage): igual a la que tenía App.tsx antes
// de esta funcionalidad. No incluye claudecode/codexsub (bridges locales,
// autenticados con contraseña) ni el resto del catálogo dinámico.
export const API_KEY_PROVIDER_IDS = [
  'groq',
  'routellm',
  'openai',
  'anthropic',
  'opengo',
  'opencodezen',
  'opencodefree',
  'gemini',
] as const

export const isOpenCodeGatedProvider = (p: string): boolean =>
  p === 'opengo' || p === 'opencodezen'

// Mismo criterio que el App.getInitialProvider() de antes de esta
// funcionalidad: el proveedor guardado si tiene key válida, si no el
// primero de la lista que tenga una, si no 'groq'. Exportado para que App
// lo use al elegir el proveedor inicial de una sala nueva (sin entrada
// previa en rooms:v1).
export function pickInitialProvider(): string {
  const stored = localStorage.getItem('selectedProvider')
  if (stored) {
    if (!isOpenCodeGatedProvider(stored) || isOpenCodeAvailable()) {
      const key = localStorage.getItem(`${stored}ApiKey`)
      if (key && key.trim() !== '') return stored
    }
  }
  for (const p of API_KEY_PROVIDER_IDS) {
    if (isOpenCodeGatedProvider(p) && !isOpenCodeAvailable()) continue
    const key = localStorage.getItem(`${p}ApiKey`)
    if (key && key.trim() !== '') return p
  }
  return 'groq'
}

// Catálogo de un proveedor. Tiene que ser la lista COMPLETA del catálogo
// (incluye claudecode/codexsub), no API_KEY_PROVIDER_IDS: con esa, las
// suscripciones caían en los modelos de Groq y se mandaba p. ej.
// qwen/qwen3.8-27b al bridge de Codex (colgado hasta el timeout).
const toCatalogProvider = (provider: string): ProviderId =>
  CATALOG_PROVIDER_IDS.includes(provider as ProviderId)
    ? (provider as ProviderId)
    : 'groq'

// Cuánto se esconde un modelo gratis de OpenCode que falló (ver
// handleProviderChange): los gratis rotan y uno puede volver a funcionar.
const UNAVAILABLE_FREE_MAX_AGE_MS = 24 * 60 * 60 * 1000

const resolveModelsForProvider = (provider: string): CatalogModel[] =>
  getModels(toCatalogProvider(provider))

// Modelo por defecto de un proveedor (T17): el id configurado en
// DEFAULT_MODEL_BY_PROVIDER si ya está en el catálogo, si no el primero
// disponible.
const pickDefaultModel = (
  provider: string,
  models: CatalogModel[],
): string | undefined => {
  const defaultId = DEFAULT_MODEL_BY_PROVIDER[provider]
  if (defaultId && models.some((m) => m.id === defaultId)) return defaultId
  return models[0]?.id
}

const getDefaultModelForProvider = (provider: string): string => {
  const models = resolveModelsForProvider(provider)
  return pickDefaultModel(provider, models) || getModels('groq')[0].id
}

// Modelo inicial: el guardado si sigue existiendo en el catálogo del
// proveedor, si no el default del proveedor.
const resolveInitialModel = (provider: string, savedModel: string): string => {
  if (savedModel) {
    const models = resolveModelsForProvider(provider)
    if (models.some((m) => m.id === savedModel)) return savedModel
  }
  return getDefaultModelForProvider(provider)
}

type ChatHistoryEntry = {
  id: string
  title: string
  date: Date
  model?: string
}

interface ChatRoomProps {
  roomId: number
  isActive: boolean
  theme: ColorPalette
  isDarkTheme: boolean
  toggleTheme: () => void
  // Historial de chats: compartido por las 10 salas (mismo menú izquierdo).
  chatHistory: ChatHistoryEntry[]
  setChatHistory: React.Dispatch<React.SetStateAction<ChatHistoryEntry[]>>
  onUpdateChatTitle: (chatId: string, newTitle: string) => void
  onDeleteChat: (chatId: string) => void
  // Estado inicial persistido de esta sala (rooms:v1 vía App), resuelto una
  // sola vez antes del primer render; no cambia mientras la sala vive.
  initialProvider: string
  initialModel: string
  initialChatId?: string
  // Reporta cambios de provider/modelo/chat hacia arriba, para persistir en
  // rooms:v1 y para que App detecte chats duplicados/eliminados entre salas.
  onRoomStateChange: (roomId: number, entry: RoomEntry) => void
  // Reporta el estado en vivo (indicadores de la cajita) hacia arriba.
  onStatusChange: (roomId: number, status: RoomTabStatus) => void
  // App decide si el chat pedido ya está abierto en OTRA sala (activa esa
  // sala en vez de esto) o si esta sala debe aplicarlo ella misma (T5).
  onRequestSelectChat: (roomId: number, chatId: string) => void
  // Comando de App: "aplicá este chatId" (cuando ninguna otra sala lo tenía
  // abierto) o "empezá un chat nuevo" (chat eliminado en otra parte). Un
  // número/objeto distinto en cada pedido, para que el efecto lo detecte.
  selectChatCommand?: { chatId: string; nonce: number }
  newChatCommand?: number
  // Las cajitas de salas, ya armadas por App (necesitan el estado de todas
  // las salas, no solo el de esta).
  roomTabs: React.ReactNode
}

// Chat inicial de una sala. Sala 1 sin chatId guardado: undefined, para que
// el efecto de inicialización que ya tenía ChatContainer elija el último chat
// del historial (comportamiento idéntico al de antes de las salas). Cualquier
// otra sala sin chatId (2-10, primera vez que se abre su cajita): un id
// propio desde cero, nunca el fallback "último chat" (pisaría el de otra
// sala). Solo genera el id: el alta en el historial se hace en un efecto
// (nunca durante el render, que actualizaría el estado de App mientras
// dibuja) y la bienvenida la crea el efecto de ChatContainer que carga los
// mensajes al cambiar currentChatId.
function initialRoomChatId(
  roomId: number,
  initialChatId: string | undefined,
): string | undefined {
  if (initialChatId) return initialChatId
  if (roomId === 1) return undefined
  return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
}

const ChatRoom: React.FC<ChatRoomProps> = ({
  roomId,
  isActive,
  theme,
  isDarkTheme,
  toggleTheme,
  chatHistory,
  setChatHistory,
  onUpdateChatTitle,
  onDeleteChat,
  initialProvider,
  initialModel,
  initialChatId,
  onRoomStateChange,
  onStatusChange,
  onRequestSelectChat,
  selectChatCommand,
  newChatCommand,
  roomTabs,
}) => {
  const [selectedProvider, setSelectedProvider] = useState(initialProvider)
  const [selectedModel, setSelectedModel] = useState(() =>
    resolveInitialModel(initialProvider, initialModel),
  )

  const [currentChatId, setCurrentChatId] = useState<string | undefined>(() =>
    initialRoomChatId(roomId, initialChatId),
  )
  const [messages, setMessages] = useState<ChatMessageType[]>([])

  // Alta en el historial compartido del chat propio de una sala nueva (ver
  // initialRoomChatId). Idempotente: no duplica la entrada si el efecto
  // corre dos veces (StrictMode) o si ya estaba.
  const ownChatToRegister = useRef(
    !initialChatId && roomId !== 1 ? currentChatId : undefined,
  )
  useEffect(() => {
    const chatId = ownChatToRegister.current
    if (!chatId) return
    ownChatToRegister.current = undefined
    setChatHistory((prev) =>
      prev.some((chat) => chat.id === chatId)
        ? prev
        : [
            ...prev,
            {
              id: chatId,
              title: 'Nuevo Chat',
              date: new Date(),
              model: selectedModel,
            },
          ],
    )
  }, [setChatHistory, selectedModel])
  const [isLoading, setIsLoading] = useState(false)

  const [leftMenuOpen, setLeftMenuOpen] = useState(false)
  const [rightMenuOpen, setRightMenuOpen] = useState(false)

  // Búsqueda web nativa por chat (igual que antes, ahora leída/guardada por
  // sala porque currentChatId ya es por sala).
  const [searchEnabled, setSearchEnabled] = useState(true)

  // YOLO (T7 follow-up): en memoria únicamente, ahora por sala.
  const [yoloEnabled, setYoloEnabled] = useState(false)

  const footerRef = useRef<FooterRef>(null)

  const focusInput = useCallback(() => {
    setTimeout(() => {
      footerRef.current?.focusTextarea()
    }, 100)
  }, [])

  useEffect(() => {
    if (!currentChatId) {
      setSearchEnabled(true)
      return
    }
    try {
      const stored = localStorage.getItem(TOOLS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        if (parsed && typeof parsed === 'object' && parsed[currentChatId]) {
          const config = parsed[currentChatId]
          if (config.searchEnabled !== undefined) {
            setSearchEnabled(config.searchEnabled)
            return
          }
        }
      }
    } catch (e) {
      console.error('Error al cargar config de búsqueda web:', e)
    }
    setSearchEnabled(true)
  }, [currentChatId])

  const handleToggleSearch = useCallback(() => {
    if (!currentChatId) return
    setSearchEnabled((prev) => {
      const next = !prev
      try {
        const stored = localStorage.getItem(TOOLS_STORAGE_KEY)
        let parsed: Record<string, Record<string, unknown>> = {}
        if (stored) parsed = JSON.parse(stored)
        parsed[currentChatId] = {
          ...(parsed[currentChatId] || {}),
          searchEnabled: next,
        }
        localStorage.setItem(TOOLS_STORAGE_KEY, JSON.stringify(parsed))
      } catch (e) {
        console.error('Error al guardar config de búsqueda web:', e)
      }
      return next
    })
  }, [currentChatId])

  // Si el modelo elegido desaparece del catálogo (refresh o modelo
  // rechazado por el proveedor), se pasa al primero disponible del mismo
  // proveedor.
  const providerModels = useModelCatalog(toCatalogProvider(selectedProvider))
  useEffect(() => {
    if (providerModels.length === 0) return
    if (providerModels.some((model) => model.id === selectedModel)) return
    const fallback = providerModels[0].id
    setSelectedModel(fallback)
    if (roomId === 1) localStorage.setItem('selectedModel', fallback)
  }, [providerModels, selectedModel, roomId])

  // Precios de los modelos (costo por mensaje, ver odd/tasks/message-cost.md):
  // al abrir la sala y al elegir o cambiar de proveedor/modelo se renuevan si
  // tienen más de un día. ensureFreshPrices no pide nada si están al día.
  useEffect(() => {
    if (selectedProvider && selectedModel) void ensureFreshPrices()
  }, [selectedProvider, selectedModel])

  // OpenCode Free: al elegirlo (o al abrir una sala que ya lo tiene) se
  // actualiza la lista de modelos gratis y, como máximo cada 6 h, se hace
  // ping a cada uno para ocultar los que Zen publica pero no sirve (ver
  // services/opencodeLocal/freeModelCheck.ts).
  useEffect(() => {
    if (selectedProvider === 'opencodefree') void checkFreeModelsIfDue()
  }, [selectedProvider])

  const handleProviderChange = useCallback(
    (providerId: string) => {
      setSelectedProvider(providerId)
      // Los modelos gratis de OpenCode aparecen y desaparecen: al elegir el
      // proveedor se pide la lista actual al servidor local (el efecto de
      // fallback de arriba corrige el modelo si el elegido ya no está).
      if (providerId === 'opencodefree') {
        expireUnavailableModels('opencodefree', UNAVAILABLE_FREE_MAX_AGE_MS)
      }
      const newModel = getDefaultModelForProvider(providerId)
      setSelectedModel(newModel)
      // Las claves legacy solo las sigue escribiendo la sala 1: son las que
      // usa el resto de la app (p.ej. la varita mágica cuando no hay chat
      // actual) como "el proveedor/modelo de siempre" de antes de esta
      // funcionalidad.
      if (roomId === 1) {
        localStorage.setItem('selectedProvider', providerId)
        localStorage.setItem('selectedModel', newModel)
      }
    },
    [roomId],
  )

  const handleModelChange = useCallback(
    (modelId: string) => {
      setSelectedModel(modelId)
      if (roomId === 1) localStorage.setItem('selectedModel', modelId)

      if (currentChatId) {
        setChatHistory((prev) =>
          prev.map((chat) =>
            chat.id === currentChatId ? { ...chat, model: modelId } : chat,
          ),
        )
      }
      focusInput()
    },
    [roomId, currentChatId, setChatHistory, focusInput],
  )

  // Manejador para crear una nueva conversación (por sala).
  const handleNewChat = useCallback(() => {
    const newMessages = [createWelcomeMessage(selectedModel)]
    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`

    try {
      const storedConversations = localStorage.getItem(STORAGE_KEY)
      let conversations: Record<string, ChatMessageType[]> = {}
      if (storedConversations) {
        try {
          const parsed = JSON.parse(storedConversations)
          if (parsed && typeof parsed === 'object') conversations = parsed
        } catch (e) {
          console.error('Error al parsear conversaciones:', e)
        }
      }
      conversations = { ...conversations, [newChatId]: newMessages }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch (error) {
      console.error('Error al crear nueva conversación:', error)
    }

    setChatHistory((prev) => [
      ...prev,
      {
        id: newChatId,
        title: 'Nuevo Chat',
        date: new Date(),
        model: selectedModel,
      },
    ])
    setMessages(newMessages)
    setCurrentChatId(newChatId)
    setLeftMenuOpen(false)
    setRightMenuOpen(false)
    focusInput()
  }, [selectedModel, setChatHistory, focusInput])

  // Manejador para limpiar el chat actual: lo saca del historial y crea uno
  // nuevo (por sala).
  const handleClearChat = useCallback(() => {
    if (!currentChatId) return
    const newChatId = `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    const welcomeMessage = [createWelcomeMessage(selectedModel)]

    try {
      const storedConversations = localStorage.getItem(STORAGE_KEY)
      let conversations: Record<string, ChatMessageType[]> = {}
      if (storedConversations) conversations = JSON.parse(storedConversations)
      delete conversations[currentChatId]
      conversations[newChatId] = welcomeMessage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
    } catch (error) {
      console.error('Error al limpiar y crear nueva conversación:', error)
    }

    setChatHistory((prev) => [
      ...prev.filter((chat) => chat.id !== currentChatId),
      {
        id: newChatId,
        title: 'Nuevo Chat',
        date: new Date(),
        model: selectedModel,
      },
    ])
    setMessages(welcomeMessage)
    setCurrentChatId(newChatId)
    focusInput()
  }, [currentChatId, selectedModel, setChatHistory, focusInput])

  // T5: pedido de App de abrir un chat de historial en ESTA sala (porque
  // ninguna otra sala abierta lo tenía ya abierto). Debe reaccionar solo a
  // un pedido nuevo (nonce), no a cambios de chatHistory/focusInput
  // mientras tanto: agregarlos como dependencia repetiría la selección.
  // biome-ignore lint/correctness/useExhaustiveDependencies: dispara por nonce, no por chatHistory/focusInput
  useEffect(() => {
    if (!selectChatCommand) return
    const chat = chatHistory.find((c) => c.id === selectChatCommand.chatId)
    setCurrentChatId(selectChatCommand.chatId)
    if (chat?.model) setSelectedModel(chat.model)
    focusInput()
  }, [selectChatCommand?.nonce])

  // T5: pedido de App de arrancar un chat nuevo (el que tenía esta sala se
  // borró desde otra sala, o desde esta misma). Mismo criterio: dispara por
  // nonce, no por identidad de handleNewChat (cambia con selectedModel).
  // biome-ignore lint/correctness/useExhaustiveDependencies: dispara por nonce, no por handleNewChat
  useEffect(() => {
    if (newChatCommand === undefined) return
    handleNewChat()
  }, [newChatCommand])

  const handleSelectChat = useCallback(
    (chatId: string) => {
      onRequestSelectChat(roomId, chatId)
    },
    [roomId, onRequestSelectChat],
  )

  // T5: espera bloqueante a que esta sala sea la visible, para los modales
  // de permiso (Claude/Codex/OpenCode Free). Si ya está activa, resuelve de
  // inmediato; si no, marca permissionPending (⚠️ en la cajita) y resuelve
  // recién cuando se active. Si la sala se desmonta con la espera pendiente
  // (no pasa en uso normal, pero por las dudas), se resuelve igual para no
  // dejar una promesa colgada.
  const isActiveRef = useRef(isActive)
  const pendingVisibilityResolvers = useRef<(() => void)[]>([])
  const [permissionPending, setPermissionPending] = useState(false)

  useEffect(() => {
    isActiveRef.current = isActive
    if (isActive && pendingVisibilityResolvers.current.length > 0) {
      const resolvers = pendingVisibilityResolvers.current
      pendingVisibilityResolvers.current = []
      setPermissionPending(false)
      for (const resolve of resolvers) resolve()
    }
  }, [isActive])

  useEffect(() => {
    return () => {
      const resolvers = pendingVisibilityResolvers.current
      pendingVisibilityResolvers.current = []
      for (const resolve of resolvers) resolve()
    }
  }, [])

  const waitUntilVisible = useCallback((): Promise<void> => {
    if (isActiveRef.current) return Promise.resolve()
    setPermissionPending(true)
    return new Promise<void>((resolve) => {
      pendingVisibilityResolvers.current.push(resolve)
    })
  }, [])

  // Respuesta sin leer (T5): la sala estaba esperando una respuesta y
  // terminó mientras no era la visible. Se mira el fin de la carga y no la
  // cantidad de mensajes: al recargar la página, las salas ocultas cargan
  // sus mensajes guardados y eso no es una respuesta nueva.
  const wasLoadingRef = useRef(isLoading)
  const [unread, setUnread] = useState(false)
  useEffect(() => {
    const finished = wasLoadingRef.current && !isLoading
    wasLoadingRef.current = isLoading
    if (isActive) {
      setUnread(false)
      return
    }
    if (finished) setUnread(true)
  }, [isLoading, isActive])

  // Reporta el estado en vivo hacia App (indicadores de la cajita, T4/T5).
  useEffect(() => {
    onStatusChange(roomId, {
      isLoading,
      unread,
      permissionPending,
      chatTitle: chatHistory.find((c) => c.id === currentChatId)?.title,
      model: selectedModel,
    })
  }, [
    roomId,
    unread,
    isLoading,
    permissionPending,
    currentChatId,
    selectedModel,
    chatHistory,
    onStatusChange,
  ])

  // Persiste provider/modelo/chat de esta sala hacia App (rooms:v1) y le da
  // a App la información que necesita para detectar el mismo chat abierto
  // en dos salas (T5).
  useEffect(() => {
    onRoomStateChange(roomId, {
      provider: selectedProvider,
      model: selectedModel,
      chatId: currentChatId,
    })
  }, [
    roomId,
    selectedProvider,
    selectedModel,
    currentChatId,
    onRoomStateChange,
  ])

  return (
    <div className={isActive ? undefined : 'hidden'}>
      <Header
        title="PROMPTING"
        version={APP_VERSION}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
        theme={theme}
        isDarkTheme={isDarkTheme}
        onToggleLeftMenu={() => {
          setLeftMenuOpen((prev) => !prev)
          setRightMenuOpen(false)
          focusInput()
        }}
        onToggleRightMenu={() => {
          setRightMenuOpen((prev) => !prev)
          setLeftMenuOpen(false)
          focusInput()
        }}
        selectedProvider={selectedProvider}
        onProviderChange={handleProviderChange}
        yoloEnabled={yoloEnabled}
        onYoloChange={setYoloEnabled}
        roomTabs={roomTabs}
      />
      <ChatContainer
        roomId={roomId}
        isActive={isActive}
        waitUntilVisible={waitUntilVisible}
        messages={messages}
        setMessages={setMessages}
        isLoading={isLoading}
        setIsLoading={setIsLoading}
        theme={theme}
        isDarkTheme={isDarkTheme}
        toggleTheme={toggleTheme}
        selectedModel={selectedModel}
        currentChatId={currentChatId}
        setCurrentChatId={setCurrentChatId}
        chatHistory={chatHistory}
        setChatHistory={setChatHistory}
        leftMenuOpen={leftMenuOpen}
        rightMenuOpen={rightMenuOpen}
        onCloseLeftMenu={() => {
          setLeftMenuOpen(false)
          focusInput()
        }}
        onCloseRightMenu={() => {
          setRightMenuOpen(false)
          focusInput()
        }}
        onSelectChat={handleSelectChat}
        onNewChat={handleNewChat}
        onModelChange={handleModelChange}
        onFocusInput={focusInput}
        onUpdateChatTitle={onUpdateChatTitle}
        onDeleteChat={onDeleteChat}
        selectedProvider={selectedProvider}
        onRepeatMessage={(message) => {
          footerRef.current?.setMessage(message)
        }}
        searchEnabled={searchEnabled}
        yoloEnabled={yoloEnabled}
      />
      <Footer
        ref={footerRef}
        onSendMessage={(message, images, files) => {
          if (
            message.trim() ||
            (images && images.length > 0) ||
            (files && files.length > 0)
          ) {
            const event = new CustomEvent('send-message', {
              detail: { message, images, files, roomId },
            })
            document.dispatchEvent(event)
            focusInput()
          }
        }}
        toggleTheme={toggleTheme}
        clearContext={handleClearChat}
        hasContext={messages.length > 1}
        theme={theme}
        isDarkTheme={isDarkTheme}
        isLoading={isLoading}
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        chatTitle={chatHistory.find((chat) => chat.id === currentChatId)?.title}
        onUpdateChatTitle={(newTitle) => {
          if (currentChatId) onUpdateChatTitle(currentChatId, newTitle)
        }}
        currentChatId={currentChatId}
        onCloseMenus={() => {
          setLeftMenuOpen(false)
          setRightMenuOpen(false)
        }}
        searchEnabled={searchEnabled}
        onToggleSearch={handleToggleSearch}
      />
    </div>
  )
}

export default ChatRoom

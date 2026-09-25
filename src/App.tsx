import { useCallback, useEffect, useRef, useState } from 'react'
import ApiKeyModal from './components/ApiKeyModal/ApiKeyModal.tsx'
// Importación utilizando el archivo índice
import ChatContainer from './components/chat/ChatContainer'
import Footer, { type FooterRef } from './components/FOOTER/Footer'
// Componentes principales
import Header from './components/HEADER/Header'
import { isOpenCodeAvailable } from './config/providers'
import { APP_VERSION } from './constants/appVersion'
import { createWelcomeMessage } from './constants/messages'
// Interfaces
import {
  CHAT_HISTORY_KEY,
  type ChatMessageType,
  STORAGE_KEY,
  TOOLS_STORAGE_KEY,
} from './interfaces/chat/chatTypes'
import { darkTheme, lightTheme } from './interfaces/temas/temas.tsx'
import {
  PROVIDER_IDS as CATALOG_PROVIDER_IDS,
  getModels,
  initModelCatalog,
} from './services/modelCatalog/store'
import type { ProviderId } from './services/modelCatalog/types'
import { useModelCatalog } from './services/modelCatalog/useModelCatalog'
import { generateLayoutCSS } from './utils/layoutConstants'
import { setupMobileKeyboardHandler } from './utils/mobileUtils'

const PROVIDER_IDS = [
  'groq',
  'routellm',
  'openai',
  'anthropic',
  'opengo',
  'opencodezen',
  'gemini',
] as const

const isOpenCodeGatedProvider = (p: string): boolean =>
  p === 'opengo' || p === 'opencodezen'

export const App = () => {
  // Estados para la UI
  const [isDarkTheme, setIsDarkTheme] = useState(true)
  const theme = isDarkTheme ? darkTheme : lightTheme
  const hasAnyApiKey = useCallback(
    () =>
      PROVIDER_IDS.some((p) => {
        if (isOpenCodeGatedProvider(p) && !isOpenCodeAvailable()) return false
        const key = localStorage.getItem(`${p}ApiKey`)
        return key && key.trim() !== ''
      }),
    [],
  )

  const getInitialProvider = () => {
    const stored = localStorage.getItem('selectedProvider')
    // Un `selectedProvider` heredado de 'opencodefree' (proveedor retirado,
    // ver T8) se trata como si no hubiera valor guardado: nunca coincide con
    // ningún elemento de PROVIDER_IDS, así que cae al loop de abajo.
    if (stored) {
      if (!isOpenCodeGatedProvider(stored) || isOpenCodeAvailable()) {
        const key = localStorage.getItem(`${stored}ApiKey`)
        if (key && key.trim() !== '') return stored
      }
    }
    for (const p of PROVIDER_IDS) {
      if (isOpenCodeGatedProvider(p) && !isOpenCodeAvailable()) continue
      const key = localStorage.getItem(`${p}ApiKey`)
      if (key && key.trim() !== '') return p
    }
    return 'groq'
  }

  const getInitialModel = (provider: string) => {
    // Intentar cargar el modelo guardado en localStorage
    const savedModel = localStorage.getItem('selectedModel')

    // Verificar que el modelo guardado pertenece al provider actual
    const allModels = getModels(
      PROVIDER_IDS.includes(provider as (typeof PROVIDER_IDS)[number])
        ? (provider as (typeof PROVIDER_IDS)[number])
        : 'groq',
    )

    // Si el modelo guardado existe en el provider actual, usarlo
    if (savedModel && allModels.some((m) => m.id === savedModel)) {
      return savedModel
    }

    // Si no, devolver el primer modelo del provider
    return allModels[0]?.id || getModels('groq')[0].id
  }

  const initialProvider = getInitialProvider()
  const [selectedProvider, setSelectedProvider] =
    useState<string>(initialProvider)
  const [selectedModel, setSelectedModel] = useState(() =>
    getInitialModel(initialProvider),
  )

  const getDefaultModelForProvider = (provider: string) => {
    const models = getModels(
      PROVIDER_IDS.includes(provider as (typeof PROVIDER_IDS)[number])
        ? (provider as (typeof PROVIDER_IDS)[number])
        : 'groq',
    )
    return models[0]?.id || selectedModel
  }

  // Si el modelo elegido desaparece del catálogo (refresh o modelo rechazado
  // por el proveedor), se pasa al primero disponible del mismo proveedor.
  const providerModels = useModelCatalog(
    CATALOG_PROVIDER_IDS.includes(selectedProvider as ProviderId)
      ? (selectedProvider as ProviderId)
      : 'groq',
  )
  useEffect(() => {
    if (providerModels.length === 0) return
    if (providerModels.some((model) => model.id === selectedModel)) return
    const fallback = providerModels[0].id
    setSelectedModel(fallback)
    localStorage.setItem('selectedModel', fallback)
  }, [providerModels, selectedModel])

  const handleProviderChange = (providerId: string) => {
    setSelectedProvider(providerId)
    localStorage.setItem('selectedProvider', providerId)
    const newModel = getDefaultModelForProvider(providerId)
    setSelectedModel(newModel)
    localStorage.setItem('selectedModel', newModel)
  }

  // Estados para los menús laterales
  const [leftMenuOpen, setLeftMenuOpen] = useState(false)
  const [rightMenuOpen, setRightMenuOpen] = useState(false)

  // Estados para el chat
  const [messages, setMessages] = useState<ChatMessageType[]>([])
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [chatHistory, setChatHistory] = useState<
    { id: string; title: string; date: Date; model?: string }[]
  >([])
  const [currentChatId, setCurrentChatId] = useState<string | undefined>(
    undefined,
  )
  const [isApiKeySet, setIsApiKeySet] = useState(() => hasAnyApiKey())
  const [apiKeyModalReset, setApiKeyModalReset] = useState(0)

  // Búsqueda web nativa por chat
  const [searchEnabled, setSearchEnabled] = useState<boolean>(true)

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
        if (stored) {
          parsed = JSON.parse(stored)
        }
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

  const footerRef = useRef<FooterRef>(null)

  // Función para enfocar el textarea desde cualquier parte
  const focusInput = useCallback(() => {
    setTimeout(() => {
      footerRef.current?.focusTextarea()
    }, 100)
  }, [])

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

  // Arrancar el catálogo dinámico de modelos: lee caché/estático de forma
  // síncrona (ya aplicado en el estado inicial de arriba) y dispara el
  // refresco en background una sola vez.
  useEffect(() => {
    initModelCatalog()
  }, [])

  // Inyectar las variables CSS de layout y actualizar el título del documento
  useEffect(() => {
    const styleElement = document.createElement('style')
    styleElement.setAttribute('id', 'layout-constants-css')
    styleElement.textContent = generateLayoutCSS()
    document.head.appendChild(styleElement)

    // Actualizar el título con la versión
    document.title = `PROMPTING ${APP_VERSION}`

    return () => {
      const existingStyle = document.getElementById('layout-constants-css')
      if (existingStyle) {
        document.head.removeChild(existingStyle)
      }
    }
  }, [])

  // Función para cambiar el tema
  const toggleTheme = useCallback(() => {
    setIsDarkTheme((prevIsDark) => !prevIsDark)
  }, [])

  // Configurar el manejador del teclado para dispositivos móviles
  useEffect(() => {
    setupMobileKeyboardHandler()

    // Configurar clases de HTML y body
    const htmlElement = document.documentElement
    const bodyElement = document.body

    // Primero limpiar las clases existentes para evitar duplicados
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
      // Limpieza al desmontar o antes de re-ejecutar el efecto
      classesToAdd.forEach((cls) => {
        htmlElement.classList.remove(cls)
        bodyElement.classList.remove(cls)
      })
      htmlElement.classList.remove('bg-black')
      bodyElement.classList.remove('bg-red-500')
    }
  }, [])

  // Manejadores para los menús laterales
  const handleToggleLeftMenu = () => {
    setLeftMenuOpen(!leftMenuOpen)
    if (rightMenuOpen) setRightMenuOpen(false)
    focusInput()
  }

  const handleToggleRightMenu = () => {
    setRightMenuOpen(!rightMenuOpen)
    if (leftMenuOpen) setLeftMenuOpen(false)
    focusInput()
  }

  // Cerrar ambos menús si están abiertos (usado al empezar a tipear)
  const closeMenus = () => {
    if (leftMenuOpen) setLeftMenuOpen(false)
    if (rightMenuOpen) setRightMenuOpen(false)
  }

  // Manejador para cambiar el modelo
  const handleModelChange = (modelId: string) => {
    setSelectedModel(modelId)
    localStorage.setItem('selectedModel', modelId)

    // Guardar el modelo seleccionado para el chat actual en el historial
    if (currentChatId) {
      setChatHistory((prev) =>
        prev.map((chat) =>
          chat.id === currentChatId ? { ...chat, model: modelId } : chat,
        ),
      )
    }

    focusInput()
  }

  // Manejador para crear una nueva conversación
  const handleNewChat = () => {
    const newMessages = [createWelcomeMessage(selectedModel)]

    // Generar un nuevo ID para esta conversación
    const newChatId = `chat_${Date.now()}`

    // Actualizar el localStorage con la nueva conversación
    try {
      // 1. Actualizar las conversaciones
      const storedConversations = localStorage.getItem(STORAGE_KEY)
      let conversations = {}

      if (storedConversations) {
        try {
          const parsed = JSON.parse(storedConversations)
          if (parsed && typeof parsed === 'object') {
            conversations = parsed as Record<string, ChatMessageType[]>
          }
        } catch (e) {
          console.error('Error al parsear conversaciones:', e)
        }
      }

      // Agregar la nueva conversación
      conversations = {
        ...conversations,
        [newChatId]: newMessages,
      }

      // Guardar todas las conversaciones
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))

      // 2. Actualizar el historial de chats (NO borrar los anteriores)
      const newChatHistory = [
        ...chatHistory,
        {
          id: newChatId,
          title: 'Nuevo Chat',
          date: new Date(),
          model: selectedModel, // Guardar el modelo seleccionado actualmente
        },
      ]

      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newChatHistory))

      // 3. Actualizar el estado de React
      setMessages(newMessages)
      setCurrentChatId(newChatId)
      setChatHistory(newChatHistory)
    } catch (error) {
      console.error('Error al crear nueva conversación:', error)
      // En caso de error, solo actualizamos el estado de React
      setMessages(newMessages)
      setCurrentChatId(newChatId)
      setChatHistory((prevHistory) => [
        ...prevHistory,
        {
          id: newChatId,
          title: 'Nuevo Chat',
          date: new Date(),
          model: selectedModel, // Incluir el modelo seleccionado actual
        },
      ])
    }

    // Cerrar los menús laterales
    setLeftMenuOpen(false)
    setRightMenuOpen(false)
    focusInput()
  }

  // Manejador para limpiar el chat actual, borrarlo del historial y crear uno nuevo
  const handleClearChat = useCallback(() => {
    if (!currentChatId) return

    // Crear un chat nuevo
    const newChatId = `chat_${Date.now()}`

    // Mensaje de bienvenida para el nuevo chat
    const welcomeMessage = [createWelcomeMessage(selectedModel)]

    try {
      // 1. Actualizar los mensajes en localStorage
      const storedConversations = localStorage.getItem(STORAGE_KEY)
      let conversations: Record<string, ChatMessageType[]> = {}

      if (storedConversations) {
        conversations = JSON.parse(storedConversations)
        // Eliminar la conversación actual
        delete conversations[currentChatId]
      }

      // Añadir la nueva conversación
      conversations[newChatId] = welcomeMessage
      localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))

      // 2. Actualizar el historial de chats
      const updatedHistory = chatHistory.filter(
        (chat) => chat.id !== currentChatId,
      )
      const newChatEntry = {
        id: newChatId,
        title: 'Nuevo Chat',
        date: new Date(),
        model: selectedModel,
      }

      const newChatHistory = [...updatedHistory, newChatEntry]
      localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newChatHistory))

      // 3. Actualizar el estado
      setMessages(welcomeMessage)
      setCurrentChatId(newChatId)
      setChatHistory(newChatHistory)
    } catch (error) {
      console.error('Error al limpiar y crear nueva conversación:', error)
    }

    focusInput()
  }, [currentChatId, selectedModel, chatHistory, focusInput])

  // Modificar el tipo de handleUpdateChatHistory para que sea compatible con React.Dispatch<React.SetStateAction<...>>
  const handleUpdateChatHistory = useCallback(
    (
      value: React.SetStateAction<
        { id: string; title: string; date: Date; model?: string }[]
      >,
    ) => {
      if (typeof value === 'function') {
        setChatHistory((prev) => {
          const newValue = value(prev)
          // Almacenar en localStorage
          try {
            localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newValue))
          } catch (error) {
            console.error('Error al guardar historial de chat:', error)
          }
          return newValue
        })
      } else {
        // Almacenar en localStorage
        try {
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(value))
        } catch (error) {
          console.error('Error al guardar historial de chat:', error)
        }
        setChatHistory(value)
      }
    },
    [],
  ) // Sin dependencias para evitar recreaciones innecesarias

  // Manejador para actualizar el estado de carga
  const handleLoadingChange = (loading: boolean) => {
    setIsLoading(loading)
  }

  // Manejador para actualizar el título de un chat
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

  // Manejador para eliminar un chat y navegar a otro
  const handleDeleteChat = useCallback(
    (chatIdToDelete: string) => {
      if (!chatIdToDelete) return

      try {
        // 1. Eliminar los mensajes de esta conversación de localStorage
        const storedConversations = localStorage.getItem(STORAGE_KEY)
        if (storedConversations) {
          const conversations = JSON.parse(storedConversations)
          // Eliminar la conversación
          delete conversations[chatIdToDelete]
          localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations))
        }

        // 2. Actualizar el historial de chats
        const updatedHistory = chatHistory.filter(
          (chat) => chat.id !== chatIdToDelete,
        )

        // Actualizar el historial en localStorage y estado inmediatamente
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(updatedHistory))
        setChatHistory(updatedHistory)

        // 3. Si estamos eliminando el chat actual, navegar a otro
        if (currentChatId === chatIdToDelete) {
          // Si era el último chat, crear uno nuevo completamente separado
          if (updatedHistory.length === 0) {
            // Importante: limpiar el chat actual antes de crear uno nuevo
            setCurrentChatId(undefined)
            setMessages([])

            // Crear un nuevo chat con un pequeño retraso para asegurar que el estado se actualice
            setTimeout(() => {
              // Generar un nuevo ID único
              const newChatId = `chat_${Date.now()}`
              const welcomeMessage = [createWelcomeMessage(selectedModel)]

              // Guardar el nuevo chat en localStorage
              const newConversations: Record<string, ChatMessageType[]> = {}
              newConversations[newChatId] = welcomeMessage
              localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(newConversations),
              )

              // Crear un nuevo historial con solo el nuevo chat
              const newHistory = [
                {
                  id: newChatId,
                  title: 'Nuevo Chat',
                  date: new Date(),
                  model: selectedModel,
                },
              ]
              localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(newHistory))

              // Actualizar el estado
              setMessages(welcomeMessage)
              setCurrentChatId(newChatId)
              setChatHistory(newHistory)
            }, 50)

            return
          }

          // Si quedan chats, buscar otro chat para navegar
          // Intentar encontrar un chat más reciente
          const newerChats = updatedHistory.filter(
            (chat) =>
              new Date(chat.date) >
              new Date(
                chatHistory.find((c) => c.id === chatIdToDelete)?.date || 0,
              ),
          )

          // Si hay chats más recientes, ir al más antiguo de ellos
          if (newerChats.length > 0) {
            const sortedNewer = newerChats.toSorted(
              (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
            )
            setCurrentChatId(sortedNewer[0].id)

            // Cargar mensajes del chat seleccionado
            const storedData = localStorage.getItem(STORAGE_KEY)
            if (storedData) {
              const parsedData = JSON.parse(storedData)
              if (parsedData?.[sortedNewer[0].id]) {
                setMessages(parsedData[sortedNewer[0].id])
                // Actualizar modelo si es necesario
                if (sortedNewer[0].model) {
                  setSelectedModel(sortedNewer[0].model)
                }
              }
            }
          }
          // Si no hay chats más recientes, ir al más reciente de los anteriores
          else if (updatedHistory.length > 0) {
            const latestChat = updatedHistory.reduce(
              (latest, chat) =>
                new Date(chat.date) > new Date(latest.date) ? chat : latest,
              updatedHistory[0],
            )
            setCurrentChatId(latestChat.id)

            // Cargar mensajes del chat seleccionado
            const storedData = localStorage.getItem(STORAGE_KEY)
            if (storedData) {
              const parsedData = JSON.parse(storedData)
              if (parsedData?.[latestChat.id]) {
                setMessages(parsedData[latestChat.id])
                // Actualizar modelo si es necesario
                if (latestChat.model) {
                  setSelectedModel(latestChat.model)
                }
              }
            }
          }
        }
      } catch (error) {
        console.error('Error al eliminar chat:', error)
      }
    },
    [chatHistory, currentChatId, selectedModel],
  )

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
      {isApiKeySet && (
        <>
          {/* Header con título, versión y selector de modelos */}
          <Header
            title="PROMPTING"
            version={APP_VERSION}
            selectedModel={selectedModel}
            onModelChange={handleModelChange}
            theme={theme}
            isDarkTheme={isDarkTheme}
            onToggleLeftMenu={handleToggleLeftMenu}
            onToggleRightMenu={handleToggleRightMenu}
            selectedProvider={selectedProvider}
            onProviderChange={handleProviderChange}
          />
          {/* Contenedor principal del chat */}
          <ChatContainer
            messages={messages}
            setMessages={setMessages}
            isLoading={isLoading}
            setIsLoading={handleLoadingChange}
            theme={theme}
            isDarkTheme={isDarkTheme}
            toggleTheme={toggleTheme}
            selectedModel={selectedModel}
            currentChatId={currentChatId}
            setCurrentChatId={setCurrentChatId}
            chatHistory={chatHistory}
            setChatHistory={handleUpdateChatHistory}
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
            onSelectChat={(chatId) => {
              const selectedChat = chatHistory.find(
                (chat) => chat.id === chatId,
              )
              setCurrentChatId(chatId)
              if (selectedChat?.model) {
                setSelectedModel(selectedChat.model)
              }
              focusInput()
            }}
            onNewChat={handleNewChat}
            onModelChange={handleModelChange}
            onFocusInput={focusInput}
            onUpdateChatTitle={handleUpdateChatTitle}
            onDeleteChat={handleDeleteChat}
            selectedProvider={selectedProvider}
            onRepeatMessage={(message) => {
              if (footerRef.current) {
                footerRef.current.setMessage(message)
              }
            }}
            searchEnabled={searchEnabled}
          />
          {/* Footer con área de entrada y controles */}
          <Footer
            ref={footerRef}
            onSendMessage={(message) => {
              if (message.trim()) {
                const event = new CustomEvent('send-message', {
                  detail: { message },
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
            chatTitle={
              chatHistory.find((chat) => chat.id === currentChatId)?.title
            }
            onUpdateChatTitle={(newTitle) => {
              if (currentChatId) {
                handleUpdateChatTitle(currentChatId, newTitle)
              }
            }}
            currentChatId={currentChatId}
            onCloseMenus={closeMenus}
            searchEnabled={searchEnabled}
            onToggleSearch={handleToggleSearch}
          />
        </>
      )}
    </div>
  )
}

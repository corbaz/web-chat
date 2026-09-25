import axios from 'axios'
import { useCallback, useEffect, useRef } from 'react'
import Swal from 'sweetalert2'
import {
  getApiErrorMessage,
  getApiKeyStorageKey,
  getProviderConfig,
  isInvalidApiKeyError,
  isOpenCodeAvailable,
  OPENCODE_UNAVAILABLE_MESSAGE,
  openCodeSessionHeaders,
} from '../../config/providers'
import { sanitizeCitations, supportsWebSearch } from '../../config/webSearch'
import { createWelcomeMessage } from '../../constants/messages'
import {
  CHAT_HISTORY_KEY,
  type ChatMessageType,
  type Citation,
  type GroqMessageType,
  STORAGE_KEY,
  type ToolConfig,
} from '../../interfaces/chat/chatTypes'
import type { ColorPalette } from '../../interfaces/temas/temas'
import {
  FOOTER_HEIGHT_MOBILE,
  HEADER_HEIGHT_MOBILE,
} from '../../utils/layoutConstants'
import { formatResponseTime } from '../../utils/timeUtils'
import {
  estimateMessagesTokens,
  getModelTokenLimit,
  MAX_RESPONSE_TOKENS,
  TOKEN_LIMIT_SAFETY_FACTOR,
} from '../../utils/tokenUtils'
import ChatArea from '../chat/ChatArea'
import LeftMenu from '../HEADER/menu/LeftMenu'
import RightMenu from '../HEADER/menu/RightMenu'

interface ChatContainerProps {
  messages: ChatMessageType[]
  setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>
  isLoading: boolean
  setIsLoading: (isLoading: boolean) => void
  theme: ColorPalette
  isDarkTheme: boolean
  toggleTheme: () => void // Añadimos la función para cambiar el tema
  selectedModel: string
  currentChatId: string | undefined
  setCurrentChatId: React.Dispatch<React.SetStateAction<string | undefined>> // Añadimos esta propiedad
  chatHistory: { id: string; title: string; date: Date; model?: string }[]
  setChatHistory: React.Dispatch<
    React.SetStateAction<
      { id: string; title: string; date: Date; model?: string }[]
    >
  >
  leftMenuOpen: boolean
  rightMenuOpen: boolean
  onCloseLeftMenu: () => void
  onCloseRightMenu: () => void
  onSelectChat: (chatId: string) => void
  onNewChat: () => void
  onModelChange: (modelId: string) => void
  onFocusInput?: () => void
  onUpdateChatTitle?: (chatId: string, newTitle: string) => void // Para actualizar el título
  onDeleteChat?: (chatId: string) => void // Para eliminar un chat
  selectedProvider?: string // Proveedor seleccionado en el header
  onRepeatMessage?: (message: string) => void // Callback para repetir mensaje en footer
  searchEnabled: boolean // Estado de la búsqueda web para el chat
}

const FRESH_WEB_EVIDENCE_PATTERN =
  /\b(hoy|ayer|actual(?:es)?|reciente(?:s)?|últim[oa]s?|noticias?|resultado(?:s)?|partido(?:s)?|final(?:es)?|mundial|cotizaci[oó]n|precio(?:s)?|clima|elecciones?|presidente|202[5-9])\b/i

const requiresFreshWebEvidence = (messages: GroqMessageType[]): boolean =>
  messages
    .slice(-8)
    .some(
      (message) =>
        message.role !== 'system' &&
        FRESH_WEB_EVIDENCE_PATTERN.test(message.content),
    )

const ChatContainer = ({
  messages,
  setMessages,
  isLoading,
  setIsLoading,
  theme,
  isDarkTheme,
  toggleTheme, // Añadimos aquí la prop toggleTheme para utilizarla
  selectedModel,
  currentChatId,
  setCurrentChatId,
  chatHistory,
  setChatHistory,
  leftMenuOpen,
  rightMenuOpen,
  onCloseLeftMenu,
  onCloseRightMenu,
  onSelectChat,
  onNewChat,
  onModelChange,
  onFocusInput,
  onUpdateChatTitle,
  onDeleteChat,
  selectedProvider,
  onRepeatMessage,
  searchEnabled,
}: ChatContainerProps) => {
  // Ref para almacenar tiempos de inicio de solicitudes
  const requestStartTimeRef = useRef<Record<string, number>>({})

  // Efecto para inicializar el chat y cargar datos guardados
  useEffect(() => {
    // Función para generar un ID único para nuevos chats
    const generateId = () => {
      return `chat_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`
    }

    // Función para cargar datos del localStorage
    const loadSavedData = () => {
      const storedData = localStorage.getItem(STORAGE_KEY)
      // Intentar cargar el historial existente primero
      const chatHistoryData = localStorage.getItem(CHAT_HISTORY_KEY)
      let existingHistory = []

      if (chatHistoryData) {
        try {
          existingHistory = JSON.parse(chatHistoryData)
          // Si ya tenemos historial, simplemente usamos ese
          if (existingHistory && existingHistory.length > 0) {
            // Si el componente recibe un chatHistory vacío, actualizamos con el existente
            if (chatHistory.length === 0) {
              setChatHistory(existingHistory)
            }

            // Si no hay chat actual seleccionado, seleccionamos el último
            if (!currentChatId && existingHistory.length > 0) {
              const lastChat = existingHistory[existingHistory.length - 1]
              setCurrentChatId(lastChat.id)
            }
          }
        } catch (error) {
          console.error('Error al cargar historial de chats:', error)
        }
      }

      // Después procesamos los mensajes
      if (storedData) {
        try {
          const parsedData = JSON.parse(storedData)
          if (parsedData && typeof parsedData === 'object') {
            const chatIds = Object.keys(parsedData)
            if (chatIds.length > 0) {
              // Si no hay historial en localStorage, pero sí hay mensajes,
              // creamos el historial a partir de los mensajes
              if (existingHistory.length === 0) {
                const newChatHistory = chatIds.map((id, idx) => ({
                  id,
                  title: `Chat ${idx + 1}`,
                  date: new Date(),
                }))
                setChatHistory(newChatHistory)
              }

              if (!currentChatId) {
                const lastChatId = chatIds[chatIds.length - 1]
                setCurrentChatId(lastChatId)
              }
              return true
            }
          }
        } catch (error) {
          console.error('Error al cargar datos guardados:', error)
        }
      }
      return false
    }

    const dataLoaded = loadSavedData()
    if (!dataLoaded && !currentChatId) {
      const newChatId = generateId()
      const newHistory = [
        {
          id: newChatId,
          title: 'Nuevo Chat',
          date: new Date(),
        },
      ]
      setChatHistory(newHistory)
      setCurrentChatId(newChatId)
      // Mensaje de bienvenida automático
      const bienvenida = [createWelcomeMessage()]
      setMessages(bienvenida)
      // Guardar en localStorage para reflejarlo en la UI y persistencia
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ [newChatId]: bienvenida }),
      )
      if (onFocusInput) onFocusInput()
    }
  }, [
    setChatHistory,
    setCurrentChatId,
    currentChatId,
    setMessages,
    onFocusInput,
    chatHistory.length, // Añadir la dependencia faltante
  ])

  // Efecto para cargar mensajes cuando cambia el chat actual
  useEffect(() => {
    if (!currentChatId) return
    console.log('Intentando cargar mensajes para el chat:', currentChatId)
    const storedData = localStorage.getItem(STORAGE_KEY)
    if (storedData) {
      try {
        const parsedData = JSON.parse(storedData)
        if (parsedData?.[currentChatId]) {
          const chatMessages = parsedData[currentChatId]
          console.log('Mensajes encontrados:', chatMessages.length)
          setMessages(() => (Array.isArray(chatMessages) ? chatMessages : []))
        } else {
          // Si no hay mensajes para este chat, mostrar bienvenida y guardar
          console.log('No hay mensajes para este chat, mostrando bienvenida')
          const bienvenida = [createWelcomeMessage()]
          setMessages(bienvenida)

          // Crear una estructura actualizada para guardar en localStorage
          const existingData = parsedData || {}
          const updatedData = {
            ...existingData,
            [currentChatId]: bienvenida,
          }

          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
        }
      } catch (error) {
        console.error('Error al cargar mensajes del chat:', error)
        setMessages(() => [])
      }
    } else if (currentChatId) {
      // Si no hay nada en localStorage pero hay chatId, mostrar bienvenida y guardar
      const bienvenida = [createWelcomeMessage()]
      setMessages(bienvenida)
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ [currentChatId]: bienvenida }),
      )
    }
    if (onFocusInput) onFocusInput()
  }, [currentChatId, setMessages, onFocusInput])

  // Efecto para guardar mensajes en localStorage
  useEffect(() => {
    if (currentChatId && messages.length > 0 && !isLoading) {
      const storedData = localStorage.getItem(STORAGE_KEY)
      let dataToStore = {}

      try {
        if (storedData) {
          dataToStore = JSON.parse(storedData)
        }

        // Creamos un nuevo objeto para evitar modificar directamente la referencia
        const updatedData = {
          ...dataToStore,
          [currentChatId]: messages,
        }

        // Solo guardamos si hay cambios
        if (JSON.stringify(updatedData) !== storedData) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedData))
        }
      } catch (error) {
        console.error('Error al guardar mensajes:', error)
      }
    }
  }, [messages, currentChatId, isLoading]) // Dependemos de messages, currentChatId e isLoading

  // Guardar historial de chats en localStorage cada vez que cambie
  useEffect(() => {
    if (chatHistory.length > 0) {
      try {
        const jsonString = JSON.stringify(chatHistory)
        localStorage.setItem(CHAT_HISTORY_KEY, jsonString)
      } catch (error) {
        console.error('Error al guardar historial de chats:', error)
      }
    }
  }, [chatHistory])

  // Preparar mensajes para la API de Groq (gestionar tokens)
  const prepareMessagesForApi = useCallback(
    (
      messagesHistory: ChatMessageType[],
      modelId: string,
    ): GroqMessageType[] => {
      // Obtener el límite de tokens para el modelo seleccionado
      const modelTokenLimit = getModelTokenLimit(modelId, selectedProvider)
      const maxContextTokens = Math.floor(
        modelTokenLimit * TOKEN_LIMIT_SAFETY_FACTOR - MAX_RESPONSE_TOKENS,
      )

      // Convertir mensajes al formato para API
      const apiMessages: GroqMessageType[] = messagesHistory.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }))

      // Añadir sistema de mensajes para asegurar que responda en español
      const systemMessage: GroqMessageType = {
        role: 'system',
        content:
          'Eres un asistente virtual útil y conciso. Responde en español en todo momento, utilizando formato markdown enriquecido. El objetivo es ofrecer una respuestas precisas, claras y adaptadas a las necesidades del usuario, siempre manteniendo un tono amable y respetuoso.',
      }

      // Calcular tokens del mensaje de sistema
      const systemTokens = estimateMessagesTokens([systemMessage])
      const availableTokens = maxContextTokens - systemTokens

      // Verificar si todos los mensajes caben dentro del límite
      let totalTokens = estimateMessagesTokens(apiMessages)
      let trimmedMessages = [...apiMessages]

      // Si excedemos el límite, recortar mensajes más antiguos
      if (totalTokens > availableTokens) {
        console.log(
          `Advertencia: El historial de chat (${totalTokens} tokens estimados) excede el límite disponible (${availableTokens} tokens).`,
        )

        // Mantener el último mensaje (la consulta actual)
        const currentMessage = apiMessages[apiMessages.length - 1]
        const currentMessageTokens = estimateMessagesTokens([currentMessage])

        // Recortar mensajes hasta que quepan en el límite
        trimmedMessages = [currentMessage]
        totalTokens = currentMessageTokens

        // Añadir mensajes desde el más reciente hacia atrás
        for (let i = apiMessages.length - 2; i >= 0; i--) {
          const msg = apiMessages[i]
          const msgTokens = estimateMessagesTokens([msg])

          if (totalTokens + msgTokens <= availableTokens) {
            trimmedMessages.unshift(msg)
            totalTokens += msgTokens
          } else {
            break
          }
        }
      }

      // Añadir mensaje de sistema al principio
      return [systemMessage, ...trimmedMessages]
    },
    [selectedProvider],
  )

  const handleDeleteMessage = useCallback(
    async (messageId: string) => {
      if (
        isLoading ||
        Object.keys(requestStartTimeRef.current).length > 0 ||
        messageId === 'intro-message'
      ) {
        return
      }

      const result = await Swal.fire({
        title: '¿Eliminar este turno?',
        text: 'Se eliminarán la pregunta y su respuesta asociada, si existe.',
        icon: 'question',
        iconColor: theme.accent,
        showCancelButton: true,
        confirmButtonText: 'Sí, eliminar',
        confirmButtonColor: theme.accent,
        cancelButtonText: 'Cancelar',
        cancelButtonColor: isDarkTheme ? theme.surface : theme.secondary,
        background: theme.background,
        color: theme.text,
      })

      if (
        !result.isConfirmed ||
        Object.keys(requestStartTimeRef.current).length > 0
      ) {
        return
      }

      setMessages((currentMessages) => {
        const messageIndex = currentMessages.findIndex(
          (message) => message.id === messageId,
        )
        const message = currentMessages[messageIndex]

        if (
          !message ||
          message.id === 'intro-message' ||
          (message.role !== 'user' && message.role !== 'assistant')
        ) {
          return currentMessages
        }

        const messageIdsToDelete = new Set([message.id])

        if (message.role === 'user') {
          const nextMessage = currentMessages[messageIndex + 1]
          if (
            nextMessage?.role === 'assistant' &&
            nextMessage.id !== 'intro-message'
          ) {
            messageIdsToDelete.add(nextMessage.id)
          }
        } else {
          const previousMessage = currentMessages[messageIndex - 1]
          if (previousMessage?.role === 'user') {
            messageIdsToDelete.add(previousMessage.id)
          }
        }

        return currentMessages.filter(
          (currentMessage) => !messageIdsToDelete.has(currentMessage.id),
        )
      })
    },
    [isDarkTheme, isLoading, setMessages, theme],
  )

  // Función para enviar un mensaje al API de Groq
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) return

      // Generar ID único para el mensaje
      const userMessageId = `user_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}` // Filtrar contenido entre etiquetas <think></think> antes de añadirlo al chat
      const filteredContent = content
        .trim()
        .replace(/<think>[\s\S]*?<\/think>/g, '')
        .trim()

      // Añadir mensaje del usuario (con contenido filtrado)
      const userMessage: ChatMessageType = {
        id: userMessageId,
        role: 'user',
        content: filteredContent,
        timestamp: Date.now(),
      }

      // Actualizar mensajes con el nuevo mensaje del usuario
      const updatedMessages = [...messages, userMessage]
      setMessages(updatedMessages)
      setIsLoading(true)

      // Si el mensaje actual solo contiene el mensaje de bienvenida, actualizar el título del chat
      if (messages.length === 1 && messages[0].id === 'intro-message') {
        const newChatId = currentChatId || `chat_${Date.now()}`
        const title =
          content.trim().substring(0, 30) + (content.length > 30 ? '...' : '')

        // Actualizar historial de chat incluyendo el modelo actual
        setChatHistory(
          (
            prevHistory: {
              id: string
              title: string
              date: Date
              model?: string
            }[],
          ) => [
            ...prevHistory.filter(
              (chat: { id: string }) => chat.id !== currentChatId,
            ), // Filtrar el actual si existe
            {
              id: newChatId,
              title: title,
              date: new Date(),
              model: selectedModel, // Guardar el modelo seleccionado actualmente
            },
          ],
        )

        // Actualizar el ID de chat actual
        setCurrentChatId(newChatId)
      } else {
        // Si no es el primer mensaje, actualizar el modelo en el historial
        setChatHistory((prevHistory) =>
          prevHistory.map((chat) =>
            chat.id === currentChatId
              ? { ...chat, model: selectedModel }
              : chat,
          ),
        )
      }

      // Generar un ID único para esta solicitud
      const requestId = `req_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`
      requestStartTimeRef.current[requestId] = Date.now()

      // Obtener proveedor y configuración antes del try-catch
      const provider =
        selectedProvider || localStorage.getItem('selectedProvider') || 'groq'

      const providerConfig = getProviderConfig(provider)

      try {
        if (
          (provider === 'opengo' || provider === 'opencodezen') &&
          !isOpenCodeAvailable()
        ) {
          throw new Error(OPENCODE_UNAVAILABLE_MESSAGE)
        }

        if (!providerConfig) {
          const errorResponseMessage: ChatMessageType = {
            id: `error_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            role: 'assistant',
            content: `Proveedor no configurado: ${provider}`,
            timestamp: Date.now(),
          }
          setMessages((prevMessages: ChatMessageType[]) => [
            ...prevMessages,
            errorResponseMessage,
          ])
          setIsLoading(false)
          delete requestStartTimeRef.current[requestId]
          return
        }

        // Preparar mensajes para enviar como contexto
        const apiMessages = prepareMessagesForApi(
          updatedMessages,
          selectedModel,
        )
        const mustVerifyWebSearch =
          provider === 'gemini' &&
          searchEnabled &&
          requiresFreshWebEvidence(apiMessages)
        const totalTokensUsed = estimateMessagesTokens(apiMessages)
        const modelTokenLimit = getModelTokenLimit(selectedModel, provider)

        const apiKeyStorageKey = getApiKeyStorageKey(provider)
        const apiKey = localStorage.getItem(apiKeyStorageKey) || ''

        if (!apiKey?.trim()) {
          const errorResponseMessage: ChatMessageType = {
            id: `error_${Date.now()}_${Math.random()
              .toString(36)
              .substring(2, 9)}`,
            role: 'assistant',
            content: `Falta API key para ${providerConfig.name}. Guárdala en el menú de configuración antes de enviar mensajes.`,
            timestamp: Date.now(),
          }
          setMessages((prevMessages: ChatMessageType[]) => [
            ...prevMessages,
            errorResponseMessage,
          ])
          setIsLoading(false)
          delete requestStartTimeRef.current[requestId]
          return
        }

        // Solo se piden herramientas de búsqueda si el modelo las soporta:
        // el toggle puede quedar activo al cambiar a un modelo sin soporte.
        const effectiveSearch =
          searchEnabled && supportsWebSearch(selectedModel, provider)
        const toolsConfig: ToolConfig = {
          web_search: effectiveSearch,
          code_interpreter: false,
          visit_website: false,
          wolfram_alpha: false,
          browser_search: effectiveSearch,
          searchEnabled: effectiveSearch,
        }

        let payload: Record<string, unknown>
        let endpoint: string

        if (providerConfig.buildRequest) {
          const customRequest = providerConfig.buildRequest(
            selectedModel,
            apiMessages,
            MAX_RESPONSE_TOKENS,
            toolsConfig,
          )
          if (customRequest) {
            endpoint = customRequest.url
            payload = customRequest.body
          } else {
            payload = providerConfig.payloadBuilder(
              selectedModel,
              apiMessages,
              MAX_RESPONSE_TOKENS,
              toolsConfig,
            )
            endpoint = providerConfig.endpoint(selectedModel)
          }
        } else {
          payload = providerConfig.payloadBuilder(
            selectedModel,
            apiMessages,
            MAX_RESPONSE_TOKENS,
            toolsConfig,
          )
          endpoint = providerConfig.endpoint(selectedModel)
        }
        const headers = {
          'Content-Type': 'application/json',
          ...providerConfig.headerAuth(apiKey, selectedModel),
          ...openCodeSessionHeaders(provider, currentChatId ?? requestId),
        }

        // Log del request sin valores de cabeceras ni credenciales.
        console.log('🚀 Enviando petición al chat:', {
          proveedor: provider,
          proveedorNombre: providerConfig.name,
          modeloSolicitado: selectedModel,
          endpoint: endpoint,
          headers: Object.keys(headers),
          payload: payload,
          totalMensajes: apiMessages.length,
          tokensEstimados: totalTokensUsed,
        })

        let response = await axios.post(endpoint, payload, {
          headers,
        })

        // Log de la respuesta exitosa
        console.log('✅ Respuesta recibida:', {
          proveedor: provider,
          modeloSolicitado: selectedModel,
          modeloDevuelto:
            typeof response.data.model === 'string'
              ? response.data.model
              : null,
          status: response.status,
          dataKeys: Object.keys(response.data),
          responsePreview:
            response.data.choices?.[0]?.message?.content?.substring(0, 100) +
            '...',
        })

        // Extraer texto según el protocolo resuelto para el modelo solicitado.
        const responseData: Record<string, unknown>[] = [
          response.data as Record<string, unknown>,
        ]
        let rawResponse = providerConfig.parseResponse
          ? providerConfig.parseResponse(
              response.data as Record<string, unknown>,
              selectedModel,
            )
          : (response.data.choices[0].message.content as string)

        // Filtrar contenido entre <think></think>
        let filteredResponse = rawResponse
          .replace(/<think>[\s\S]*?<\/think>/g, '')
          .trim()

        if (!filteredResponse) {
          throw new Error('EMPTY_PROVIDER_RESPONSE')
        }

        const continuationRequest = providerConfig.buildSearchContinuation?.(
          selectedModel,
          response.data as Record<string, unknown>,
          filteredResponse,
          toolsConfig,
        )
        if (continuationRequest) {
          response = await axios.post(
            continuationRequest.url,
            continuationRequest.body,
            { headers },
          )
          responseData.push(response.data as Record<string, unknown>)
          rawResponse = providerConfig.parseResponse
            ? providerConfig.parseResponse(
                response.data as Record<string, unknown>,
                selectedModel,
              )
            : (response.data.choices[0].message.content as string)
          filteredResponse = rawResponse
            .replace(/<think>[\s\S]*?<\/think>/g, '')
            .trim()

          if (!filteredResponse) {
            throw new Error('EMPTY_PROVIDER_RESPONSE')
          }

          if (
            providerConfig.buildSearchContinuation?.(
              selectedModel,
              response.data as Record<string, unknown>,
              filteredResponse,
              toolsConfig,
            )
          ) {
            throw new Error('INCOMPLETE_WEB_SEARCH_RESPONSE')
          }
        }

        const endTime = Date.now()
        const responseTime =
          endTime - (requestStartTimeRef.current[requestId] || endTime)
        const formattedTime = formatResponseTime(responseTime)

        // Preferir el modelo devuelto; si falta, conservar el solicitado sin asumir confirmación.
        const actualModel = providerConfig.parseActualModel
          ? providerConfig.parseActualModel(
              response.data as Record<string, unknown>,
            ) || selectedModel
          : selectedModel

        const finalData = responseData[responseData.length - 1] as {
          usage?: Record<string, unknown>
          usageMetadata?: Record<string, unknown>
        }
        const rawUsage = finalData.usage || finalData.usageMetadata
        let promptTokens = totalTokensUsed
        let completionTokens = 0
        if (rawUsage && typeof rawUsage === 'object') {
          const rawPrompt =
            rawUsage.prompt_tokens ??
            rawUsage.input_tokens ??
            rawUsage.total_input_tokens ??
            rawUsage.promptTokenCount
          if (typeof rawPrompt === 'number') promptTokens = rawPrompt
          const rawCompletion =
            rawUsage.completion_tokens ??
            rawUsage.output_tokens ??
            rawUsage.total_output_tokens ??
            rawUsage.candidatesTokenCount
          if (typeof rawCompletion === 'number')
            completionTokens = rawCompletion
        }

        // Parsear herramientas ejecutadas si existe el hook en el proveedor
        const executedTools = providerConfig.parseExecutedTools
          ? providerConfig.parseExecutedTools(
              response.data as Record<string, unknown>,
              selectedModel,
            )
          : undefined

        // Extraer citaciones si el proveedor tiene parseCitations o si Groq tiene executedTools
        let parsedCitations: Citation[] = []
        if (providerConfig.parseCitations) {
          parsedCitations = responseData.flatMap(
            (data) =>
              providerConfig.parseCitations?.(data, selectedModel) ?? [],
          )
        } else if (executedTools) {
          for (const tool of executedTools) {
            if (tool.type === 'search' || tool.type === 'browser_search') {
              const results = tool.search_results as any[]
              if (Array.isArray(results)) {
                for (const res of results) {
                  if (res && res.url) {
                    parsedCitations.push({
                      url: res.url,
                      title: res.title || undefined,
                      snippet: res.snippet || res.content || undefined,
                    })
                  }
                }
              }
            }
          }
        }
        const sanitizedCitations = sanitizeCitations(parsedCitations)

        if (mustVerifyWebSearch && sanitizedCitations.length === 0) {
          throw new Error('UNVERIFIED_WEB_SEARCH_RESPONSE')
        }

        const searchState = providerConfig.parseSearchState
          ? providerConfig.parseSearchState(
              response.data as Record<string, unknown>,
              selectedModel,
            )
          : undefined

        // Añadir respuesta del asistente con info de tokens
        const assistantMessage: ChatMessageType = {
          id: `assistant_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          role: 'assistant',
          content: filteredResponse,
          timestamp: Date.now(),
          responseTime: formattedTime,
          tokensUsed: promptTokens,
          tokenLimit: modelTokenLimit,
          modelName: actualModel,
          requestedModelId: selectedModel,
          promptTokens: promptTokens,
          completionTokens: completionTokens,
          executedTools:
            executedTools && executedTools.length > 0
              ? executedTools
              : undefined,
          citations:
            sanitizedCitations.length > 0 ? sanitizedCitations : undefined,
          searchState: searchState,
        }

        setMessages((prevMessages: ChatMessageType[]) => [
          ...prevMessages,
          assistantMessage,
        ])
      } catch (error) {
        // Log detallado del error
        console.error('❌ Error al obtener respuesta:', {
          proveedor: provider,
          modelo: selectedModel,
          endpoint: providerConfig?.endpoint(selectedModel),
          errorType: axios.isAxiosError(error) ? error.code : 'Unknown',
          errorMessage: axios.isAxiosError(error)
            ? error.message
            : String(error),
          errorResponse: axios.isAxiosError(error)
            ? error.response?.data
            : undefined,
          errorStatus: axios.isAxiosError(error)
            ? error.response?.status
            : undefined,
        })

        let errorMessage =
          'Error al obtener respuesta. Por favor, intenta de nuevo.'

        if (
          error instanceof Error &&
          error.message === OPENCODE_UNAVAILABLE_MESSAGE
        ) {
          errorMessage = error.message
        } else if (
          error instanceof Error &&
          error.message === 'EMPTY_PROVIDER_RESPONSE'
        ) {
          errorMessage = `${providerConfig?.name || 'El proveedor'} devolvió una respuesta sin texto. No se guardó como respuesta válida; vuelve a intentarlo.`
        } else if (
          error instanceof Error &&
          error.message === 'UNVERIFIED_WEB_SEARCH_RESPONSE'
        ) {
          errorMessage =
            'Gemini respondió sin fuentes que demuestren una búsqueda web. La respuesta fue descartada para evitar mostrar información antigua o inventada. Vuelve a intentarlo.'
        } else if (
          error instanceof Error &&
          error.message === 'INCOMPLETE_WEB_SEARCH_RESPONSE'
        ) {
          errorMessage =
            'Gemini agotó la búsqueda adicional sin completar todos los datos solicitados. La respuesta parcial fue descartada para no presentarla como completa.'
        }

        if (axios.isAxiosError(error)) {
          if (error.code === 'ERR_NETWORK') {
            if (providerConfig?.warning) {
              errorMessage = providerConfig.warning
            } else {
              errorMessage = `Error de red: No se pudo conectar con ${providerConfig?.name}. Verifica tu conexión y que el API Key sea válido.`
            }
          } else if (error.response) {
            const serverMessage = getApiErrorMessage(error.response.data)
            if (error.response.status === 529) {
              errorMessage =
                serverMessage ||
                `${providerConfig?.name || 'El servidor'} está temporalmente sobrecargado. Por favor, intenta de nuevo en unos segundos.`
            } else if (
              error.response.status === 401 ||
              error.response.status === 403
            ) {
              errorMessage = serverMessage
                ? isInvalidApiKeyError(error.response.data)
                  ? `API Key inválida para ${providerConfig?.name}: ${serverMessage}`
                  : serverMessage
                : `Acceso no autorizado para ${providerConfig?.name}.`
            } else if (error.response.status === 429) {
              let detailedMessage =
                serverMessage ||
                `Límite de solicitudes alcanzado en ${providerConfig?.name}. Espera un momento antes de intentar de nuevo.`

              // Intentar extraer el tiempo de espera si existe en el mensaje (ej: 17m48.768s o 1h7m8.832s)
              const tryAgainMatch = detailedMessage.match(
                /try again in ([0-9a-zA-Z.]+)/i,
              )
              if (tryAgainMatch && tryAgainMatch[1]) {
                const durationStr = tryAgainMatch[1]
                let seconds = 0

                const dMatch = durationStr.match(/(\d+)d/)
                const hMatch = durationStr.match(/(\d+)h/)
                const mMatch = durationStr.match(/(\d+)m/)
                const sMatch = durationStr.match(/([\d.]+)s/)

                if (dMatch) seconds += Number.parseInt(dMatch[1]) * 86400
                if (hMatch) seconds += Number.parseInt(hMatch[1]) * 3600
                if (mMatch) seconds += Number.parseInt(mMatch[1]) * 60
                if (sMatch) seconds += Number.parseFloat(sMatch[1])

                if (seconds > 0) {
                  const unlockDate = new Date(Date.now() + seconds * 1000)

                  const timeFormatter = new Intl.DateTimeFormat('es-AR', {
                    timeZone: 'America/Argentina/Buenos_Aires',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                    hour12: false,
                  })

                  const formattedUnlockTime = timeFormatter.format(unlockDate)

                  const parts: string[] = []
                  if (dMatch)
                    parts.push(
                      `${dMatch[1]} día${Number.parseInt(dMatch[1]) > 1 ? 's' : ''}`,
                    )
                  if (hMatch)
                    parts.push(
                      `${hMatch[1]} hora${Number.parseInt(hMatch[1]) > 1 ? 's' : ''}`,
                    )
                  if (mMatch)
                    parts.push(
                      `${mMatch[1]} minuto${Number.parseInt(mMatch[1]) > 1 ? 's' : ''}`,
                    )
                  if (sMatch) {
                    const secVal = Math.round(Number.parseFloat(sMatch[1]))
                    if (secVal > 0) {
                      parts.push(`${secVal} segundo${secVal > 1 ? 's' : ''}`)
                    }
                  }

                  const readableDuration = parts.join(', ')

                  detailedMessage += `\n\n⏰ **Estimación de desbloqueo (GMT-3 Buenos Aires):** Desbloqueado a las **${formattedUnlockTime} hs** (dentro de aproximadamente ${readableDuration || 'unos segundos'}).`
                }
              }
              errorMessage = detailedMessage
            } else {
              errorMessage = `Error del servidor (${error.response.status}): ${
                serverMessage || 'Error desconocido'
              }`
            }
          }
        }

        // Añadir mensaje de error
        const errorResponseMessage: ChatMessageType = {
          id: `error_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`,
          role: 'assistant',
          content: errorMessage,
          timestamp: Date.now(),
        }

        setMessages((prevMessages: ChatMessageType[]) => [
          ...prevMessages,
          errorResponseMessage,
        ])
      } finally {
        setIsLoading(false)
        delete requestStartTimeRef.current[requestId]
      }
    },
    [
      messages,
      selectedModel,
      selectedProvider,
      currentChatId,
      setCurrentChatId,
      setChatHistory,
      setIsLoading,
      setMessages,
      prepareMessagesForApi,
      searchEnabled,
    ],
  )

  // Escuchar el evento personalizado para enviar mensajes
  useEffect(() => {
    const handleSendMessage = (event: Event) => {
      const customEvent = event as CustomEvent<{ message: string }>
      sendMessage(customEvent.detail.message)
    }

    document.addEventListener(
      'send-message',
      handleSendMessage as EventListener,
    )

    return () => {
      document.removeEventListener(
        'send-message',
        handleSendMessage as EventListener,
      )
    }
  }, [sendMessage])

  // Cuando la IA responde o se agrega un mensaje del asistente, enfocar input
  useEffect(() => {
    if (
      messages.length > 0 &&
      messages[messages.length - 1].role === 'assistant'
    ) {
      if (onFocusInput) onFocusInput()
    }
  }, [messages, onFocusInput])

  return (
    <>
      {/* Contenido principal (chat) */}
      <div
        className="fixed inset-x-0 overflow-hidden "
        style={{
          top: `var(--header-height, ${HEADER_HEIGHT_MOBILE})`,
          bottom: `var(--footer-height, ${FOOTER_HEIGHT_MOBILE})`,
          backgroundColor: theme.background,
        }}
      >
        <ChatArea
          messages={messages}
          isLoading={isLoading}
          theme={theme}
          isDarkTheme={isDarkTheme}
          onRepeatMessage={onRepeatMessage}
          onDeleteMessage={handleDeleteMessage}
          searchEnabled={searchEnabled}
          selectedModel={selectedModel}
          selectedProvider={selectedProvider}
        />
      </div>

      {/* Menús laterales */}
      <LeftMenu
        isOpen={leftMenuOpen}
        onClose={onCloseLeftMenu}
        theme={theme}
        isDarkTheme={isDarkTheme}
        chatHistory={chatHistory}
        onSelectChat={onSelectChat}
        onNewChat={onNewChat}
        currentChatId={currentChatId}
        onUpdateChatTitle={onUpdateChatTitle}
        onDeleteChat={onDeleteChat} // Pasar la función para eliminar chats
      />

      <RightMenu
        isOpen={rightMenuOpen}
        onClose={onCloseRightMenu}
        theme={theme}
        isDarkTheme={isDarkTheme}
        toggleTheme={toggleTheme} // Ahora pasamos la función real para cambiar el tema
        selectedModel={selectedModel}
        selectedProvider={selectedProvider}
        onModelChange={onModelChange}
      />
    </>
  )
}

export default ChatContainer

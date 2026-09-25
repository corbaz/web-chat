import type React from 'react'
import { useEffect, useRef } from 'react'
import { supportsWebSearch } from '../../config/webSearch'
import type { ChatMessageType } from '../../interfaces/chat/chatTypes'
import type { ColorPalette } from '../../interfaces/temas/temas'
import ChatMessage from '../chat/ChatMessage'

interface ChatAreaProps {
  messages: ChatMessageType[]
  isLoading: boolean
  theme: ColorPalette
  isDarkTheme: boolean
  onRepeatMessage?: (message: string) => void
  onDeleteMessage?: (messageId: string) => void
  searchEnabled?: boolean
  selectedModel?: string
  selectedProvider?: string
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  theme,
  isDarkTheme,
  onRepeatMessage,
  onDeleteMessage,
  searchEnabled = true,
  selectedModel,
  selectedProvider,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const isInitialMount = useRef(true)

  // Hacer scroll al fondo absoluto cuando cambian los mensajes
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    if (isInitialMount.current) {
      // Primer mount: esperar layout y llevar directo al fondo
      // Luego estabilizar el fondo durante varios frames por si el contenido sigue creciendo
      const stabilizeBottom = () => {
        let frames = 0
        const maxFrames = 24 // ~400ms a 60fps
        const step = () => {
          const node = containerRef.current
          if (!node) return
          node.scrollTop = node.scrollHeight
          frames++
          if (frames < maxFrames) requestAnimationFrame(step)
        }
        requestAnimationFrame(step)
      }

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollTop = el.scrollHeight
          stabilizeBottom()
          isInitialMount.current = false
        })
      })
    } else {
      // Nuevos mensajes: scroll suave
      el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' })
    }
  }, [messages, isLoading])

  return (
    <div className="flex justify-center w-full h-full">
      <div
        className="w-full h-full overflow-y-auto px-3 pt-5 pb-6 space-y-4 sm:pt-3 sm:pb-0 sm:px-5 md:px-8 lg:px-10 xl:px-12"
        ref={containerRef}
        style={{
          backgroundColor: theme.messages.ai.background,
        }}
        aria-live="polite"
        aria-relevant="additions"
      >
        {messages.map((message, index) => (
          <div key={message.id} className={index === 0 ? 'mt-4' : ''}>
            <ChatMessage
              message={message}
              theme={theme}
              isDarkTheme={isDarkTheme}
              onRepeatMessage={onRepeatMessage}
              onDeleteMessage={onDeleteMessage}
              isDeleteDisabled={isLoading}
            />
          </div>
        ))}

        {isLoading && (
          <div
            className="flex flex-col items-center justify-center p-3.5 rounded-2xl my-12 gap-2 mx-auto max-w-[200px]"
            style={{
              backgroundColor: theme.messages.user.background,
              boxShadow: theme.shadow.sm,
            }}
          >
            {selectedModel &&
            supportsWebSearch(selectedModel, selectedProvider) &&
            searchEnabled ? (
              <div
                className="flex items-center gap-1.5 text-xs font-semibold animate-pulse"
                style={{ color: theme.accent }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-4 animate-spin"
                >
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                  <path d="M2 12h20" />
                </svg>
                <span>Buscando en la web...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-2">
                <span
                  className="size-2.5 rounded-full inline-block opacity-60 animate-typing"
                  style={{
                    backgroundColor: theme.messages.user.text,
                  }}
                ></span>
                <span
                  className="size-2.5 rounded-full inline-block opacity-60 animate-typing animation-delay-[200ms]"
                  style={{
                    backgroundColor: theme.messages.user.text,
                  }}
                ></span>
                <span
                  className="size-2.5 rounded-full inline-block opacity-60 animate-typing animation-delay-[400ms]"
                  style={{
                    backgroundColor: theme.messages.user.text,
                  }}
                ></span>
              </div>
            )}
          </div>
        )}

        {/* Elemento vacío para hacer scroll automático */}
        <div ref={messagesEndRef} />
      </div>
    </div>
  )
}

export default ChatArea

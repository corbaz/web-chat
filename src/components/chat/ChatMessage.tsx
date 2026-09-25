import type React from 'react'
import { lazy, Suspense, useState } from 'react'
import type { ChatMessageType } from '../../interfaces/chat/chatTypes.ts'
import type { ColorPalette } from '../../interfaces/temas/temas.tsx'
import { useModelCatalog } from '../../services/modelCatalog/useModelCatalog'
import './markdown-styles.css'

const MarkdownRenderer = lazy(() => import('../chat/MarkdownRenderer.tsx'))

interface ChatMessageProps {
  message: ChatMessageType
  theme: ColorPalette
  isDarkTheme?: boolean
  onRepeatMessage?: (message: string) => void
  onDeleteMessage?: (messageId: string) => void
  isDeleteDisabled?: boolean
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  theme,
  onRepeatMessage,
  onDeleteMessage,
  isDeleteDisabled = false,
}) => {
  const isUser = message.role === 'user'
  const isDeletable =
    message.id !== 'intro-message' &&
    (message.role === 'user' || message.role === 'assistant')

  const allModels = useModelCatalog()

  const getModelShortName = (modelId?: string): string => {
    if (!modelId) return 'modelo'
    const model = allModels.find((m) => m.id === modelId)
    if (model) return model.name
    return modelId.split('/').pop()?.split('-')[0] || modelId
  }

  const formatResponseTimeToMs = (responseTime: string): string => {
    const t = parseFloat(responseTime.replace('s', ''))
    return t < 1 ? `${Math.round(t * 1000)}ms` : responseTime
  }

  const [copied, setCopied] = useState(false)

  const handleCopyMessage = async () => {
    const copy = async () => {
      try {
        await navigator.clipboard.writeText(message.content)
        setCopied(true)
        setTimeout(() => setCopied(false), 2000)
      } catch {
        const textarea = document.createElement('textarea')
        textarea.value = message.content
        textarea.style.cssText = 'position:fixed;top:-9999px'
        document.body.appendChild(textarea)
        textarea.focus()
        textarea.select()
        try {
          document.execCommand('copy')
          setCopied(true)
          setTimeout(() => setCopied(false), 2000)
        } catch (e) {
          console.error('Error al copiar mensaje:', e)
        } finally {
          document.body.removeChild(textarea)
        }
      }
    }
    await copy()
  }

  const handleRepeatMessage = () => {
    if (onRepeatMessage) onRepeatMessage(message.content)
  }

  // ── Neumorphic message styles ────────────────────────────────────────────
  const userMsgStyle: React.CSSProperties = {
    backgroundColor: theme.messages.user.background,
    color: theme.messages.user.text,
    boxShadow: theme.shadow.outer,
    borderLeft: `3px solid ${theme.accent}`,
    borderRadius: '16px 4px 16px 16px',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    hyphens: 'auto',
  }

  const aiMsgStyle: React.CSSProperties = {
    backgroundColor: theme.messages.ai.background,
    color: theme.messages.ai.text,
    boxShadow: theme.shadow.inset,
    borderLeft: `3px solid ${theme.accentAlt}`,
    borderRadius: '4px 16px 16px 16px',
    overflowWrap: 'break-word',
    wordBreak: 'break-word',
    hyphens: 'auto',
  }

  // Neumorphic action button
  const actionBtnStyle: React.CSSProperties = {
    backgroundColor: theme.background,
    color: theme.textMuted,
    boxShadow: theme.shadow.sm,
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
  }

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div
        className="max-w-[82%] md:max-w-[72%] px-4 py-3"
        style={isUser ? userMsgStyle : aiMsgStyle}
      >
        {/* Message content */}
        <div
          className={`text-sm leading-relaxed overflow-hidden ${
            isUser
              ? 'whitespace-pre-wrap text-left user-markdown'
              : 'markdown-content'
          }`}
        >
          <Suspense
            fallback={<div className="p-2 opacity-60">{message.content}</div>}
          >
            <MarkdownRenderer content={message.content} />
          </Suspense>
        </div>

        {/* Fuentes / Citaciones */}
        {!isUser && (
          <>
            {message.searchState === 'incomplete' && (
              <div
                className="text-xs italic mt-2 flex items-center gap-1 opacity-75"
                style={{ color: theme.accent }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="size-3 shrink-0"
                >
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                Búsqueda web incompleta o pausada por el proveedor.
              </div>
            )}
            {message.citations && message.citations.length > 0 && (
              <div
                className="mt-3 pt-2.5"
                style={{
                  borderTop: `1px solid ${theme.textMuted}20`,
                }}
              >
                <p
                  className="text-xs font-bold tracking-wide uppercase mb-1.5 flex items-center gap-1"
                  style={{ color: theme.accent }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-3.5 shrink-0"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  Fuentes
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {message.citations.map((cit, idx) => {
                    let host = ''
                    try {
                      host = new URL(cit.url).hostname.replace(/^www\./i, '')
                    } catch {
                      host = 'Enlace'
                    }
                    const title = cit.title || host
                    return (
                      <a
                        key={cit.url}
                        href={cit.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs px-2.5 py-1 rounded-lg transition-all duration-200 border flex items-center gap-1 hover:opacity-80"
                        title={cit.snippet || title}
                        style={{
                          backgroundColor: `${theme.accent}08`,
                          borderColor: `${theme.accent}20`,
                          color: theme.accent,
                        }}
                      >
                        <span className="max-w-30 truncate">{title}</span>
                        <span className="text-[10px] opacity-60">
                          [{idx + 1}]
                        </span>
                      </a>
                    )
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* AI metadata */}
        {!isUser && (
          <div className="flex flex-col gap-0.5 mt-2.5">
            {message.modelName && (
              <div
                className="text-xs text-right"
                style={{ color: theme.textMuted }}
              >
                ⏱ {getModelShortName(message.modelName)}
                {message.requestedModelId &&
                  message.requestedModelId !== message.modelName && (
                    <span>
                      {' '}
                      (pedido: {getModelShortName(message.requestedModelId)})
                    </span>
                  )}
                {message.responseTime &&
                  ` · ${formatResponseTimeToMs(message.responseTime)}`}
              </div>
            )}
            {message.tokensUsed !== undefined &&
              message.tokenLimit !== undefined && (
                <div
                  className="text-xs text-right"
                  style={{ color: theme.textMuted }}
                >
                  📊{' '}
                  {message.promptTokens !== undefined &&
                  message.completionTokens !== undefined ? (
                    <span>
                      Tokens de este mensaje:{' '}
                      {message.promptTokens + message.completionTokens}{' '}
                      (Entrada: {message.promptTokens} | Salida:{' '}
                      {message.completionTokens}) · Límite de contexto:{' '}
                      {message.tokenLimit.toLocaleString()} (Usado:{' '}
                      {Math.max(
                        0.1,
                        Math.round(
                          ((message.promptTokens + message.completionTokens) /
                            message.tokenLimit) *
                            1000,
                        ) / 10,
                      )}
                      %)
                    </span>
                  ) : (
                    <span>
                      Tokens totales: {message.tokensUsed.toLocaleString()} /
                      Límite de contexto: {message.tokenLimit.toLocaleString()}
                    </span>
                  )}
                </div>
              )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 mt-2.5 justify-end">
          {isUser && isDeletable && (
            <button
              type="button"
              onClick={() => onDeleteMessage?.(message.id)}
              disabled={isDeleteDisabled}
              aria-label="Eliminar este turno de la conversación"
              title={
                isDeleteDisabled
                  ? 'No se puede eliminar mientras se genera una respuesta'
                  : 'Eliminar turno'
              }
              className="nm-press inline-flex items-center gap-1 text-xs px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                ...actionBtnStyle,
                cursor: isDeleteDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="size-3.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12m-10 0V5h8v2m-9 0 1 13h8l1-13M10 11v5m4-5v5"
                />
              </svg>
              Eliminar
            </button>
          )}

          <button
            type="button"
            onClick={handleCopyMessage}
            title={copied ? '¡Copiado!' : 'Copiar'}
            className="nm-press inline-flex items-center gap-1 text-xs px-2 py-1"
            style={actionBtnStyle}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="currentColor"
              className="size-3.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
              />
            </svg>
            {copied ? '¡Copiado!' : 'Copiar'}
          </button>

          {isUser && (
            <button
              type="button"
              onClick={handleRepeatMessage}
              title="Repetir pregunta"
              className="nm-press inline-flex items-center gap-1 text-xs px-2 py-1"
              style={actionBtnStyle}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="size-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Repetir
            </button>
          )}

          {!isUser && isDeletable && (
            <button
              type="button"
              onClick={() => onDeleteMessage?.(message.id)}
              disabled={isDeleteDisabled}
              aria-label="Eliminar este turno de la conversación"
              title={
                isDeleteDisabled
                  ? 'No se puede eliminar mientras se genera una respuesta'
                  : 'Eliminar turno'
              }
              className="nm-press inline-flex items-center gap-1 text-xs px-2 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                ...actionBtnStyle,
                cursor: isDeleteDisabled ? 'not-allowed' : 'pointer',
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="size-3.5"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 7h12m-10 0V5h8v2m-9 0 1 13h8l1-13M10 11v5m4-5v5"
                />
              </svg>
              Eliminar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default ChatMessage

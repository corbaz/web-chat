import axios from 'axios'
import type React from 'react'
import { useEffect, useImperativeHandle, useRef, useState } from 'react'
import EscobaIcon from '../../assets/escoba.svg'
import LunaIcon from '../../assets/luna.svg'
import TrashIcon from '../../assets/trash.svg'
import VaritaIcon from '../../assets/varita_magica.svg'
import {
  getApiKeyStorageKey,
  getProviderConfig,
  openCodeSessionHeaders,
} from '../../config/providers'
import { supportsVision } from '../../config/vision'
import { supportsWebSearch } from '../../config/webSearch'
import {
  CHAT_HISTORY_KEY,
  type ImageAttachment,
} from '../../interfaces/chat/chatTypes'
import type { ColorPalette } from '../../interfaces/temas/temas'
import { isMobile } from '../../utils/mobileUtils'

// Constantes de adjuntos de imagen (T3, ver odd/tasks/image-input.md).
const MAX_IMAGES = 4
const ACCEPTED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
]
const MAX_LONG_SIDE = 2048
// Groq limita 4 MB de base64; nos quedamos con margen antes de reencodar.
const MAX_BASE64_LENGTH = 3.5 * 1024 * 1024
const DOWNSCALE_JPEG_QUALITY = 0.85

const readImageElement = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const img = new Image()
    const objectUrl = URL.createObjectURL(file)
    img.onload = () => {
      resolve(img)
    }
    img.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('No se pudo leer la imagen'))
    }
    img.src = objectUrl
  })

// Downscala una imagen al lado largo máximo (2048px) con canvas y la
// reencoda a JPEG ~0.85 si el base64 resultante supera ~3.5 MB. Los GIF se
// aplanan a PNG: canvas no conserva animación (fuera de alcance).
const processImageFile = async (
  file: File,
): Promise<ImageAttachment | null> => {
  if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) return null

  let objectUrl = ''
  try {
    const img = await readImageElement(file)
    objectUrl = img.src
    const longSide = Math.max(img.naturalWidth, img.naturalHeight) || 1
    const scale = longSide > MAX_LONG_SIDE ? MAX_LONG_SIDE / longSide : 1
    const width = Math.max(1, Math.round(img.naturalWidth * scale))
    const height = Math.max(1, Math.round(img.naturalHeight * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return null
    ctx.drawImage(img, 0, 0, width, height)

    let mimeType = file.type === 'image/gif' ? 'image/png' : file.type
    let dataUrl = canvas.toDataURL(mimeType)
    let data = dataUrl.split(',')[1] ?? ''

    if (data.length > MAX_BASE64_LENGTH) {
      mimeType = 'image/jpeg'
      dataUrl = canvas.toDataURL('image/jpeg', DOWNSCALE_JPEG_QUALITY)
      data = dataUrl.split(',')[1] ?? ''
    }

    if (!data) return null
    const id = `img_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
    return { mimeType, data, id }
  } catch (error) {
    console.error('Error al procesar la imagen adjunta:', error)
    return null
  } finally {
    if (objectUrl) URL.revokeObjectURL(objectUrl)
  }
}

const imageToDataUrl = (image: ImageAttachment): string =>
  `data:${image.mimeType};base64,${image.data}`

interface FooterProps {
  onSendMessage: (message: string, images?: ImageAttachment[]) => void
  toggleTheme: () => void
  clearContext?: () => void
  hasContext?: boolean
  theme: ColorPalette
  isDarkTheme: boolean
  isLoading: boolean
  chatTitle?: string
  onUpdateChatTitle?: (newTitle: string) => void
  currentChatId?: string
  selectedModel?: string
  selectedProvider?: string
  onCloseMenus?: () => void
  ref?: React.Ref<FooterRef>
  searchEnabled?: boolean
  onToggleSearch?: () => void
}

export interface FooterRef {
  focusTextarea: () => void
  setMessage: (msg: string) => void
}

const Footer: React.FC<FooterProps> = ({
  onSendMessage,
  toggleTheme,
  clearContext,
  hasContext = false,
  theme,
  isDarkTheme,
  isLoading,
  chatTitle,
  onUpdateChatTitle,
  currentChatId,
  selectedModel,
  selectedProvider,
  onCloseMenus,
  ref,
  searchEnabled = true,
  onToggleSearch,
}) => {
  const [message, setMessage] = useState('')
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitleValue, setEditTitleValue] = useState('')
  const [isMagicLoading, setIsMagicLoading] = useState(false)
  const [showMagicResponse, setShowMagicResponse] = useState(false)
  const [copyFeedback, setCopyFeedback] = useState(false)
  const [pasteFeedback, setPasteFeedback] = useState(false)
  const [pendingImages, setPendingImages] = useState<ImageAttachment[]>([])
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const titleInputRef = useRef<HTMLInputElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const mobileDevice = typeof window !== 'undefined' && isMobile()

  const visionEnabled = Boolean(
    selectedModel && supportsVision(selectedModel, selectedProvider),
  )

  // Si el modelo cambia a uno sin visión, se descartan los adjuntos
  // pendientes: no tiene sentido enviarlos y el botón de adjuntar desaparece.
  useEffect(() => {
    if (!visionEnabled && pendingImages.length > 0) setPendingImages([])
  }, [visionEnabled, pendingImages.length])

  const addImageFiles = async (files: File[]) => {
    const room = MAX_IMAGES - pendingImages.length
    if (room <= 0) return
    const results = await Promise.all(
      files.slice(0, room).map((file) => processImageFile(file)),
    )
    const valid = results.filter((img): img is ImageAttachment => img !== null)
    if (valid.length > 0) {
      setPendingImages((prev) => [...prev, ...valid].slice(0, MAX_IMAGES))
    }
  }

  const handleAttachClick = () => {
    if (!visionEnabled || pendingImages.length >= MAX_IMAGES) return
    fileInputRef.current?.click()
  }

  const handleFilesSelected = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const files = e.target.files ? Array.from(e.target.files) : []
    e.target.value = '' // permite volver a elegir el mismo archivo
    if (files.length > 0) await addImageFiles(files)
  }

  const handleRemoveImage = (id: string | undefined) => {
    setPendingImages((prev) => prev.filter((image) => image.id !== id))
  }

  useImperativeHandle(ref, () => ({
    focusTextarea: () => {
      if (textareaRef.current && !mobileDevice) textareaRef.current.focus()
    },
    setMessage: (msg: string) => {
      setMessage(msg)
      setTimeout(() => {
        if (textareaRef.current) textareaRef.current.focus()
      }, 50)
    },
  }))

  const adjustTextareaHeight = () => {
    const el = textareaRef.current
    if (el) {
      el.style.cssText += `;height:auto;height:${Math.min(
        el.scrollHeight,
        120,
      )}px`
    }
  }

  useEffect(() => {
    if (message === '' && textareaRef.current)
      textareaRef.current.style.cssText += ';height:auto'
  }, [message])

  const updateDraftMessage = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value)
    if (showMagicResponse) setShowMagicResponse(false)
    adjustTextareaHeight()
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const isTypingKey =
      e.key.length === 1 ||
      ['Backspace', 'Delete', 'Enter', 'Space'].includes(e.key)
    if (isTypingKey && onCloseMenus) onCloseMenus()
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const handleSendMessage = () => {
    if ((message.trim() || pendingImages.length > 0) && !isLoading) {
      onSendMessage(
        message,
        pendingImages.length > 0 ? pendingImages : undefined,
      )
      setMessage('')
      setPendingImages([])
      setShowMagicResponse(false)
      if (mobileDevice && document.activeElement instanceof HTMLElement)
        document.activeElement.blur()
    }
  }

  // Pega imágenes del portapapeles (Ctrl+V) cuando el modelo soporta
  // visión; el paste de texto normal sigue funcionando sin cambios porque
  // solo se intercepta el evento cuando hay archivos de imagen presentes.
  const handlePasteImages = (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    if (!visionEnabled) return
    const items = e.clipboardData?.items
    if (!items) return

    const imageFiles: File[] = []
    for (const item of Array.from(items)) {
      if (item.kind === 'file' && ACCEPTED_IMAGE_TYPES.includes(item.type)) {
        const file = item.getAsFile()
        if (file) imageFiles.push(file)
      }
    }
    if (imageFiles.length === 0) return

    e.preventDefault()
    void addImageFiles(imageFiles)
  }

  const handleMagicButton = async () => {
    if (message.trim() && !isLoading && !isMagicLoading) {
      try {
        setIsMagicLoading(true)
        let modelToUse: string = selectedModel || 'openai/gpt-oss-120b'

        if (!selectedModel && currentChatId) {
          try {
            const raw = localStorage.getItem(CHAT_HISTORY_KEY)
            if (raw) {
              const arr = JSON.parse(raw)
              const chat = arr.find(
                (c: { id: string }) => c.id === currentChatId,
              )
              if (chat?.model) modelToUse = chat.model
            }
          } catch (e) {
            console.error('Error al obtener modelo del chat:', e)
          }
        }

        const promptToSend = `Corrige y mejora la expresión en español del siguiente texto,
asegurándote de que la gramática y la sintaxis sean impecables.El texto debe ser formal, profesional, técnico, siempre amigable, sencillo y preciso. El prompt que se recupera debe ser redactado como si lo escribiera el usuario y no el asistente. Dame solo el texto corregido sin explicaciones. En formato markdown enriquecido.

Texto a mejorar:
${message}`

        const provider =
          selectedProvider || localStorage.getItem('selectedProvider') || 'groq'
        const providerConfig = getProviderConfig(provider)
        if (!providerConfig) {
          setIsMagicLoading(false)
          alert(`Proveedor no configurado: ${provider}`)
          return
        }

        const apiKey = localStorage.getItem(getApiKeyStorageKey(provider)) || ''
        if (!apiKey?.trim()) {
          setIsMagicLoading(false)
          alert(`Falta API key para ${providerConfig.name}`)
          return
        }

        // Varita mágica: sin herramientas integradas (Fase 1: undefined).
        const payload = providerConfig.payloadBuilder(
          modelToUse,
          [{ role: 'user', content: promptToSend }],
          2048,
          undefined,
        )
        const response = await axios.post(
          providerConfig.endpoint(modelToUse),
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
              ...providerConfig.headerAuth(apiKey, modelToUse),
              ...openCodeSessionHeaders(
                provider,
                currentChatId ?? `magic_${Date.now()}`,
              ),
            },
          },
        )

        let improved = providerConfig.parseResponse
          ? providerConfig
              .parseResponse(
                response.data as Record<string, unknown>,
                modelToUse,
              )
              .trim()
          : response.data.choices[0].message.content.trim()
        improved = improved.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
        setMessage(improved)
        setShowMagicResponse(true)
        setTimeout(adjustTextareaHeight, 0)
        textareaRef.current?.focus()
      } catch (error) {
        console.error('Error en varita mágica:', error)
      } finally {
        setIsMagicLoading(false)
      }
    }
  }

  const handleClearText = () => {
    setMessage('')
    setShowMagicResponse(false)
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.focus()
    }
  }

  const handlePasteFromClipboard = async () => {
    const applyPastedText = (text: string) => {
      if (!text) return
      setMessage(text)
      if (showMagicResponse) setShowMagicResponse(false)
      requestAnimationFrame(adjustTextareaHeight)
    }

    const focusForManualPaste = () => {
      const textarea = textareaRef.current
      if (textarea) {
        textarea.focus()
        const end = textarea.value.length
        textarea.setSelectionRange(end, end)
      }
      setPasteFeedback(true)
      setTimeout(() => setPasteFeedback(false), 2500)
    }

    // Intentar primero con la Clipboard API moderna
    if (navigator.clipboard?.readText) {
      try {
        const text = await navigator.clipboard.readText()
        applyPastedText(text)
        textareaRef.current?.focus()
        return
      } catch {
        // Si falla por permisos/origen no seguro, enfocamos el textarea para Ctrl+V.
        focusForManualPaste()
        return
      }
    }

    // En HTTP/LAN los navegadores bloquean lectura programática del portapapeles.
    focusForManualPaste()
  }

  const handleCopyToClipboard = async () => {
    if (!message.trim()) return
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(message)
      } else {
        // Fallback execCommand
        textareaRef.current?.select()
        document.execCommand('copy')
      }
      setCopyFeedback(true)
      setTimeout(() => setCopyFeedback(false), 1500)
    } catch (err) {
      console.error('Error al copiar al portapapeles:', err)
    }
  }

  const handleTitleClick = () => {
    if (!isLoading && chatTitle && currentChatId && onUpdateChatTitle) {
      setIsEditingTitle(true)
      setEditTitleValue(chatTitle)
    }
  }

  const focusTitleInput = (el: HTMLInputElement | null) => {
    titleInputRef.current = el
    if (el) {
      el.focus()
      el.select()
    }
  }

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditTitleValue(e.target.value)
  }

  const handleTitleBlur = () => {
    if (editTitleValue.trim() && onUpdateChatTitle && currentChatId) {
      onUpdateChatTitle(editTitleValue)
      try {
        const raw = localStorage.getItem(CHAT_HISTORY_KEY)
        if (raw) {
          let arr = JSON.parse(raw)
          arr = arr.map(
            (c: { id: string; title: string; date: Date; model?: string }) =>
              c.id === currentChatId ? { ...c, title: editTitleValue } : c,
          )
          localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(arr))
        }
      } catch (error) {
        console.error('Error al actualizar título:', error)
      }
    }
    setIsEditingTitle(false)
  }

  // ── Shared style helpers ─────────────────────────────────────────────────
  const iconFilter = isDarkTheme
    ? 'brightness(0) invert(1)'
    : 'brightness(0.35)'

  const nmBtnBase: React.CSSProperties = {
    backgroundColor: theme.background,
    boxShadow: theme.shadow.outer,
    color: theme.text,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '44px',
    minHeight: '44px',
    padding: '10px',
    borderRadius: '12px',
    border: 'none',
    cursor: 'pointer',
    flexShrink: 0,
  }

  const nmBtnDisabled: React.CSSProperties = {
    ...nmBtnBase,
    opacity: 0.4,
    cursor: 'not-allowed',
  }

  const nmBtnAccent: React.CSSProperties = {
    ...nmBtnBase,
    background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})`,
    boxShadow: `${theme.shadow.sm}, ${theme.shadow.accent}`,
    color: '#fff',
  }

  const nmBtnAccentDisabled: React.CSSProperties = {
    ...nmBtnBase,
    opacity: 0.4,
    cursor: 'not-allowed',
    background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})`,
    color: '#fff',
  }

  const canClearText = message.trim() && !isLoading
  const canSend = (message.trim() || pendingImages.length > 0) && !isLoading
  const canMagic = message.trim() && !isLoading && !isMagicLoading

  return (
    <footer
      className="fixed bottom-0 left-0 right-0 z-50 w-full"
      style={{
        backgroundColor: theme.background,
        boxShadow: `0 -4px 24px ${
          isDarkTheme ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.10)'
        }`,
      }}
    >
      <div className="flex justify-center w-full">
        <div className="px-4 py-3 w-full md:max-w-3xl lg:max-w-4xl xl:max-w-6xl space-y-2">
          {/* ── Miniaturas de imágenes adjuntas ──────────────────────────────── */}
          {pendingImages.length > 0 && (
            <div className="flex flex-wrap gap-2 px-1">
              {pendingImages.map((image, index) => (
                <div key={image.id} className="relative">
                  <img
                    src={imageToDataUrl(image)}
                    alt={`Adjunto ${index + 1}`}
                    className="size-14 object-cover rounded-lg"
                    style={{ boxShadow: theme.shadow.sm }}
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveImage(image.id)}
                    title="Quitar imagen"
                    aria-label={`Quitar imagen ${index + 1}`}
                    className="absolute -top-1.5 -right-1.5 flex items-center justify-center size-5 rounded-full text-xs"
                    style={{
                      backgroundColor: theme.accent,
                      color: '#fff',
                      boxShadow: theme.shadow.sm,
                    }}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* ── Input bar ─────────────────────────────────────────────────── */}
          <div
            className="flex items-center gap-2 p-2 rounded-2xl"
            style={{
              backgroundColor: theme.background,
              boxShadow: theme.shadow.inset,
            }}
          >
            {/* Clear text button */}
            <button
              type="button"
              onClick={handleClearText}
              title="Eliminar Prompt"
              aria-label="Eliminar Prompt"
              className="nm-press"
              style={canClearText ? nmBtnBase : nmBtnDisabled}
              disabled={!canClearText}
            >
              <img
                src={TrashIcon}
                alt="Eliminar"
                className="size-5"
                style={{ filter: iconFilter }}
              />
            </button>

            {/* Textarea */}
            <textarea
              id="chat-message-input"
              name="message"
              ref={textareaRef}
              value={message}
              onChange={updateDraftMessage}
              onKeyDown={handleKeyDown}
              onPaste={handlePasteImages}
              placeholder="Escribe un Prompt ..."
              className="grow py-2 px-1 resize-none overflow-y-auto min-h-12 max-h-30 bg-transparent text-sm touch-manipulation appearance-none"
              style={{
                color: showMagicResponse
                  ? isDarkTheme
                    ? '#fbbf24'
                    : '#dc2626'
                  : theme.input.text,
                caretColor: theme.accent,
                border: 'none',
                scrollbarWidth: 'thin',
                scrollbarColor: `${theme.accent} transparent`,
                lineHeight: '1.6',
              }}
              disabled={isLoading || isMagicLoading}
              aria-label="Mensaje"
              rows={1}
              onFocus={() => {
                if (!message.trim() && showMagicResponse)
                  setShowMagicResponse(false)
              }}
            />

            {/* Copy button */}
            <button
              type="button"
              onClick={handleCopyToClipboard}
              title={copyFeedback ? '¡Copiado!' : 'Copiar al portapapeles'}
              aria-label="Copiar al portapapeles"
              className="nm-press"
              style={message.trim() ? nmBtnBase : nmBtnDisabled}
              disabled={!message.trim()}
            >
              {copyFeedback ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5"
                  style={{ color: theme.accent }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4.5 12.75l6 6 9-13.5"
                  />
                </svg>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5"
                  style={{ color: theme.textMuted }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z"
                  />
                </svg>
              )}
            </button>

            {/* Paste button */}
            <button
              type="button"
              onClick={handlePasteFromClipboard}
              title={
                pasteFeedback
                  ? 'Portapapeles bloqueado: presiona Ctrl+V'
                  : 'Pegar desde el portapapeles'
              }
              aria-label={
                pasteFeedback
                  ? 'Portapapeles bloqueado: presiona Control V'
                  : 'Pegar desde el portapapeles'
              }
              className="nm-press"
              style={{
                ...nmBtnBase,
                color: pasteFeedback ? theme.accent : theme.textMuted,
              }}
            >
              {pasteFeedback ? (
                <span className="text-xs font-bold">Ctrl+V</span>
              ) : (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5"
                  style={{ color: theme.textMuted }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15.666 3.888A2.25 2.25 0 0 0 13.5 2.25h-3c-1.03 0-1.9.693-2.166 1.638m7.332 0c.055.194.084.4.084.612v0a.75.75 0 0 1-.75.75H9a.75.75 0 0 1-.75-.75v0c0-.212.03-.418.084-.612m7.332 0c.646.049 1.288.11 1.927.184 1.1.128 1.907 1.077 1.907 2.185V19.5a2.25 2.25 0 0 1-2.25 2.25H6.75A2.25 2.25 0 0 1 4.5 19.5V6.257c0-1.108.806-2.057 1.907-2.185a48.208 48.208 0 0 1 1.927-.184"
                  />
                </svg>
              )}
            </button>

            {/* Attach image button — solo modelos con visión */}
            {visionEnabled && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_IMAGE_TYPES.join(',')}
                  multiple
                  onChange={handleFilesSelected}
                  className="hidden"
                  aria-hidden="true"
                  tabIndex={-1}
                />
                <button
                  type="button"
                  onClick={handleAttachClick}
                  title={
                    pendingImages.length >= MAX_IMAGES
                      ? `Máximo ${MAX_IMAGES} imágenes`
                      : 'Adjuntar imagen'
                  }
                  aria-label="Adjuntar imagen"
                  className="nm-press"
                  style={
                    pendingImages.length >= MAX_IMAGES
                      ? nmBtnDisabled
                      : nmBtnBase
                  }
                  disabled={pendingImages.length >= MAX_IMAGES}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                    strokeWidth="1.5"
                    stroke="currentColor"
                    className="size-5"
                    style={{ color: theme.textMuted }}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M18.375 12.739l-7.693 7.693a4.5 4.5 0 01-6.364-6.364l10.94-10.94A3 3 0 1119.5 7.372L8.552 18.32m.009-.01l-.01.01m5.699-9.941l-7.81 7.81a1.5 1.5 0 002.112 2.13"
                    />
                  </svg>
                </button>
              </>
            )}

            {/* Magic wand button */}
            <button
              type="button"
              onClick={handleMagicButton}
              title="Mejorar Prompt"
              aria-label="Mejorar Prompt"
              className="nm-press"
              style={canMagic ? nmBtnBase : nmBtnDisabled}
              disabled={!canMagic}
            >
              {isMagicLoading ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth="1.5"
                  stroke="currentColor"
                  className="size-5 animate-spin"
                  style={{ color: theme.accent }}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 4.5v15m7.5-7.5h-15"
                  />
                </svg>
              ) : (
                <img
                  src={VaritaIcon}
                  alt="Mejorar Prompt"
                  className="size-5"
                  style={{ filter: iconFilter }}
                />
              )}
            </button>

            {/* Toggle de búsqueda web */}
            {selectedModel &&
              supportsWebSearch(selectedModel, selectedProvider) && (
                <button
                  type="button"
                  onClick={onToggleSearch}
                  aria-pressed={searchEnabled}
                  title={
                    searchEnabled
                      ? 'Búsqueda web activada'
                      : 'Búsqueda web desactivada'
                  }
                  aria-label="Activar búsqueda web"
                  className="nm-press"
                  style={{
                    ...nmBtnBase,
                    color: searchEnabled ? theme.accent : theme.textMuted,
                    boxShadow: searchEnabled
                      ? theme.shadow.inset
                      : theme.shadow.sm,
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="size-5 shrink-0"
                    aria-hidden="true"
                  >
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                </button>
              )}

            {/* Send button — accent gradient */}
            <button
              type="button"
              onClick={handleSendMessage}
              title="Enviar Prompt"
              aria-label="Enviar Prompt"
              className="nm-press"
              style={canSend ? nmBtnAccent : nmBtnAccentDisabled}
              disabled={!canSend}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="1.8"
                stroke="currentColor"
                className="size-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                />
              </svg>
            </button>
          </div>

          {/* ── Toolbar ───────────────────────────────────────────────────── */}
          <div
            className="flex items-center justify-between px-3 rounded-2xl"
            style={{
              backgroundColor: theme.background,
              boxShadow: theme.shadow.sm,
              height: '48px',
            }}
          >
            {/* Clear context (broom) */}
            <div className="flex items-center">
              {clearContext && (
                <button
                  type="button"
                  title="Eliminar contexto del Chat"
                  aria-label="Eliminar contexto del Chat"
                  onClick={clearContext}
                  className="nm-press p-2 rounded-xl"
                  style={{
                    backgroundColor: theme.background,
                    boxShadow: hasContext ? theme.shadow.sm : 'none',
                    opacity: hasContext ? 1 : 0.35,
                    cursor: hasContext ? 'pointer' : 'not-allowed',
                  }}
                >
                  <img
                    src={EscobaIcon}
                    alt="Limpiar contexto"
                    className="size-5"
                    style={{ filter: iconFilter }}
                  />
                </button>
              )}
            </div>

            {/* Chat title — center */}
            <div className="flex items-center justify-center grow px-2">
              {isEditingTitle ? (
                <input
                  id="chat-title-input"
                  name="chatTitle"
                  ref={focusTitleInput}
                  value={editTitleValue}
                  onChange={handleTitleChange}
                  aria-label="Título del chat"
                  title="Título del chat"
                  onBlur={handleTitleBlur}
                  onKeyDown={(e) => {
                    e.stopPropagation()
                    if (e.key === 'Enter') handleTitleBlur()
                    else if (e.key === 'Escape') {
                      setIsEditingTitle(false)
                      setEditTitleValue(chatTitle || '')
                    }
                  }}
                  onFocus={(e) => e.target.select()}
                  className="text-sm font-semibold bg-transparent text-center border-b-2 px-2 py-0.5"
                  style={{
                    borderColor: theme.accent,
                    color: theme.accent,
                    maxWidth: '200px',
                  }}
                  maxLength={30}
                />
              ) : (
                chatTitle && (
                  <button
                    type="button"
                    className="text-sm font-semibold cursor-pointer truncate max-w-60 select-none bg-transparent border-0 p-0 text-left"
                    style={{ color: theme.textMuted }}
                    onClick={handleTitleClick}
                    title="Editar título"
                  >
                    {chatTitle.length > 25
                      ? chatTitle.split(' ')[0] +
                        (chatTitle.split(' ')[0].length < 25
                          ? ' ' +
                            chatTitle.substring(
                              chatTitle.split(' ')[0].length + 1,
                              25,
                            ) +
                            '…'
                          : '…')
                      : chatTitle}
                  </button>
                )
              )}
            </div>

            {/* Theme toggle — neumorphic */}
            <div className="flex items-center">
              <button
                type="button"
                onClick={toggleTheme}
                className="nm-press relative inline-flex items-center w-16 h-8 rounded-full cursor-pointer"
                title="Cambiar Tema"
                aria-label="Cambiar entre tema claro y oscuro"
                style={{
                  backgroundColor: theme.background,
                  boxShadow: theme.shadow.inset,
                }}
              >
                {/* Knob — neumorphic raised circle */}
                <span
                  className="absolute flex items-center justify-center size-6 rounded-full transition-transform duration-300"
                  style={{
                    left: '4px',
                    transform: isDarkTheme
                      ? 'translateX(30px)'
                      : 'translateX(0)',
                    backgroundColor: theme.background,
                    boxShadow: theme.shadow.sm,
                  }}
                >
                  {/* Sun icon (light theme) */}
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="size-3.5 transition-opacity duration-300"
                    style={{
                      opacity: isDarkTheme ? 0 : 1,
                      position: 'absolute',
                      color: theme.accent,
                    }}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                    />
                  </svg>
                  {/* Moon icon (dark theme) */}
                  <img
                    src={LunaIcon}
                    alt="Tema oscuro"
                    className="size-3.5 transition-opacity duration-300"
                    style={{
                      opacity: isDarkTheme ? 1 : 0,
                      position: 'absolute',
                      filter: 'brightness(0) invert(1)',
                    }}
                  />
                </span>

                {/* Accent indicator dot */}
                <span
                  className="absolute rounded-full transition-opacity duration-300"
                  style={{
                    width: '4px',
                    height: '4px',
                    backgroundColor: theme.accent,
                    opacity: 0.6,
                    left: isDarkTheme ? '10px' : 'auto',
                    right: isDarkTheme ? 'auto' : '10px',
                  }}
                />
              </button>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}

export default Footer

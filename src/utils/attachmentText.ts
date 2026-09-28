// Helpers puros para adjuntos de archivo de texto (y PDF-como-texto), ver
// Scope en odd/tasks/file-attachments.md. Sin dependencias del DOM: se
// pueden testear directo con `bun test`.

import type { FileAttachment } from '../interfaces/chat/chatTypes'

// Límites de tamaño: ~200 KB por archivo de texto y ~1 MB total por mensaje
// (suma de todos los archivos de texto y PDF-como-texto adjuntos).
export const MAX_TEXT_FILE_BYTES = 200 * 1024
export const MAX_TEXT_TOTAL_BYTES = 1024 * 1024

/** Tamaño en bytes de un string UTF-8 (no `.length`, que cuenta code units). */
export function utf8ByteLength(text: string): number {
  return new TextEncoder().encode(text).length
}

/** true si sumar `newBytes` a `existingBytes` supera el total permitido. */
export function exceedsTextTotalCap(
  existingBytes: number,
  newBytes: number,
): boolean {
  return existingBytes + newBytes > MAX_TEXT_TOTAL_BYTES
}

/** true si un archivo de texto individual supera el límite por archivo. */
export function exceedsTextFileCap(bytes: number): boolean {
  return bytes > MAX_TEXT_FILE_BYTES
}

/** Extensión del nombre de archivo (con el punto, minúscula) o '' si no tiene. */
export function fileExtension(name: string): string {
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx).toLowerCase()
}

// Extensiones de texto/código aceptadas para cualquier modelo (Scope T1).
export const ACCEPTED_TEXT_EXTENSIONS = [
  '.md',
  '.markdown',
  '.txt',
  '.csv',
  '.json',
  '.xml',
  '.yaml',
  '.yml',
  '.log',
  '.js',
  '.ts',
  '.tsx',
  '.jsx',
  '.py',
  '.java',
  '.go',
  '.rs',
  '.sql',
  '.html',
  '.css',
  '.sh',
  '.ps1',
]

export function isAcceptedTextExtension(name: string): boolean {
  return ACCEPTED_TEXT_EXTENSIONS.includes(fileExtension(name))
}

/** Lenguaje del fence de markdown a partir del nombre (la extensión sin el
 * punto); '' si no tiene extensión reconocida (fence sin resaltado). */
function fenceLanguageFor(name: string): string {
  const ext = fileExtension(name)
  return ext ? ext.slice(1) : ''
}

/**
 * Concatena el contenido de los adjuntos de texto (kind 'text' y
 * 'pdf-text') al mensaje del usuario como bloques con fences
 * ("Archivo: nombre" + fence con el contenido), en el orden recibido. Sin
 * adjuntos de texto, devuelve `content` sin tocar (mismo string,
 * byte-idéntico: ver Constraints del feature doc).
 */
export function inlineTextAttachments(
  content: string,
  files?: FileAttachment[],
): string {
  // Solo se inlinean archivos que de verdad tienen contenido cargado: un
  // archivo de texto persistido más grande que el tope (ver
  // toPersistableFiles) llega sin `text` después de recargar, y se ignora
  // acá en vez de inlinear un bloque vacío.
  const textFiles = (files ?? []).filter(
    (file) =>
      (file.kind === 'text' || file.kind === 'pdf-text') &&
      typeof file.text === 'string',
  )
  if (textFiles.length === 0) return content

  const blocks = textFiles.map((file) => {
    const lang = file.kind === 'pdf-text' ? '' : fenceLanguageFor(file.name)
    return `Archivo: ${file.name}\n\`\`\`${lang}\n${file.text ?? ''}\n\`\`\``
  })

  return [content, ...blocks].filter((part) => part.length > 0).join('\n\n')
}

/**
 * Contenido final que viaja a la API para un mensaje: inserta los adjuntos
 * de texto disponibles (inlineTextAttachments) y, si después de eso sigue
 * vacío, usa un texto por defecto según haya imágenes o documentos PDF
 * nativos (mismo criterio en todos los proveedores). El `content` guardado
 * en el mensaje —lo que el usuario tipeó— nunca se modifica: esto solo se
 * llama al armar el payload de la petición (ChatContainer.
 * prepareMessagesForApi y las ramas de Claude (suscripción)/OpenCode Free),
 * nunca antes de guardar el mensaje del usuario.
 */
export function resolveApiContent(
  content: string,
  files: FileAttachment[] | undefined,
  imageCount: number,
  documentCount: number,
): string {
  const withText = inlineTextAttachments(content, files)
  if (withText.trim()) return withText
  if (imageCount > 0) {
    return imageCount > 1 ? 'Describe las imágenes.' : 'Describe la imagen.'
  }
  if (documentCount > 0) {
    return documentCount > 1
      ? 'Resume los documentos adjuntos.'
      : '¿Qué dice el documento adjunto?'
  }
  return withText
}

// Persistencia (localStorage): las imágenes y los PDF nativos nunca se
// persisten (cuota ~5 MB, y son igual de grandes en base64 como para
// llenarla); los archivos de texto (kind 'text'/'pdf-text') sí, pero solo el
// contenido extraído de archivos chicos: <=20 KB por archivo y <=40 KB en
// total por mensaje. Los archivos que no entran conservan nombre, tamaño y
// tipo (sin `text`): la UI los muestra como "sin contenido guardado" en vez
// de desaparecer del todo (ver ChatMessage.tsx).
export const MAX_PERSISTED_TEXT_FILE_BYTES = 20 * 1024
export const MAX_PERSISTED_TEXT_TOTAL_BYTES = 40 * 1024

export function toPersistableFiles(
  files?: FileAttachment[],
): FileAttachment[] | undefined {
  if (!files || files.length === 0) return undefined

  let totalKeptBytes = 0
  const persistable = files
    .filter((file) => file.kind === 'text' || file.kind === 'pdf-text')
    .map((file) => {
      const bytes = utf8ByteLength(file.text ?? '')
      const keepText =
        bytes <= MAX_PERSISTED_TEXT_FILE_BYTES &&
        totalKeptBytes + bytes <= MAX_PERSISTED_TEXT_TOTAL_BYTES
      if (keepText) totalKeptBytes += bytes
      const persisted: FileAttachment = {
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        kind: file.kind,
        size: file.size,
      }
      if (keepText) persisted.text = file.text
      return persisted
    })

  return persistable.length > 0 ? persistable : undefined
}

// Convierte datos en base64 a bytes/blob: URL para previsualizar archivos en
// la app (PDF nativo adjunto, ver Scope en odd/tasks/file-attachments.md).
// Nunca se usa un data: URL para esto: Chrome/Edge lo bloquean dentro de un
// <iframe> en algunos contextos (mismo motivo que ImageLightbox usa <img
// src> con data: pero en una pestaña nueva no funciona). Quien crea el blob:
// URL con `base64ToBlobUrl` es responsable de revocarlo con
// `URL.revokeObjectURL` cuando ya no se usa (ver Footer.tsx/ChatMessage.tsx).

/** Decodifica un string base64 a bytes crudos (forma pura, testeable). */
export function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/** Crea un blob: URL a partir de datos en base64 y su mime type. */
export function base64ToBlobUrl(base64: string, mimeType: string): string {
  const bytes = base64ToBytes(base64)
  // `bytes.buffer` es un ArrayBuffer recién creado del tamaño exacto (ver
  // base64ToBytes): pasarlo entero equivale a pasar `bytes`, pero evita el
  // choque de tipos de TS 7 entre Uint8Array<ArrayBufferLike> y el
  // ArrayBufferView<ArrayBuffer> que espera BlobPart.
  return URL.createObjectURL(
    new Blob([bytes.buffer as ArrayBuffer], { type: mimeType }),
  )
}

import { describe, expect, test } from 'bun:test'
import type { FileAttachment } from '../interfaces/chat/chatTypes'
import {
  exceedsTextFileCap,
  exceedsTextTotalCap,
  inlineTextAttachments,
  isAcceptedTextExtension,
  MAX_PERSISTED_TEXT_FILE_BYTES,
  MAX_TEXT_FILE_BYTES,
  MAX_TEXT_TOTAL_BYTES,
  resolveApiContent,
  toPersistableFiles,
  utf8ByteLength,
} from './attachmentText'

describe('inlineTextAttachments', () => {
  test('sin adjuntos de texto, devuelve el mismo content (byte-idéntico)', () => {
    expect(inlineTextAttachments('Hola', undefined)).toBe('Hola')
    expect(inlineTextAttachments('Hola', [])).toBe('Hola')
  })

  test('ignora adjuntos que no son de texto (pdf-native)', () => {
    const files: FileAttachment[] = [
      {
        name: 'doc.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf-native',
        size: 100,
        data: 'base64',
      },
    ]
    expect(inlineTextAttachments('Hola', files)).toBe('Hola')
  })

  test('agrega un archivo de texto como bloque con fence y nombre de idioma', () => {
    const files: FileAttachment[] = [
      {
        name: 'notas.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: 10,
        text: '# Título',
      },
    ]
    expect(inlineTextAttachments('Resumime esto', files)).toBe(
      'Resumime esto\n\nArchivo: notas.md\n```md\n# Título\n```',
    )
  })

  test('texto de PDF fallback (pdf-text) no lleva lenguaje de fence', () => {
    const files: FileAttachment[] = [
      {
        name: 'informe.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf-text',
        size: 20,
        text: 'contenido extraído',
      },
    ]
    expect(inlineTextAttachments('', files)).toBe(
      'Archivo: informe.pdf\n```\ncontenido extraído\n```',
    )
  })

  test('varios archivos, en el orden recibido', () => {
    const files: FileAttachment[] = [
      {
        name: 'a.txt',
        mimeType: 'text/plain',
        kind: 'text',
        size: 1,
        text: 'A',
      },
      {
        name: 'b.json',
        mimeType: 'application/json',
        kind: 'text',
        size: 3,
        text: '{}',
      },
    ]
    expect(inlineTextAttachments('Mensaje', files)).toBe(
      'Mensaje\n\nArchivo: a.txt\n```txt\nA\n```\n\nArchivo: b.json\n```json\n{}\n```',
    )
  })

  test('ignora archivos de texto sin `text` (persistidos grandes, ver toPersistableFiles)', () => {
    const files: FileAttachment[] = [
      {
        name: 'grande.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: 50000,
      },
    ]
    expect(inlineTextAttachments('Hola', files)).toBe('Hola')
  })
})

describe('resolveApiContent', () => {
  test('content vacío nunca se modifica al guardar el mensaje del usuario (solo lo usa la API)', () => {
    // inlineTextAttachments ya deja el content sin tocar cuando no hay
    // archivos de texto; resolveApiContent hereda esa garantía.
    expect(resolveApiContent('Hola', undefined, 0, 0)).toBe('Hola')
  })

  test('inserta los archivos de texto disponibles', () => {
    const files: FileAttachment[] = [
      {
        name: 'a.txt',
        mimeType: 'text/plain',
        kind: 'text',
        size: 1,
        text: 'A',
      },
    ]
    expect(resolveApiContent('Resumí', files, 0, 0)).toBe(
      'Resumí\n\nArchivo: a.txt\n```txt\nA\n```',
    )
  })

  test('sin texto ni archivos, con imágenes: usa el texto por defecto según la cantidad', () => {
    expect(resolveApiContent('', undefined, 1, 0)).toBe('Describe la imagen.')
    expect(resolveApiContent('   ', undefined, 2, 0)).toBe(
      'Describe las imágenes.',
    )
  })

  test('sin texto ni archivos, con documentos: usa el texto por defecto según la cantidad', () => {
    expect(resolveApiContent('', undefined, 0, 1)).toBe(
      '¿Qué dice el documento adjunto?',
    )
    expect(resolveApiContent('', undefined, 0, 2)).toBe(
      'Resume los documentos adjuntos.',
    )
  })

  test('imágenes tienen prioridad sobre documentos cuando ambos faltan de texto', () => {
    expect(resolveApiContent('', undefined, 1, 1)).toBe('Describe la imagen.')
  })

  test('sin nada (content vacío, sin imágenes/documentos/archivos): devuelve vacío', () => {
    expect(resolveApiContent('', undefined, 0, 0)).toBe('')
  })

  test('un archivo de texto persistido sin `text` no cuenta como contenido: cae al default', () => {
    const files: FileAttachment[] = [
      {
        name: 'grande.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: 50000,
      },
    ]
    expect(resolveApiContent('', files, 1, 0)).toBe('Describe la imagen.')
  })
})

describe('toPersistableFiles', () => {
  test('sin archivos, devuelve undefined', () => {
    expect(toPersistableFiles(undefined)).toBeUndefined()
    expect(toPersistableFiles([])).toBeUndefined()
  })

  test('descarta por completo las imágenes y los PDF nativos', () => {
    const files: FileAttachment[] = [
      {
        name: 'doc.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf-native',
        size: 100,
        data: 'base64',
      },
    ]
    expect(toPersistableFiles(files)).toBeUndefined()
  })

  test('un archivo de texto chico conserva el `text`', () => {
    const files: FileAttachment[] = [
      {
        id: 'f1',
        name: 'notas.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: 8,
        text: 'contenido',
      },
    ]
    expect(toPersistableFiles(files)).toEqual([
      {
        id: 'f1',
        name: 'notas.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: 8,
        text: 'contenido',
      },
    ])
  })

  test('un archivo de texto más grande que 20 KB pierde el `text` pero conserva metadata', () => {
    const bigText = 'a'.repeat(MAX_PERSISTED_TEXT_FILE_BYTES + 1)
    const files: FileAttachment[] = [
      {
        id: 'f1',
        name: 'grande.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: bigText.length,
        text: bigText,
      },
    ]
    expect(toPersistableFiles(files)).toEqual([
      {
        id: 'f1',
        name: 'grande.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: bigText.length,
      },
    ])
  })

  test('el tope total (40 KB) se aplica entre varios archivos chicos del mismo mensaje', () => {
    // 3 archivos de 15 KB (cada uno bajo el tope de 20 KB por archivo), pero
    // el tercero hace que el total supere las 40 KB permitidas.
    const chunk = 'a'.repeat(15 * 1024)
    const files: FileAttachment[] = [
      {
        id: 'f1',
        name: 'a.txt',
        mimeType: 'text/plain',
        kind: 'text',
        size: chunk.length,
        text: chunk,
      },
      {
        id: 'f2',
        name: 'b.txt',
        mimeType: 'text/plain',
        kind: 'text',
        size: chunk.length,
        text: chunk,
      },
      {
        id: 'f3',
        name: 'c.txt',
        mimeType: 'text/plain',
        kind: 'text',
        size: chunk.length,
        text: chunk,
      },
    ]
    const result = toPersistableFiles(files)
    expect(result?.[0].text).toBe(chunk) // primero: entra
    expect(result?.[1].text).toBe(chunk) // segundo: 30 KB acumuladas, entra
    expect(result?.[2].text).toBeUndefined() // tercero: pasaría de 40 KB, se descarta
    expect(result?.[2].name).toBe('c.txt') // pero conserva metadata
  })

  test('mezcla de kinds: el PDF nativo desaparece, el texto y el PDF-como-texto se conservan', () => {
    const files: FileAttachment[] = [
      {
        id: 'txt',
        name: 'notas.md',
        mimeType: 'text/markdown',
        kind: 'text',
        size: 4,
        text: 'hola',
      },
      {
        id: 'pdfn',
        name: 'doc.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf-native',
        size: 100,
        data: 'base64',
      },
      {
        id: 'pdft',
        name: 'informe.pdf',
        mimeType: 'application/pdf',
        kind: 'pdf-text',
        size: 5,
        text: 'chau',
      },
    ]
    const result = toPersistableFiles(files)
    expect(result?.map((f) => f.id)).toEqual(['txt', 'pdft'])
  })
})

describe('límites de tamaño', () => {
  test('utf8ByteLength cuenta bytes UTF-8, no code units', () => {
    expect(utf8ByteLength('abc')).toBe(3)
    expect(utf8ByteLength('á')).toBe(2) // 2 bytes en UTF-8
  })

  test('exceedsTextFileCap respeta ~200 KB por archivo', () => {
    expect(exceedsTextFileCap(MAX_TEXT_FILE_BYTES)).toBe(false)
    expect(exceedsTextFileCap(MAX_TEXT_FILE_BYTES + 1)).toBe(true)
  })

  test('exceedsTextTotalCap respeta ~1 MB total', () => {
    expect(exceedsTextTotalCap(0, MAX_TEXT_TOTAL_BYTES)).toBe(false)
    expect(exceedsTextTotalCap(1, MAX_TEXT_TOTAL_BYTES)).toBe(true)
    expect(
      exceedsTextTotalCap(MAX_TEXT_TOTAL_BYTES / 2, MAX_TEXT_TOTAL_BYTES / 2),
    ).toBe(false)
  })
})

describe('isAcceptedTextExtension', () => {
  test('acepta las extensiones de texto/código del Scope', () => {
    for (const name of ['notas.md', 'datos.csv', 'app.tsx', 'script.ps1']) {
      expect(isAcceptedTextExtension(name)).toBe(true)
    }
  })

  test('rechaza binarios y extensiones desconocidas', () => {
    expect(isAcceptedTextExtension('imagen.png')).toBe(false)
    expect(isAcceptedTextExtension('archivo.exe')).toBe(false)
    expect(isAcceptedTextExtension('sin-extension')).toBe(false)
  })
})

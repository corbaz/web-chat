// Extracción de texto de PDF en el navegador con pdf.js (fallback de T3, ver
// Scope en odd/tasks/file-attachments.md), para modelos sin PDF nativo. Se
// importa perezosamente (solo cuando el usuario adjunta un PDF a un modelo
// sin soporte nativo) para no engordar el bundle principal: queda en su
// propio chunk (ver vite.config.ts).

interface PdfTextItem {
  str?: string
}

/** Junta el texto de los `items` de una página de pdf.js en un solo string,
 * separando por espacios y colapsando espacios repetidos (forma pura,
 * testeable sin el motor real de PDF). */
export function joinTextItems(items: PdfTextItem[]): string {
  return items
    .map((item) => (typeof item.str === 'string' ? item.str : ''))
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Junta el texto de todas las páginas, separadas por un salto de línea
 * doble (una página por bloque, forma pura y testeable). */
export function joinPageTexts(pages: string[]): string {
  return pages.filter((page) => page.length > 0).join('\n\n')
}

/**
 * Extrae el texto de un PDF (`File`) con pdf.js. Import perezoso: pdfjs-dist
 * solo se carga cuando esta función se llama de verdad. Configura el worker
 * con la URL que empaqueta Vite (`?url`), como recomienda pdfjs-dist para
 * bundlers ESM (evita el worker por defecto de CDN, que rompe con CSP/offline).
 */
export async function extractPdfText(file: File): Promise<string> {
  const [{ getDocument, GlobalWorkerOptions }, workerUrlModule] =
    await Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.min.mjs?url'),
    ])
  GlobalWorkerOptions.workerSrc = workerUrlModule.default

  const buffer = await file.arrayBuffer()
  const loadingTask = getDocument({ data: buffer })
  try {
    const pdf = await loadingTask.promise
    const pageTexts: string[] = []
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
      const page = await pdf.getPage(pageNumber)
      const textContent = await page.getTextContent()
      pageTexts.push(joinTextItems(textContent.items as PdfTextItem[]))
    }
    return joinPageTexts(pageTexts)
  } finally {
    // Libera el worker y los recursos del documento (recomendado por
    // pdfjs-dist: destruir el loading task, no el PDFDocumentProxy).
    await loadingTask.destroy()
  }
}

// Capacidad de PDF nativo (entrada de documentos) por modelo y proveedor. Ver
// Scope en odd/tasks/file-attachments.md. Fuente principal: models.dev
// (`modalities.input` incluye `pdf`), volcado en pdfModels.generated.ts por
// `bun run update:models`. Para IDs que models.dev todavía no conoce se usa
// una heurística conservadora, igual que en vision.ts.

import { PDF_MODELS, PDF_TEXT_ONLY_MODELS } from './pdfModels.generated'

// Heurística para modelos nuevos que aún no están en models.dev, o para
// proveedores fuera de ese catálogo.
function fallbackSupportsPdf(modelId: string, provider: string): boolean {
  switch (provider) {
    case 'anthropic':
      return modelId.startsWith('claude-')
    case 'claudecode':
      // Todos los modelos de chat de Anthropic aceptan PDF nativo vía el
      // bridge en modo stream-json (mismo criterio que supportsVision).
      return modelId.startsWith('claude-')
    case 'opencodefree':
      // Sin PDF nativo: siempre usa el fallback de texto (ver Scope del
      // feature doc, "OpenCode Free ... PDFs use the text fallback").
      return false
    default:
      return false
  }
}

export function supportsPdf(modelId: string, provider?: string): boolean {
  if (!modelId || !provider) return false
  if (PDF_MODELS[provider]?.has(modelId)) return true
  if (PDF_TEXT_ONLY_MODELS[provider]?.has(modelId)) return false
  return fallbackSupportsPdf(modelId, provider)
}

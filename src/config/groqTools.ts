// Catálogo y utilidades para herramientas integradas de Groq.
// Fase 1 (infraestructura): tipos de payload por familia + normalización de
// executed_tools. La verificación live (tarea 1.1) confirmó los IDs aceptados,
// las formas de payload y los tipos observados en executed_tools.
import type {
  BuiltinToolId,
  ExecutedTool,
  ToolConfig,
  ToolFamily,
} from '../interfaces/chat/chatTypes'

// Límite de truncamiento de salida de herramientas (Fase 3 lo usa para "Ver más")
export const TOOL_TRUNCATION_LIMIT = 500

// Catálogo de herramientas por familia (verificación live 1.1)
export const COMPOUND_TOOLS: BuiltinToolId[] = [
  'web_search',
  'code_interpreter',
  'visit_website',
  'wolfram_alpha',
]

export const GPT_OSS_TOOLS: BuiltinToolId[] = [
  'browser_search',
  'code_interpreter',
]

// Config por defecto: todas las herramientas habilitadas (chats nuevos / fallback)
export const defaultToolConfig: ToolConfig = {
  web_search: true,
  code_interpreter: true,
  visit_website: true,
  wolfram_alpha: true,
  browser_search: true,
}

// IDs verificados live (tarea 1.1) como tool-capables en la familia gpt-oss.
// Solo estos dos ejecutaron herramientas en la verificación. NO usar prefix
// match: openai/gpt-oss-20b está en el catálogo pero NO fue verificado.
const VERIFIED_GPT_OSS_TOOL_MODELS = new Set<string>([
  'openai/gpt-oss-120b',
  'openai/gpt-oss-safeguard-20b',
])

// Modelos cuya capacidad de herramientas es PROVISIONAL: el payload fue aceptado
// (HTTP 200, sin 400) pero la ejecución no se observó en la verificación live 1.1.
// Phase 2/3 puede revocar el tag `supportsBuiltinTools` sin cambios de infra si
// el smoke-test no muestra ejecución. Ver verification.md.
export const PROVISIONAL_TOOL_MODELS = new Set<string>(['groq/compound-mini'])

// Determina la familia de herramientas de un modelo (verificación live 1.1).
// CONTRATO CONSERVADOR: solo se clasifican como tool-capables los IDs verificados
// live. NO se usa prefix match sobre `openai/gpt-oss-*` — futuros IDs deben
// verificarse live antes de clasificarse (evita habilitar herramientas para
// modelos no verificados que podrían no aceptar o ejecutar tools).
// - groq/compound → compound (verificado: ejecutó herramientas)
// - groq/compound-mini → compound (PROVISIONAL: payload aceptado sin 400,
//   ejecución no observada — ver PROVISIONAL_TOOL_MODELS y verification.md;
//   revocar el tag en Phase 2 si el smoke-test no muestra ejecución)
// - openai/gpt-oss-120b, openai/gpt-oss-safeguard-20b → gpt-oss (verificados:
//   ejecutaron herramientas). openai/gpt-oss-20b NO está verificado → null.
export const isToolCapableModel = (model: string): ToolFamily | null => {
  if (model === 'groq/compound') return 'compound'
  if (model === 'groq/compound-mini') return 'compound'
  if (VERIFIED_GPT_OSS_TOOL_MODELS.has(model)) return 'gpt-oss'
  return null
}

// Payload para modelos compound: compound_custom.tools.enabled_tools (solo habilitadas)
export const compoundToolPayload = (
  toolsConfig: ToolConfig,
): Record<string, unknown> => {
  const enabledTools = COMPOUND_TOOLS.filter((tool) => toolsConfig[tool])
  return {
    compound_custom: {
      tools: {
        enabled_tools: enabledTools,
      },
    },
  }
}

// Payload para modelos GPT-OSS: tools:[{type}] (solo habilitadas)
export const gptOssToolPayload = (
  toolsConfig: ToolConfig,
): Record<string, unknown> => {
  const enabledTools = GPT_OSS_TOOLS.filter((tool) => toolsConfig[tool])
  return {
    tools: enabledTools.map((type) => ({ type })),
  }
}

// Tipos observados live en executed_tools (la API de Groq normaliza los nombres
// de entrada a estos tipos de salida). Un tipo bien formado pero no presente en
// este conjunto se considera "desconocido" y recibe el fallback `raw`.
const KNOWN_TOOL_TYPES = new Set([
  'search',
  'python',
  'function',
  'browser_search',
  'browser.open',
])

// Normaliza choices[0].message.executed_tools → ExecutedTool[].
// CONTRATO:
// - Devuelve [] cuando executed_tools está ausente o no es un array.
// - DESCARTA entradas malformadas SIN un `type` string no vacío (tras trim):
//   no las emite como tool "unknown" — se omiten del resultado.
// - Preserva los campos de resultado reconocidos (arguments, search_results,
//   code_results, output) para toda entrada bien formada.
// - Para tipos desconocidos pero bien formados (type string no vacío no en
//   KNOWN_TOOL_TYPES), retiene un fallback seguro: guarda la entrada cruda
//   original en `raw` Y copia los campos extra vía index-signature.
// - Nunca lanza (try/catch alrededor de todo el cuerpo).
// - Tipos observados live: search, python, function, browser_search, browser.open
//   (la API de Groq normaliza los nombres; los nombres de entrada web_search /
//   code_interpreter se mapean a estos tipos de salida).
export const parseExecutedTools = (
  data: Record<string, unknown>,
): ExecutedTool[] => {
  try {
    const choices = data.choices as
      | Array<{ message?: { executed_tools?: unknown } }>
      | undefined
    const raw = choices?.[0]?.message?.executed_tools
    if (!Array.isArray(raw)) return []

    const RECOGNIZED_KEYS = new Set([
      'type',
      'arguments',
      'search_results',
      'code_results',
      'output',
      'raw',
    ])
    const result: ExecutedTool[] = []
    for (const entry of raw) {
      if (!entry || typeof entry !== 'object') continue
      const e = entry as Record<string, unknown>
      // Contrato: descarta entradas sin type string no vacío (no emite "unknown").
      const typeRaw = typeof e.type === 'string' ? e.type.trim() : ''
      if (!typeRaw) continue
      const tool: ExecutedTool = { type: typeRaw }
      if (e.arguments !== undefined) tool.arguments = e.arguments
      if (e.search_results !== undefined) tool.search_results = e.search_results
      if (e.code_results !== undefined) tool.code_results = e.code_results
      if (e.output !== undefined) tool.output = e.output
      // Fallback seguro para tipos desconocidos pero bien formados.
      if (!KNOWN_TOOL_TYPES.has(typeRaw)) {
        tool.raw = e
      }
      // Preserva campos extra vía index-signature (reconocidos + desconocidos).
      for (const key of Object.keys(e)) {
        if (!RECOGNIZED_KEYS.has(key)) tool[key] = e[key]
      }
      result.push(tool)
    }
    return result
  } catch {
    return []
  }
}

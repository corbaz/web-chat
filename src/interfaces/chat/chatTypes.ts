export interface ChatMessageType {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  responseTime?: string // Tiempo que tardó en generarse la respuesta (solo para mensajes del asistente)
  tokensUsed?: number // Número de tokens utilizados en la petición
  tokenLimit?: number // Límite de tokens del modelo seleccionado
  modelName?: string // Nombre del modelo usado para la respuesta
  requestedModelId?: string // ID del modelo solicitado por el usuario
  promptTokens?: number // Exact input/prompt tokens
  completionTokens?: number // Exact output/completion tokens
  executedTools?: ExecutedTool[] // Herramientas integradas ejecutadas por Groq (compound/GPT-OSS)
  citations?: Citation[] // Citaciones/Fuentes de la búsqueda web
  searchState?: 'incomplete' | undefined // Estado de la búsqueda web ('incomplete' para pause_turn de Anthropic)
}

export interface Citation {
  url: string
  title?: string
  snippet?: string
}

export interface GroqMessageType {
  role: 'user' | 'assistant' | 'system'
  content: string
}

// Clave versionada para almacenar mensajes en localStorage
export const STORAGE_KEY = 'prompting_chat_messages:v1'

// Clave versionada para almacenar historial de chats en localStorage
export const CHAT_HISTORY_KEY = 'prompting_chat_history:v1'

// === Herramientas integradas de Groq (Fase 1: infraestructura) ===

// Familias de modelos de Groq con herramientas integradas soportadas
export type ToolFamily = 'compound' | 'gpt-oss'

// Identificadores de herramientas integradas que acepta la API de Groq
export type BuiltinToolId =
  | 'web_search'
  | 'code_interpreter'
  | 'visit_website'
  | 'wolfram_alpha'
  | 'browser_search'

// Estado por chat de toggles de herramientas integradas (uno booleano por herramienta)
export interface ToolConfig {
  web_search: boolean
  code_interpreter: boolean
  visit_website: boolean
  wolfram_alpha: boolean
  browser_search: boolean
  searchEnabled?: boolean // Indica si la búsqueda web está habilitada para el chat
}

// Herramienta ejecutada devuelta por Groq en choices[0].message.executed_tools.
// Contrato del normalizador (parseExecutedTools):
// - `type` SIEMPRE es un string no vacío (el parser descarta entradas sin type
//   string no vacío; nunca emite entradas malformadas como tool "unknown").
// - Campos reconocidos (arguments, search_results, code_results, output) se
//   preservan para toda entrada bien formada.
// - `raw` es un fallback seguro para tipos desconocidos pero bien formados
//   (type string no vacío no observado en verificación live): contiene la
//   entrada cruda original. Index-signature además preserva cualquier campo extra.
export interface ExecutedTool {
  type: string
  arguments?: unknown
  search_results?: unknown
  code_results?: unknown
  output?: unknown
  raw?: unknown
  [key: string]: unknown
}

// Clave versionada para almacenar el estado de toggles de herramientas por chat
export const TOOLS_STORAGE_KEY = 'prompting_chat_tools:v1'

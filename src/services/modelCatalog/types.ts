// Tipos compartidos del catálogo dinámico de modelos.
// CatalogModel es un superconjunto estructural de las interfaces de modelo
// estáticas existentes (GroqModel, OpenAIModel, etc.), por lo que cualquier
// array estático es asignable directamente a CatalogModel[].

export type ProviderId =
  | 'groq'
  | 'routellm'
  | 'ollamacloud'
  | 'openai'
  | 'anthropic'
  | 'opengo'
  | 'opencodezen'
  | 'opencodefree'
  | 'claudecode'
  | 'codexsub'
  | 'geminisub'
  | 'gemini'

export interface CatalogModel {
  id: string
  name: string
  developer: string
  provider: ProviderId
  contextWindow?: string
  maxTokens?: number
  maxCompletionTokens?: string
  maxFileSize?: string
  velocidad?: string
  precio?: string
  fecha?: string
  /** El modelo existe pero la cuenta no lo puede usar: se muestra
   * deshabilitado en el selector (ver unavailableModels.ts). */
  disabledReason?: 'unavailable' | 'quota'
}

// Lo que devuelve un fetcher: el id solo, o el id con el nombre real cuando
// la fuente lo trae (se usa para modelos que el catálogo estático no conoce).
export type FetchedModel = string | { id: string; name?: string }

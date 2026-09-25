// Tipos compartidos del catálogo dinámico de modelos.
// CatalogModel es un superconjunto estructural de las interfaces de modelo
// estáticas existentes (GroqModel, OpenAIModel, etc.), por lo que cualquier
// array estático es asignable directamente a CatalogModel[].

export type ProviderId =
  | 'groq'
  | 'routellm'
  | 'openai'
  | 'anthropic'
  | 'opengo'
  | 'opencodezen'
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
}

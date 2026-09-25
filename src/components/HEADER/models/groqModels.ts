// Definición de los modelos de Groq
export interface GroqModel {
  id: string
  name: string
  developer: string
  contextWindow: string
  provider: 'groq'
  maxCompletionTokens?: string
  maxFileSize?: string
  fecha?: string
  velocidad?: string
  precio?: string
}

// Solo modelos disponibles hoy en el plan Developer según
// https://console.groq.com/docs/models y https://console.groq.com/docs/deprecations
// (revisado 2026-09-25). Los Llama 3.x pasaron a Enterprise y compound,
// compound-mini, qwen3-32b, qwen3.6-27b y llama-4-scout fueron apagados.
export const groqModels: GroqModel[] = [
  // OpenAI — Production (Recommended Flagship Default)
  {
    id: 'openai/gpt-oss-120b',
    name: 'OpenAI GPT OSS 120B (Default)',
    developer: 'OpenAI',
    contextWindow: '131072',
    provider: 'groq',
    maxCompletionTokens: '65536',
    velocidad: '500',
    precio: '0.15',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'OpenAI GPT OSS 20B',
    developer: 'OpenAI',
    contextWindow: '131072',
    provider: 'groq',
    maxCompletionTokens: '65536',
    velocidad: '1000',
    precio: '0.075',
  },

  // OpenAI — Preview
  {
    id: 'openai/gpt-oss-safeguard-20b',
    name: 'OpenAI GPT OSS Safeguard 20B',
    developer: 'OpenAI',
    contextWindow: '131072',
    provider: 'groq',
    maxCompletionTokens: '65536',
    velocidad: '1000',
    precio: '0.075',
  },

  // Alibaba Cloud — Preview
  {
    id: 'qwen/qwen3.8-27b',
    name: 'Alibaba Cloud Qwen3.8 27B',
    developer: 'Alibaba Cloud',
    contextWindow: '131072',
    provider: 'groq',
    maxCompletionTokens: '16384',
    maxFileSize: '20 MB',
    velocidad: '450',
    precio: '0.80',
  },
]

// Definición de los modelos de Groq
export interface GroqModel {
  id: string;
  name: string;
  developer: string;
  contextWindow: string;
  provider: "groq";
  maxCompletionTokens?: string;
  maxFileSize?: string;
  fecha?: string;
  velocidad?: string;
  precio?: string;
}

export const groqModels: GroqModel[] = [
  // OpenAI — Production (Recommended Flagship Default)
  {
    id: "openai/gpt-oss-120b",
    name: "OpenAI GPT OSS 120B (Default)",
    developer: "OpenAI",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "65536",
    velocidad: "500",
    precio: "0.15",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "OpenAI GPT OSS 20B",
    developer: "OpenAI",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "65536",
    velocidad: "1000",
    precio: "0.075",
  },

  // Meta — Production
  {
    id: "llama-3.3-70b-versatile",
    name: "Meta Llama 3.3 70B Versatile",
    developer: "Meta",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "32768",
    velocidad: "280",
    precio: "0.59",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Meta Llama 3.1 8B Instant",
    developer: "Meta",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "131072",
    velocidad: "560",
    precio: "0.05",
  },

  // Alibaba Cloud — Preview
  {
    id: "qwen/qwen3-32b",
    name: "Alibaba Cloud Qwen3 32B",
    developer: "Alibaba Cloud",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "40960",
    velocidad: "400",
    precio: "0.20",
  },
  {
    id: "qwen/qwen3.6-27b",
    name: "Alibaba Cloud Qwen3.6 27B",
    developer: "Alibaba Cloud",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "32768",
    velocidad: "500",
    precio: "0.60",
  },

  // Meta — Preview
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Meta Llama 4 Scout 17B 16E",
    developer: "Meta",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "8192",
    velocidad: "750",
    precio: "0.11",
  },

  // Groq Systems — Production
  {
    id: "groq/compound",
    name: "Groq Compound",
    developer: "Groq",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "8192",
    velocidad: "450",
    precio: "0.00",
  },
  {
    id: "groq/compound-mini",
    name: "Groq Compound Mini",
    developer: "Groq",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "8192",
    velocidad: "450",
    precio: "0.00",
  },

  // OpenAI — Preview
  {
    id: "openai/gpt-oss-safeguard-20b",
    name: "OpenAI GPT OSS Safeguard 20B",
    developer: "OpenAI",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "65536",
    velocidad: "1000",
    precio: "0.075",
  },
];

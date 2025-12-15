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
  // Meta
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    name: "Meta Llama 4 Maverick 17B 128E",
    developer: "Meta",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "8192",
    fecha: "2025-10-30",
    velocidad: "600",
    precio: "0.20",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Meta Llama 4 Scout 17B 16E",
    developer: "Meta",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "8192",
    fecha: "2025-10-30",
    velocidad: "750",
    precio: "0.11",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Meta Llama 3.3 Versatile",
    developer: "Meta",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "32768",
    fecha: "2025-10-30",
  },
  {
    id: "llama-3.1-8b-instant",
    name: "Meta Llama 3.1 8B",
    developer: "Meta",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "131072",
    fecha: "2025-10-30",
    velocidad: "560",
    precio: "0.05",
  },

  // Groq
  {
    id: "groq/compound",
    name: "Groq Compound",
    developer: "Groq",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "8192",
    fecha: "2025-10-30",
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
    fecha: "2025-10-30",
    velocidad: "450",
    precio: "0.00",
  },

  // Kimi 2
  {
    id: "moonshotai/kimi-k2-instruct-0905",
    name: "Moonshot AI Kimi K2 0905",
    developer: "Kimi 2 Moonshot AI",
    contextWindow: "262144",
    provider: "groq",
    maxCompletionTokens: "16384",
    fecha: "2025-10-30",
    velocidad: "200",
    precio: "1.00",
  },

  {
    id: "moonshotai/kimi-k2-instruct",
    name: "Moonshot AI Kimi K2",
    developer: "Kimi 2 Moonshot AI",
    contextWindow: "262144",
    provider: "groq",
    maxCompletionTokens: "16384",
    fecha: "2025-10-30",
    velocidad: "200",
    precio: "1.00",
  },

  // OpenAI
  {
    id: "openai/gpt-oss-120b",
    name: "Open AI GPT OSS 120B",
    developer: "Open AI",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "65536",
    fecha: "2025-10-30",
    velocidad: "500",
    precio: "0.15",
  },
  {
    id: "openai/gpt-oss-20b",
    name: "Open AI GPT OSS 20B",
    developer: "Open AI",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "65536",
    fecha: "2025-10-30",
    velocidad: "1000",
    precio: "0.075",
  },
  {
    id: "openai/gpt-oss-safeguard-20b",
    name: "Open AI Safety GPT OSS 20B",
    developer: "Open AI",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "65536",
    fecha: "2025-10-30",
    velocidad: "1000",
    precio: "0.075",
  },

  // Alibaba Cloud
  {
    id: "qwen/qwen3-32b",
    name: "Alibaba Cloud Qwen3-32B",
    developer: "Alibaba Cloud",
    contextWindow: "131072",
    provider: "groq",
    maxCompletionTokens: "40960",
    fecha: "2025-10-30",
    velocidad: "400",
    precio: "0.20",
  },

  // OpenAI Voice
  {
    id: "whisper-large-v3",
    name: "Whisper v3",
    developer: "Open AI",
    contextWindow: "",
    provider: "groq",
    maxFileSize: "25 MB",
  },
  {
    id: "whisper-large-v3-turbo",
    name: "Whisper v3 Turbo",
    developer: "Open AI",
    contextWindow: "",
    provider: "groq",
    maxFileSize: "25 MB",
  },

  // HuggingFace
  {
    id: "distil-whisper-large-v3-en",
    name: "Distil Whisper v3 (EN)",
    developer: "HuggingFace",
    contextWindow: "",
    provider: "groq",
    maxFileSize: "25 MB",
  },

  // PlayHT
  {
    id: "playai-tts",
    name: "PlayAI TTS",
    developer: "Playht, Inc",
    contextWindow: "10K",
    provider: "groq",
  },
  {
    id: "playai-tts-arabic",
    name: "PlayAI TTS Arabic",
    developer: "Playht, Inc",
    contextWindow: "10K",
    provider: "groq",
  },
];

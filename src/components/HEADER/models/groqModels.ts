// Definición de los modelos de Groq
export interface GroqModel {
  id: string;
  name: string;
  developer: string;
  contextWindow: string;
  maxCompletionTokens?: string;
  maxFileSize?: string;
}

export const groqModels: GroqModel[] = [
  // Meta
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 Versatile",
    developer: "Meta",
    contextWindow: "128K",
    maxCompletionTokens: "32,768",
  },
  {
    id: "llama3-8b-8192",
    name: "Llama 3",
    developer: "Meta",
    contextWindow: "8,192",
  },
  {
    id: "meta-llama/llama-4-maverick-17b-128e-instruct",
    name: "Llama 4 Maverick",
    developer: "Meta",
    contextWindow: "131,072",
    maxCompletionTokens: "8,192",
  },
  {
    id: "meta-llama/llama-4-scout-17b-16e-instruct",
    name: "Llama 4 Scout",
    developer: "Meta",
    contextWindow: "131,072",
    maxCompletionTokens: "8,192",
  },

  // Google
  {
    id: "gemma2-9b-it",
    name: "Gemma 2",
    developer: "Google",
    contextWindow: "8,192",
  },

  // Mistral AI
  {
    id: "mistral-saba-24b",
    name: "Mistral Saba",
    developer: "Mistral AI",
    contextWindow: "32K",
  },

  // Alibaba Cloud
  {
    id: "qwen-qwq-32b",
    name: "Qwen QWQ",
    developer: "Alibaba Cloud",
    contextWindow: "128K",
  },

  // DeepSeek
  {
    id: "deepseek-r1-distill-llama-70b",
    name: "Deepseek R1",
    developer: "DeepSeek",
    contextWindow: "128K",
  },

  // OpenAI
  {
    id: "whisper-large-v3",
    name: "Whisper v3",
    developer: "OpenAI",
    contextWindow: "",
    maxFileSize: "25 MB",
  },
  {
    id: "whisper-large-v3-turbo",
    name: "Whisper v3 Turbo",
    developer: "OpenAI",
    contextWindow: "",
    maxFileSize: "25 MB",
  },

  // HuggingFace
  {
    id: "distil-whisper-large-v3-en",
    name: "Distil Whisper v3 (EN)",
    developer: "HuggingFace",
    contextWindow: "",
    maxFileSize: "25 MB",
  },

  // PlayHT
  {
    id: "playai-tts",
    name: "PlayAI TTS",
    developer: "Playht, Inc",
    contextWindow: "10K",
  },
  {
    id: "playai-tts-arabic",
    name: "PlayAI TTS Arabic",
    developer: "Playht, Inc",
    contextWindow: "10K",
  },
];

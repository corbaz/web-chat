// Definición de los modelos de Groq
export interface GroqModel {
    id: string;
    name: string;
    developer: string;
    contextWindow: string;
}

export const groqModels: GroqModel[] = [
    // Meta
    {
        id: "meta-llama/llama-4-maverick-17b-128e-instruct",
        name: "Llama 4 Maverick 17B 128E Instruct",
        developer: "Meta",
        contextWindow: "128K",
    },
    {
        id: "meta-llama/llama-4-scout-17b-16e-instruct",
        name: "Llama 4 Scout 17B 16E Instruct",
        developer: "Meta",
        contextWindow: "128K",
    },
    {
        id: "llama-3.3-70b-versatile",
        name: "Llama 3.3 70B Versatile",
        developer: "Meta",
        contextWindow: "128K",
    },
    {
        id: "llama3-8b-8192",
        name: "Llama 3 8B",
        developer: "Meta",
        contextWindow: "8,192",
    },
    {
        id: "llama-3.1-8b-instant",
        name: "Llama 3.1 8B Instant",
        developer: "Meta",
        contextWindow: "128K",
    },
    {
        id: "llama-guard-3-8b",
        name: "Llama Guard 3 8B",
        developer: "Meta",
        contextWindow: "8,192",
    },
    {
        id: "llama3-70b-8192",
        name: "Llama 3 70B",
        developer: "Meta",
        contextWindow: "8,192",
    },
    {
        id: "llama-3.3-70b-specdec",
        name: "Llama 3.3 70B SpecDec",
        developer: "Meta",
        contextWindow: "8,192",
    },
    {
        id: "llama-3.2-1b-preview",
        name: "Llama 3.2 1B Preview",
        developer: "Meta",
        contextWindow: "8,192",
    },
    {
        id: "llama-3.2-3b-preview",
        name: "Llama 3.2 3B Preview",
        developer: "Meta",
        contextWindow: "8,192",
    },
    {
        id: "llama-3.2-11b-vision-preview",
        name: "Llama 3.2 11B Vision Preview",
        developer: "Meta",
        contextWindow: "8,192",
    },
    {
        id: "llama-3.2-90b-vision-preview",
        name: "Llama 3.2 90B Vision Preview",
        developer: "Meta",
        contextWindow: "8,192",
    },

    // Mistral AI
    {
        id: "mistral-saba-24b",
        name: "Mistral Saba 24B",
        developer: "Mistral AI",
        contextWindow: "32K",
    },

    // Google
    {
        id: "gemma2-9b-it",
        name: "Gemma 2 9B IT",
        developer: "Google",
        contextWindow: "8,192",
    },

    // Alibaba Cloud
    {
        id: "qwen-qwq-32b",
        name: "Qwen QWQ 32B",
        developer: "Alibaba Cloud",
        contextWindow: "128K",
    },
    {
        id: "qwen-2.5-coder-32b",
        name: "Qwen 2.5 Coder 32B",
        developer: "Alibaba Cloud",
        contextWindow: "128K",
    },
    {
        id: "qwen-2.5-32b",
        name: "Qwen 2.5 32B",
        developer: "Alibaba Cloud",
        contextWindow: "128K",
    },

    // DeepSeek / Alibaba Cloud
    {
        id: "deepseek-r1-distill-qwen-32b",
        name: "Deepseek R1 Distill Qwen 32B",
        developer: "DeepSeek / Alibaba Cloud",
        contextWindow: "128K",
    },

    // DeepSeek / Meta
    {
        id: "deepseek-r1-distill-llama-70b",
        name: "Deepseek R1 Distill Llama 70B",
        developer: "DeepSeek / Meta",
        contextWindow: "128K",
    },

    // SDAIA
    {
        id: "allam-2-7b",
        name: "Allam 2 7B",
        developer: "SDAIA",
        contextWindow: "4,096",
    },

    // OpenAI
    {
        id: "whisper-large-v3",
        name: "Whisper Large v3",
        developer: "OpenAI",
        contextWindow: "-",
    },
    {
        id: "whisper-large-v3-turbo",
        name: "Whisper Large v3 Turbo",
        developer: "OpenAI",
        contextWindow: "-",
    },

    // Hugging Face
    {
        id: "distil-whisper-large-v3-en",
        name: "Distil Whisper Large v3 (EN)",
        developer: "Hugging Face",
        contextWindow: "-",
    },

    // PlayAI
    {
        id: "playai-tts",
        name: "PlayAI TTS",
        developer: "PlayAI",
        contextWindow: "8,192",
    },
    {
        id: "playai-tts-arabic",
        name: "PlayAI TTS Arabic",
        developer: "PlayAI",
        contextWindow: "8,192",
    },
];

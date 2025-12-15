// Modelos disponibles vía RouteLLM (Abacus.AI)
export interface RouteLLMModel {
  id: string;
  name: string;
  developer: string;
  contextWindow: string;
  provider: "routellm";
  maxCompletionTokens?: string;
  fecha?: string;
  velocidad?: string;
  precio?: string;
}

export const routellmModels: RouteLLMModel[] = [
  // Auto-router
  {
    id: "route-llm",
    name: "Route LLM (Auto-routing)",
    developer: "RouteLLM",
    contextWindow: "128000",
    provider: "routellm",
  },

  // OpenAI family
  {
    id: "gpt-4o-2024-11-20",
    name: "GPT-4o (2024-11-20)",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "o4-mini",
    name: "O4 Mini",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "o3-pro",
    name: "O3 Pro",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "o3",
    name: "O3",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "o3-mini",
    name: "O3 Mini",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-5",
    name: "GPT-5",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-5-nano",
    name: "GPT-5 Nano",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-5.1-chat-latest",
    name: "GPT-5.1 Chat Latest",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "openai/gpt-oss-120b",
    name: "OpenAI GPT-OSS 120B",
    developer: "OpenAI",
    contextWindow: "128000",
    provider: "routellm",
  },

  // Anthropic
  {
    id: "claude-3-7-sonnet-20250219",
    name: "Claude 3.7 Sonnet",
    developer: "Anthropic",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    developer: "Anthropic",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    developer: "Anthropic",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "claude-opus-4-1-20250805",
    name: "Claude Opus 4.1",
    developer: "Anthropic",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    developer: "Anthropic",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    developer: "Anthropic",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "claude-opus-4-5-20251101",
    name: "Claude Opus 4.5",
    developer: "Anthropic",
    contextWindow: "128000",
    provider: "routellm",
  },

  // Meta Llama
  {
    id: "meta-llama/Llama-4-Maverick-17B-128E-Instruct-FP8",
    name: "Llama 4 Maverick 17B 128E",
    developer: "Meta",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo",
    name: "Llama 3.1 405B Turbo",
    developer: "Meta",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "meta-llama/Meta-Llama-3.1-70B-Instruct",
    name: "Llama 3.1 70B",
    developer: "Meta",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "meta-llama/Meta-Llama-3.1-8B-Instruct",
    name: "Llama 3.1 8B",
    developer: "Meta",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "llama-3.3-70b-versatile",
    name: "Llama 3.3 70B Versatile",
    developer: "Meta",
    contextWindow: "128000",
    provider: "routellm",
  },

  // Google Gemini
  {
    id: "gemini-2.0-flash-001",
    name: "Gemini 2.0 Flash",
    developer: "Google",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gemini-2.0-pro-exp-02-05",
    name: "Gemini 2.0 Pro Exp",
    developer: "Google",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gemini-2.5-pro",
    name: "Gemini 2.5 Pro",
    developer: "Google",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gemini-2.5-flash",
    name: "Gemini 2.5 Flash",
    developer: "Google",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "gemini-3-pro-preview",
    name: "Gemini 3 Pro Preview",
    developer: "Google",
    contextWindow: "128000",
    provider: "routellm",
  },

  // Qwen
  {
    id: "qwen-2.5-coder-32b",
    name: "Qwen 2.5 Coder 32B",
    developer: "Qwen",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "Qwen/Qwen2.5-72B-Instruct",
    name: "Qwen 2.5 72B Instruct",
    developer: "Qwen",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "Qwen/QwQ-32B",
    name: "QwQ 32B",
    developer: "Qwen",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "Qwen/Qwen3-235B-A22B-Instruct-2507",
    name: "Qwen3 235B A22B",
    developer: "Qwen",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "Qwen/Qwen3-32B",
    name: "Qwen3 32B",
    developer: "Qwen",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "qwen/qwen3-coder-480b-a35b-instruct",
    name: "Qwen3 Coder 480B A35B",
    developer: "Qwen",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "qwen/qwen3-Max",
    name: "Qwen3 Max",
    developer: "Qwen",
    contextWindow: "128000",
    provider: "routellm",
  },

  // xAI Grok
  {
    id: "grok-4-0709",
    name: "Grok 4",
    developer: "xAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "grok-4-fast-non-reasoning",
    name: "Grok 4 Fast (NR)",
    developer: "xAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "grok-4-1-fast-non-reasoning",
    name: "Grok 4.1 Fast (NR)",
    developer: "xAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "grok-code-fast-1",
    name: "Grok Code Fast 1",
    developer: "xAI",
    contextWindow: "128000",
    provider: "routellm",
  },

  // Kimi
  {
    id: "kimi-k2-turbo-preview",
    name: "Kimi K2 Turbo Preview",
    developer: "Moonshot AI",
    contextWindow: "128000",
    provider: "routellm",
  },

  // DeepSeek
  {
    id: "deepseek/deepseek-v3.1",
    name: "DeepSeek V3.1",
    developer: "DeepSeek",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "deepseek-ai/DeepSeek-V3.1-Terminus",
    name: "DeepSeek V3.1 Terminus",
    developer: "DeepSeek",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "deepseek-ai/DeepSeek-R1",
    name: "DeepSeek R1",
    developer: "DeepSeek",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "deepseek-ai/DeepSeek-V3.2",
    name: "DeepSeek V3.2",
    developer: "DeepSeek",
    contextWindow: "128000",
    provider: "routellm",
  },

  // GLM
  {
    id: "zai-org/glm-4.5",
    name: "GLM 4.5",
    developer: "ZAI",
    contextWindow: "128000",
    provider: "routellm",
  },
  {
    id: "zai-org/glm-4.6",
    name: "GLM 4.6",
    developer: "ZAI",
    contextWindow: "128000",
    provider: "routellm",
  },
];

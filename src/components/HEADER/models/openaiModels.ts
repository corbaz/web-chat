interface OpenAIModel {
  id: string;
  name: string;
  developer: string;
  provider: "openai";
  maxTokens: number;
}

export const openaiModels: OpenAIModel[] = [
  {
    id: "gpt-4.1-nano",
    name: "GPT-4.1 Nano (Priority - Default)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-5-mini",
    name: "GPT-5 Mini (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4.1-mini",
    name: "GPT-4.1 Mini (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "o4-mini",
    name: "O4 Mini (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4.1",
    name: "GPT-4.1 (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-5",
    name: "GPT-5 (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-5.2",
    name: "GPT-5.2 (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-5-codex",
    name: "GPT-5 Codex (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-5.1",
    name: "GPT-5.1 (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-5.1-codex",
    name: "GPT-5.1 Codex (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-5.1-codex-max",
    name: "GPT-5.1 Codex Max (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "o3",
    name: "O3 (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4o",
    name: "GPT-4o (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4o-2024-05-13",
    name: "GPT-4o 2024-05-13 (Priority)",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
];

interface OpenAIModel {
  id: string;
  name: string;
  developer: string;
  provider: "openai";
  maxTokens: number;
}

export const openaiModels: OpenAIModel[] = [
  {
    id: "gpt-4o",
    name: "GPT-4o",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4o-mini",
    name: "GPT-4o Mini",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4-turbo",
    name: "GPT-4 Turbo",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 128000,
  },
  {
    id: "gpt-4",
    name: "GPT-4",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 8192,
  },
  {
    id: "gpt-3.5-turbo",
    name: "GPT-3.5 Turbo",
    developer: "OpenAI",
    provider: "openai",
    maxTokens: 4096,
  },
];

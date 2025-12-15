interface AnthropicModel {
  id: string;
  name: string;
  developer: string;
  provider: "anthropic";
  maxTokens: number;
}

export const anthropicModels: AnthropicModel[] = [
  {
    id: "claude-3-5-sonnet-20241022",
    name: "Claude 3.5 Sonnet",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  {
    id: "claude-3-5-haiku-20241022",
    name: "Claude 3.5 Haiku",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  {
    id: "claude-3-opus-20250219",
    name: "Claude 3 Opus",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
];

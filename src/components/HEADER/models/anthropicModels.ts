interface AnthropicModel {
  id: string;
  name: string;
  developer: string;
  provider: "anthropic";
  maxTokens: number;
}

export const anthropicModels: AnthropicModel[] = [
  // --- Modelos actuales (Claude 4.x) ---
  {
    id: "claude-opus-4-6",
    name: "Claude Opus 4.6",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  {
    id: "claude-sonnet-4-6",
    name: "Claude Sonnet 4.6",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  {
    id: "claude-haiku-4-5-20251001",
    name: "Claude Haiku 4.5",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  // --- Modelos legacy (aún disponibles) ---
  {
    id: "claude-opus-4-5-20251101",
    name: "Claude Opus 4.5",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  {
    id: "claude-sonnet-4-5-20250929",
    name: "Claude Sonnet 4.5",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  {
    id: "claude-sonnet-4-20250514",
    name: "Claude Sonnet 4",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
  {
    id: "claude-opus-4-20250514",
    name: "Claude Opus 4",
    developer: "Anthropic",
    provider: "anthropic",
    maxTokens: 200000,
  },
];

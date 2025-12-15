// Configuración de proveedores de API
export type ProviderType = "groq" | "routellm" | "openai" | "anthropic";

interface Message {
  role: string;
  content: string;
}

export interface ProviderConfig {
  name: string;
  endpoint: string;
  headerAuth: (apiKey: string) => Record<string, string>;
  payloadBuilder: (
    model: string,
    messages: Message[],
    maxTokens: number,
  ) => Record<string, unknown>;
  warning?: string; // Mensaje de advertencia si el proveedor no es recomendado
}

export const PROVIDERS: Record<ProviderType, ProviderConfig> = {
  groq: {
    name: "Groq",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    headerAuth: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
    }),
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
    ) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
      presence_penalty: 0.1,
      search_settings: {
        include_domains: ["*.*"],
        exclude_domains: [],
      },
    }),
  },
  routellm: {
    name: "RouteLLM",
    endpoint: "https://routellm.abacus.ai/v1/chat/completions",
    headerAuth: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
    }),
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
    ) => ({
      model,
      messages,
      max_tokens: maxTokens,
      stream: false,
    }),
  },
  openai: {
    name: "OpenAI",
    // OpenAI requiere un backend proxy debido a restricciones CORS
    // Para usar OpenAI, necesitas configurar un servidor backend que actúe como proxy
    endpoint: "https://api.openai.com/v1/chat/completions",
    headerAuth: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
    }),
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
    ) => ({
      model,
      messages,
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
    warning:
      "OpenAI requiere un servidor backend proxy para evitar problemas CORS. Se recomienda usar Groq o RouteLLM para ahora.",
  },
  anthropic: {
    name: "Anthropic",
    // Anthropic también requiere un backend proxy
    endpoint: "https://api.anthropic.com/v1/messages",
    headerAuth: (apiKey: string) => ({
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    }),
    payloadBuilder: (model: string, messages: Message[], maxTokens: number) => {
      // Convertir formato OpenAI a formato Anthropic
      const systemMessage = messages
        .filter((m) => m.role === "system")
        .map((m) => m.content)
        .join("\n");

      const contentMessages = messages.filter((m) => m.role !== "system");

      return {
        model,
        max_tokens: maxTokens,
        ...(systemMessage && { system: systemMessage }),
        messages: contentMessages,
      };
    },
    warning:
      "Anthropic requiere un servidor backend proxy para evitar problemas CORS. Se recomienda usar Groq o RouteLLM para ahora.",
  },
};

export const getProviderConfig = (provider: string): ProviderConfig | null => {
  return PROVIDERS[provider as ProviderType] || null;
};

export const getApiKeyStorageKey = (provider: string): string => {
  return `${provider}ApiKey`;
};

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
  parseResponse?: (data: Record<string, unknown>) => string;
  parseActualModel?: (data: Record<string, unknown>) => string;
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
      max_completion_tokens: maxTokens,
      service_tier: "priority",
    }),
    warning:
      "OpenAI requiere un servidor backend proxy para evitar problemas CORS. Se recomienda usar Groq o RouteLLM para ahora.",
  },
  anthropic: {
    name: "Anthropic",
    endpoint: "https://api.anthropic.com/v1/messages",
    headerAuth: (apiKey: string) => ({
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
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
    // Anthropic devuelve content[0].text en lugar de choices[0].message.content
    parseResponse: (data: Record<string, unknown>) => {
      const content = data.content as Array<{ type: string; text: string }>;
      return content[0]?.text ?? "";
    },
    // Anthropic devuelve el modelo exacto usado en el campo "model" de la respuesta
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? "";
    },
  },
};

export const getProviderConfig = (provider: string): ProviderConfig | null => {
  return PROVIDERS[provider as ProviderType] || null;
};

export const getApiKeyStorageKey = (provider: string): string => {
  return `${provider}ApiKey`;
};

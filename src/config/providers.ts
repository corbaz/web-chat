// Configuración de proveedores de API
type ProviderType =
  | "groq"
  | "routellm"
  | "openai"
  | "anthropic"
  | "opengo"
  | "opencodefree"
  | "gemini";

interface Message {
  role: string;
  content: string;
}

export interface ProviderConfig {
  name: string;
  endpoint: (model: string) => string;
  headerAuth: (apiKey: string, model: string) => Record<string, string>;
  payloadBuilder: (
    model: string,
    messages: Message[],
    maxTokens: number,
  ) => Record<string, unknown>;
  parseResponse?: (data: Record<string, unknown>, model: string) => string;
  parseActualModel?: (data: Record<string, unknown>) => string;
  warning?: string; // Mensaje de advertencia si el proveedor no es recomendado
}

const OPENCODE_GO_ANTHROPIC_MODELS = new Set([
  "minimax-m3",
  "minimax-m2.7",
  "minimax-m2.5",
  "qwen3.7-max",
  "qwen3.7-plus",
  "qwen3.6-plus",
]);

const usesOpenCodeGoAnthropic = (model: string): boolean =>
  OPENCODE_GO_ANTHROPIC_MODELS.has(model);

const isLocalhost = (): boolean =>
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1";

const configuredOpenCodeProxy = (
  import.meta.env.VITE_OPENCODE_PROXY_URL || ""
).replace(/\/+$/, "");

const hasSafeProductionProxy =
  configuredOpenCodeProxy.startsWith("/") ||
  configuredOpenCodeProxy.startsWith("https://");

export const isOpenCodeAvailable = (): boolean =>
  isLocalhost() || hasSafeProductionProxy;

export const OPENCODE_UNAVAILABLE_MESSAGE =
  "OpenCode no está disponible en esta instalación. Configura VITE_OPENCODE_PROXY_URL con la URL HTTPS de un proxy propio y vuelve a compilar la aplicación.";

const getOpenCodeBase = (): string =>
  isLocalhost() ? "/opencode-go-api" : configuredOpenCodeProxy;

const buildAnthropicPayload = (
  model: string,
  messages: Message[],
  maxTokens: number,
): Record<string, unknown> => {
  const systemContents: string[] = [];
  const contentMessages: Message[] = [];

  for (const message of messages) {
    if (message.role === "system") {
      systemContents.push(message.content);
    } else {
      contentMessages.push(message);
    }
  }

  const systemMessage = systemContents.join("\n");

  return {
    model,
    max_tokens: maxTokens,
    ...(systemMessage && { system: systemMessage }),
    messages: contentMessages,
  };
};

const parseAnthropicResponse = (data: Record<string, unknown>): string => {
  if (!Array.isArray(data.content)) return "";

  return data.content
    .filter(
      (block): block is { type: "text"; text: string } =>
        typeof block === "object" &&
        block !== null &&
        (block as { type?: unknown }).type === "text" &&
        typeof (block as { text?: unknown }).text === "string",
    )
    .map((block) => block.text)
    .join("");
};

const parseOpenAIResponse = (data: Record<string, unknown>): string => {
  const choices = data.choices as Array<{ message?: { content?: string } }>;
  return choices?.[0]?.message?.content ?? "";
};

const buildGeminiNativePayload = (
  _model: string,
  messages: Message[],
  maxTokens: number,
): Record<string, unknown> => {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];
  let systemText = "";

  for (const message of messages) {
    if (message.role === "system") {
      systemText += (systemText ? "\n" : "") + message.content;
    } else {
      contents.push({
        role: message.role === "assistant" ? "model" : "user",
        parts: [{ text: message.content }],
      });
    }
  }

  return {
    contents,
    ...(systemText && {
      systemInstruction: {
        parts: [{ text: systemText }],
      },
    }),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: 1.0,
    },
  };
};

const parseGeminiNativeResponse = (data: Record<string, unknown>): string => {
  const candidates = data.candidates as Array<{
    content?: { parts?: Array<{ text?: string }> };
  }>;
  return candidates?.[0]?.content?.parts?.[0]?.text ?? "";
};

export const getApiErrorMessage = (data: unknown): string => {
  if (typeof data === "string") return data;
  if (!data || typeof data !== "object") return "";

  const response = data as {
    message?: unknown;
    error?: { message?: unknown; type?: unknown } | string;
  };

  if (typeof response.error === "string") return response.error;
  if (response.error && typeof response.error.message === "string") {
    return response.error.message;
  }
  if (typeof response.message === "string") return response.message;
  if (response.error && typeof response.error.type === "string") {
    return response.error.type;
  }
  return "";
};

export const isInvalidApiKeyError = (data: unknown): boolean => {
  const text =
    typeof data === "string"
      ? data
      : (() => {
          try {
            return JSON.stringify(data);
          } catch {
            return "";
          }
        })();

  return /autherror|invalid api key/i.test(text);
};

const PROVIDERS: Record<ProviderType, ProviderConfig> = {
  groq: {
    name: "Groq",
    endpoint: () => "https://api.groq.com/openai/v1/chat/completions",
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
    endpoint: () => "https://routellm.abacus.ai/v1/chat/completions",
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
    endpoint: () => "https://api.openai.com/v1/chat/completions",
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
    endpoint: () => "https://api.anthropic.com/v1/messages",
    headerAuth: (apiKey: string) => ({
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    }),
    payloadBuilder: buildAnthropicPayload,
    parseResponse: parseAnthropicResponse,
    // Anthropic devuelve el modelo exacto usado en el campo "model" de la respuesta
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? "";
    },
  },
  opengo: {
    name: "OpenCode Go",
    endpoint: (model: string) => {
      const base = getOpenCodeBase();
      if (usesOpenCodeGoAnthropic(model)) {
        return `${base}/zen/go/v1/messages`;
      }
      return `${base}/zen/go/v1/chat/completions`;
    },
    headerAuth: (apiKey: string, model: string): Record<string, string> => {
      if (usesOpenCodeGoAnthropic(model)) {
        return {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        };
      }

      return { Authorization: `Bearer ${apiKey}` };
    },
    payloadBuilder: (model: string, messages: Message[], maxTokens: number) => {
      if (usesOpenCodeGoAnthropic(model)) {
        return buildAnthropicPayload(model, messages, maxTokens);
      }

      return { model, messages, max_tokens: maxTokens };
    },
    parseResponse: (data: Record<string, unknown>, model: string) =>
      usesOpenCodeGoAnthropic(model)
        ? parseAnthropicResponse(data)
        : parseOpenAIResponse(data),
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? "";
    },
    warning:
      "OpenCode Go requiere un proxy de servidor para evitar problemas de CORS en producción. En localhost se utiliza un proxy local automático.",
  },
  opencodefree: {
    name: "OpenCode Free",
    endpoint: () => {
      const base = getOpenCodeBase();
      return `${base}/zen/v1/chat/completions`;
    },
    headerAuth: () => ({}),
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
    ) => ({
      model,
      messages,
      max_tokens: maxTokens,
    }),
    parseResponse: (data: Record<string, unknown>) => {
      const choices = data.choices as Array<{ message?: { content?: string } }>;
      return choices?.[0]?.message?.content ?? "";
    },
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? "";
    },
    warning:
      "OpenCode Free requiere un proxy de servidor para evitar problemas de CORS en producción. En localhost se utiliza un proxy local automático.",
  },
  gemini: {
    name: "Gemini",
    endpoint: (model: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headerAuth: (apiKey: string) => ({
      "x-goog-api-key": apiKey,
    }),
    payloadBuilder: (model: string, messages: Message[], maxTokens: number) =>
      buildGeminiNativePayload(model, messages, maxTokens),
    parseResponse: (data: Record<string, unknown>) =>
      parseGeminiNativeResponse(data),
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

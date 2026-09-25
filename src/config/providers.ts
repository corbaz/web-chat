// Configuración de proveedores de API
import type {
  Citation,
  ExecutedTool,
  ToolConfig,
} from '../interfaces/chat/chatTypes'
import { zenRouteFor } from '../services/modelCatalog/zenRoute'
import {
  compoundToolPayload,
  gptOssToolPayload,
  isToolCapableModel,
  parseExecutedTools,
} from './groqTools'

type ProviderType =
  | 'groq'
  | 'routellm'
  | 'openai'
  | 'anthropic'
  | 'opengo'
  | 'opencodefree'
  | 'opencodezen'
  | 'gemini'

interface Message {
  role: string
  content: string
}

export interface ProviderConfig {
  name: string
  endpoint: (model: string) => string
  headerAuth: (apiKey: string, model: string) => Record<string, string>
  payloadBuilder: (
    model: string,
    messages: Message[],
    maxTokens: number,
    toolsConfig?: ToolConfig,
  ) => Record<string, unknown>
  parseResponse?: (data: Record<string, unknown>, model: string) => string
  parseActualModel?: (data: Record<string, unknown>) => string
  // Normaliza choices[0].message.executed_tools → ExecutedTool[] (solo Groq)
  parseExecutedTools?: (
    data: Record<string, unknown>,
    model: string,
  ) => ExecutedTool[]
  parseCitations?: (data: Record<string, unknown>, model: string) => Citation[]
  parseSearchState?: (
    data: Record<string, unknown>,
    model: string,
  ) => 'incomplete' | undefined
  preflight?: (
    apiKey: string,
    model: string,
  ) => Promise<'unknown' | 'checking' | 'available' | 'unavailable'>
  buildRequest?: (
    model: string,
    messages: Message[],
    maxTokens: number,
    toolsConfig?: ToolConfig,
  ) => { url: string; body: Record<string, unknown>; parser: string } | null
  buildSearchContinuation?: (
    model: string,
    data: Record<string, unknown>,
    responseText: string,
    toolsConfig?: ToolConfig,
  ) => { url: string; body: Record<string, unknown> } | null
  warning?: string // Mensaje de advertencia si el proveedor no es recomendado
}

const OPENCODE_GO_ANTHROPIC_MODELS = new Set([
  'minimax-m3',
  'minimax-m2.7',
  'minimax-m2.5',
  'qwen3.7-max',
  'qwen3.7-plus',
  'qwen3.6-plus',
])

const usesOpenCodeGoAnthropic = (model: string): boolean =>
  OPENCODE_GO_ANTHROPIC_MODELS.has(model)

const isLocalhost = (): boolean =>
  window.location.hostname === 'localhost' ||
  window.location.hostname === '127.0.0.1'

const configuredOpenCodeProxy = (
  import.meta.env.VITE_OPENCODE_PROXY_URL || ''
).replace(/\/+$/, '')

const hasSafeProductionProxy =
  configuredOpenCodeProxy.startsWith('/') ||
  configuredOpenCodeProxy.startsWith('https://')

export const isOpenCodeAvailable = (): boolean =>
  isLocalhost() || hasSafeProductionProxy

export const OPENCODE_UNAVAILABLE_MESSAGE =
  'OpenCode no está disponible en esta instalación. Configura VITE_OPENCODE_PROXY_URL con la URL HTTPS de un proxy propio y vuelve a compilar la aplicación.'

const getOpenCodeBase = (): string =>
  isLocalhost() ? '/opencode-go-api' : configuredOpenCodeProxy

const buildAnthropicPayload = (
  model: string,
  messages: Message[],
  maxTokens: number,
  toolsConfig?: ToolConfig,
): Record<string, unknown> => {
  const systemContents: string[] = []
  const contentMessages: Message[] = []

  for (const message of messages) {
    if (message.role === 'system') {
      systemContents.push(message.content)
    } else {
      contentMessages.push(message)
    }
  }

  const systemMessage = systemContents.join('\n')

  return {
    model,
    max_tokens: maxTokens,
    ...(systemMessage && { system: systemMessage }),
    messages: contentMessages,
    ...(toolsConfig?.searchEnabled === true && {
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
          max_uses: 5,
        },
      ],
    }),
  }
}

const parseAnthropicResponse = (data: Record<string, unknown>): string => {
  if (!Array.isArray(data.content)) return ''

  return data.content
    .filter(
      (block): block is { type: 'text'; text: string } =>
        typeof block === 'object' &&
        block !== null &&
        (block as { type?: unknown }).type === 'text' &&
        typeof (block as { text?: unknown }).text === 'string',
    )
    .map((block) => block.text)
    .join('')
}

const parseAnthropicCitations = (data: Record<string, unknown>): Citation[] => {
  try {
    const content = data.content as any[]
    if (Array.isArray(content)) {
      const citationsList: Citation[] = []
      for (const block of content) {
        if (Array.isArray(block.citations)) {
          for (const cit of block.citations) {
            if (cit && cit.url) {
              citationsList.push({
                url: cit.url,
                title: cit.title || undefined,
                snippet: cit.cited_text || undefined,
              })
            }
          }
        }
      }
      return citationsList
    }
  } catch (e) {
    console.error('Error parseando citaciones de Anthropic:', e)
  }
  return []
}

const parseOpenAIResponse = (data: Record<string, unknown>): string => {
  if (Array.isArray(data.output)) {
    // Responses API
    const texts: string[] = []
    for (const item of data.output) {
      if (item && Array.isArray(item.content)) {
        for (const chunk of item.content) {
          if (chunk && typeof chunk.text === 'string') {
            texts.push(chunk.text)
          }
        }
      }
    }
    return texts.join('\n')
  }
  // Chat Completions fallback
  const choices = data.choices as Array<{ message?: { content?: string } }>
  return choices?.[0]?.message?.content ?? ''
}

const parseOpenAICitations = (data: Record<string, unknown>): Citation[] => {
  const citationsList: Citation[] = []
  try {
    // 1. OpenAI Responses format (output[].annotations[].url_citation)
    if (Array.isArray(data.output)) {
      for (const item of data.output) {
        if (item && Array.isArray(item.annotations)) {
          for (const annot of item.annotations) {
            if (annot && annot.url_citation && annot.url_citation.url) {
              citationsList.push({
                url: annot.url_citation.url,
                title: annot.url_citation.title || undefined,
              })
            }
          }
        }
      }
    }

    // 2. Direct data.citations array (Common in proxies like Perplexity, DeepSeek, OpenCode)
    if (Array.isArray(data.citations)) {
      for (const cit of data.citations) {
        if (typeof cit === 'string') {
          citationsList.push({ url: cit })
        } else if (cit && typeof cit === 'object') {
          const url = (cit as any).url || (cit as any).uri || (cit as any).link
          if (url) {
            citationsList.push({
              url,
              title: (cit as any).title || undefined,
              snippet:
                (cit as any).snippet || (cit as any).content || undefined,
            })
          }
        }
      }
    }

    // 3. message.citations array (Common in OpenAI-compatible proxies)
    const choices = data.choices as any[]
    const message = choices?.[0]?.message
    if (message && Array.isArray(message.citations)) {
      for (const cit of message.citations) {
        if (typeof cit === 'string') {
          citationsList.push({ url: cit })
        } else if (cit && typeof cit === 'object') {
          const url = cit.url || cit.uri || cit.link
          if (url) {
            citationsList.push({
              url,
              title: cit.title || undefined,
              snippet: cit.snippet || cit.content || undefined,
            })
          }
        }
      }
    }

    // 4. data.search_results array (Common in Groq/Perplexity fallback proxies)
    if (Array.isArray(data.search_results)) {
      for (const res of data.search_results) {
        if (res && res.url) {
          citationsList.push({
            url: res.url,
            title: res.title || undefined,
            snippet: res.snippet || res.content || undefined,
          })
        }
      }
    }
  } catch (e) {
    console.error('Error parseando citaciones genéricas de OpenAI:', e)
  }
  return citationsList
}

// Construye el body de la Responses API de OpenAI (`/v1/responses`).
// Función pura y reutilizable: la usa `openai` (solo con búsqueda web
// activa, ver buildOpenAIRequest) y `opencodezen` (siempre, para las
// familias gpt-*/grok-*/muse-*, que en Zen solo hablan este protocolo).
const buildResponsesPayload = (
  model: string,
  messages: Message[],
  toolsConfig?: ToolConfig,
): Record<string, unknown> => {
  const input = messages.map((m) => ({
    role: m.role,
    content: m.content,
  }))

  return {
    model,
    input,
    ...(toolsConfig?.searchEnabled === true && {
      tools: [
        {
          type: 'web_search',
        },
      ],
      include: ['web_search_call.action.sources'],
    }),
  }
}

const buildOpenAIRequest = (
  model: string,
  messages: Message[],
  _maxTokens: number,
  toolsConfig?: ToolConfig,
) => {
  if (toolsConfig?.searchEnabled !== true) {
    return null
  }

  return {
    url: 'https://api.openai.com/v1/responses',
    body: buildResponsesPayload(model, messages, toolsConfig),
    parser: 'openai-responses',
  }
}

const getGeminiSearchInstruction = (): string => {
  const currentDate = new Intl.DateTimeFormat('es-AR', {
    timeZone: 'America/Argentina/Buenos_Aires',
    dateStyle: 'full',
  }).format(new Date())

  return `Fecha actual en Buenos Aires: ${currentDate}. El usuario activó la búsqueda web: antes de responder debes ejecutar al menos una búsqueda de Google y basar la respuesta en los resultados encontrados. Si el pedido incluye varias entidades o datos, busca y responde cada uno antes de finalizar, y contrasta cada dato con al menos dos fuentes cuando sea posible. En consultas deportivas ambiguas entre dos equipos, busca primero el enfrentamiento más reciente y especifica fecha y competencia; no respondas con el historial general salvo que el usuario lo pida. Los seguimientos breves conservan el tema de los turnos recientes. Si no puedes buscar, indícalo y no respondas desde información antigua.`
}

const buildGeminiNativePayload = (
  _model: string,
  messages: Message[],
  maxTokens: number,
  toolsConfig?: ToolConfig,
): Record<string, unknown> => {
  const contents: Array<{ role: string; parts: Array<{ text: string }> }> = []
  let systemText = ''

  for (const message of messages) {
    if (message.role === 'system') {
      systemText += (systemText ? '\n' : '') + message.content
    } else {
      contents.push({
        role: message.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: message.content }],
      })
    }
  }

  const isSearchOn = toolsConfig?.searchEnabled === true
  const searchInstruction = isSearchOn ? getGeminiSearchInstruction() : ''
  const continuityInstruction =
    'Trata cada mensaje como continuación de esta conversación, incluso si cambió el modelo. Antes de pedir aclaraciones, resuelve sujetos omitidos y referencias breves usando los turnos recientes. Pregunta solo si después de revisar el historial quedan varias interpretaciones plausibles.'
  const effectiveSystemText = [
    systemText,
    continuityInstruction,
    searchInstruction,
  ]
    .filter(Boolean)
    .join('\n')

  return {
    contents,
    ...(effectiveSystemText && {
      systemInstruction: {
        parts: [{ text: effectiveSystemText }],
      },
    }),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature: isSearchOn ? 0.2 : 1.0,
    },
    ...(isSearchOn && {
      tools: [
        {
          google_search: {},
        },
      ],
    }),
  }
}

const buildGeminiRequest = (
  model: string,
  messages: Message[],
  _maxTokens: number,
  toolsConfig?: ToolConfig,
) => {
  if (toolsConfig?.searchEnabled !== true) {
    return null
  }

  return {
    url: 'https://generativelanguage.googleapis.com/v1beta/interactions',
    body: {
      model,
      input: [
        getGeminiSearchInstruction(),
        ...messages.map((message) => `${message.role}: ${message.content}`),
      ].join('\n\n'),
      tools: [{ type: 'google_search' }],
    },
    parser: 'gemini-interactions',
  }
}

const GEMINI_INCOMPLETE_SEARCH_PATTERN =
  /\b(?:no (?:pude|pudimos|logré|logramos|encontré|encontramos|hallé|hallamos|conseguí|conseguimos|fue posible|se pudo) (?:encontrar|hallar|conseguir|verificar|confirmar|obtener)|no (?:hay|dispongo de|se dispone de) (?:información|datos|fuentes)|(?:información|datos|detalles|alineación|formación|respuesta) (?:no (?:está|están|fue|fueron|pudo|pudieron)|falt(?:a|an))|(?:me|nos) falta(?:n)?|qued(?:a|an) pendiente(?:s)?|could(?: not|n't) (?:find|verify|confirm)|unable to (?:find|verify|confirm)|missing (?:information|data|details))\b/i

const buildGeminiSearchContinuation = (
  model: string,
  data: Record<string, unknown>,
  responseText: string,
  toolsConfig?: ToolConfig,
) => {
  const interactionId = data.id
  if (
    toolsConfig?.searchEnabled !== true ||
    typeof interactionId !== 'string' ||
    !interactionId ||
    !GEMINI_INCOMPLETE_SEARCH_PATTERN.test(responseText)
  ) {
    return null
  }

  return {
    url: 'https://generativelanguage.googleapis.com/v1beta/interactions',
    body: {
      model,
      previous_interaction_id: interactionId,
      input:
        'Tu respuesta anterior dejó parte del pedido sin resolver. Revisa el pedido original y tu borrador, identifica cada entidad o dato solicitado que falta y ejecuta búsquedas de Google adicionales para completarlos. Contrasta cada dato con al menos dos fuentes cuando sea posible. Devuelve una única respuesta final, autocontenida y completa que reemplace el borrador anterior; no respondas solo con el complemento.',
      tools: [{ type: 'google_search' }],
    },
  }
}

const parseGeminiNativeResponse = (data: Record<string, unknown>): string => {
  const steps = data.steps as Array<{
    type?: string
    content?: Array<{ text?: string }>
  }>
  if (Array.isArray(steps)) {
    const latestOutput = steps.findLast((step) => step.type === 'model_output')
    return (latestOutput?.content ?? [])
      .map((content) => content.text ?? '')
      .join('\n')
      .trim()
  }

  const candidates = data.candidates as Array<{
    content?: { parts?: Array<{ text?: string; thought?: boolean }> }
  }>
  const parts = candidates?.[0]?.content?.parts ?? []
  const visibleText = parts
    .filter((part) => part.thought !== true && typeof part.text === 'string')
    .map((part) => part.text)
  const textParts = visibleText.length
    ? visibleText
    : parts
        .filter((part) => typeof part.text === 'string')
        .map((part) => part.text)

  return textParts.join('\n').trim()
}

const parseGeminiCitations = (data: Record<string, unknown>): Citation[] => {
  const citationsList: Citation[] = []
  const seenUrls = new Set<string>()
  const appendCitation = (url: string, title?: string) => {
    if (seenUrls.has(url)) return
    seenUrls.add(url)
    citationsList.push({ url, title })
  }

  try {
    const steps = data.steps as Array<{
      type?: string
      content?: Array<{
        annotations?: Array<{ url?: string; uri?: string; title?: string }>
      }>
    }>
    if (Array.isArray(steps)) {
      for (const step of steps) {
        if (step.type !== 'model_output' || !Array.isArray(step.content))
          continue
        for (const content of step.content) {
          if (!Array.isArray(content.annotations)) continue
          for (const annotation of content.annotations) {
            const url = annotation.url ?? annotation.uri
            if (url) appendCitation(url, annotation.title)
          }
        }
      }
    }

    const candidates = data.candidates as any[]
    const groundingMetadata = candidates?.[0]?.groundingMetadata
    const groundingChunks = groundingMetadata?.groundingChunks
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        const web = chunk?.web
        if (web && web.uri) {
          appendCitation(web.uri, web.title || undefined)
        }
      }
    }
  } catch (e) {
    console.error('Error parseando citaciones de Gemini:', e)
  }
  return citationsList
}

export const getApiErrorMessage = (data: unknown): string => {
  if (typeof data === 'string') return data
  if (!data || typeof data !== 'object') return ''

  const response = data as {
    message?: unknown
    error?: { message?: unknown; type?: unknown } | string
  }

  if (typeof response.error === 'string') return response.error
  if (response.error && typeof response.error.message === 'string') {
    return response.error.message
  }
  if (typeof response.message === 'string') return response.message
  if (response.error && typeof response.error.type === 'string') {
    return response.error.type
  }
  return ''
}

export const isInvalidApiKeyError = (data: unknown): boolean => {
  const text =
    typeof data === 'string'
      ? data
      : (() => {
          try {
            return JSON.stringify(data)
          } catch {
            return ''
          }
        })()

  return /autherror|invalid api key/i.test(text)
}

const PROVIDERS: Record<ProviderType, ProviderConfig> = {
  groq: {
    name: 'Groq',
    endpoint: () => 'https://api.groq.com/openai/v1/chat/completions',
    headerAuth: (apiKey: string) => ({
      Authorization: `Bearer ${apiKey}`,
    }),
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
      toolsConfig?: ToolConfig,
    ) => {
      const base: Record<string, unknown> = {
        model,
        messages,
        temperature: 0.7,
        max_tokens: maxTokens,
        presence_penalty: 0.1,
      }
      // Solo se inyecta compound_custom / tools cuando toolsConfig está presente
      // y el modelo es tool-capable (verificación live 1.1). Sin toolsConfig no
      // hay inyección: compound auto-usa herramientas por defecto; GPT-OSS no las
      // usa — comportamiento previo preservado en Fase 1.
      const family = isToolCapableModel(model)
      if (family === 'compound' && toolsConfig) {
        Object.assign(base, compoundToolPayload(toolsConfig))
      } else if (family === 'gpt-oss' && toolsConfig) {
        Object.assign(base, gptOssToolPayload(toolsConfig))
      }
      return base
    },
    parseExecutedTools,
  },
  routellm: {
    name: 'RouteLLM',
    endpoint: () => 'https://routellm.abacus.ai/v1/chat/completions',
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
    name: 'OpenAI',
    // OpenAI requiere un backend proxy debido a restricciones CORS
    // Para usar OpenAI, necesitas configurar un servidor backend que actúe como proxy
    endpoint: () => 'https://api.openai.com/v1/chat/completions',
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
      service_tier: 'priority',
    }),
    parseResponse: parseOpenAIResponse,
    parseCitations: parseOpenAICitations,
    buildRequest: buildOpenAIRequest,
    warning:
      'OpenAI requiere un servidor backend proxy para evitar problemas CORS. Se recomienda usar Groq o RouteLLM para ahora.',
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: () => 'https://api.anthropic.com/v1/messages',
    headerAuth: (apiKey: string) => ({
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    }),
    payloadBuilder: buildAnthropicPayload,
    parseResponse: parseAnthropicResponse,
    // Anthropic devuelve el modelo exacto usado en el campo "model" de la respuesta
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? ''
    },
    parseCitations: parseAnthropicCitations,
    parseSearchState: (data: Record<string, unknown>) => {
      return data.stop_reason === 'pause_turn' ? 'incomplete' : undefined
    },
  },
  opengo: {
    name: 'OpenCode Go',
    endpoint: (model: string) => {
      const base = getOpenCodeBase()
      if (usesOpenCodeGoAnthropic(model)) {
        return `${base}/zen/go/v1/messages`
      }
      return `${base}/zen/go/v1/chat/completions`
    },
    headerAuth: (apiKey: string, model: string): Record<string, string> => {
      if (usesOpenCodeGoAnthropic(model)) {
        return {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        }
      }

      return { Authorization: `Bearer ${apiKey}` }
    },
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
      toolsConfig?: ToolConfig,
    ) => {
      if (usesOpenCodeGoAnthropic(model)) {
        return buildAnthropicPayload(model, messages, maxTokens, toolsConfig)
      }

      return {
        model,
        messages,
        max_tokens: maxTokens,
        ...(toolsConfig?.searchEnabled === true && {
          tools: [
            {
              type: 'web_search',
            },
          ],
        }),
      }
    },
    parseResponse: (data: Record<string, unknown>, model: string) =>
      usesOpenCodeGoAnthropic(model)
        ? parseAnthropicResponse(data)
        : parseOpenAIResponse(data),
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? ''
    },
    parseCitations: (data: Record<string, unknown>, model: string) => {
      if (usesOpenCodeGoAnthropic(model)) {
        return parseAnthropicCitations(data)
      }
      return parseOpenAICitations(data)
    },
    warning:
      'OpenCode Go requiere un proxy de servidor para evitar problemas de CORS en producción. En localhost se utiliza un proxy local automático.',
  },
  opencodefree: {
    name: 'OpenCode Free',
    endpoint: () => {
      const base = getOpenCodeBase()
      return `${base}/zen/v1/chat/completions`
    },
    headerAuth: () => ({}),
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
      toolsConfig?: ToolConfig,
    ) => ({
      model,
      messages,
      max_tokens: maxTokens,
      ...(toolsConfig?.searchEnabled === true && {
        tools: [
          {
            type: 'web_search',
          },
        ],
      }),
    }),
    parseResponse: parseOpenAIResponse,
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? ''
    },
    parseCitations: (data: Record<string, unknown>) => {
      return parseOpenAICitations(data)
    },
    warning:
      'OpenCode Free requiere un proxy de servidor para evitar problemas de CORS en producción. En localhost se utiliza un proxy local automático.',
  },
  opencodezen: {
    name: 'OpenCode Zen',
    // El endpoint de chat depende de la familia del modelo (ver zenRoute.ts):
    // gpt-*/grok-*/muse-* -> Responses API, claude-*/qwen* -> Messages API,
    // gemini-* -> generateContent, el resto -> Chat Completions genérico.
    endpoint: (model: string) => {
      const base = getOpenCodeBase()
      switch (zenRouteFor(model)) {
        case 'responses':
          return `${base}/zen/v1/responses`
        case 'messages':
          return `${base}/zen/v1/messages`
        case 'gemini':
          return `${base}/zen/v1/models/${model}:generateContent`
        default:
          return `${base}/zen/v1/chat/completions`
      }
    },
    headerAuth: (apiKey: string, model: string): Record<string, string> => {
      const route = zenRouteFor(model)
      if (route === 'messages') {
        return {
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        }
      }
      if (route === 'gemini') {
        // @ai-sdk/google envía la key de Zen en este header, no Bearer.
        return { 'x-goog-api-key': apiKey }
      }
      return { Authorization: `Bearer ${apiKey}` }
    },
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
      toolsConfig?: ToolConfig,
    ) => {
      const route = zenRouteFor(model)
      if (route === 'messages') {
        return buildAnthropicPayload(model, messages, maxTokens, toolsConfig)
      }
      if (route === 'gemini') {
        return buildGeminiNativePayload(model, messages, maxTokens, toolsConfig)
      }
      if (route === 'responses') {
        return buildResponsesPayload(model, messages, toolsConfig)
      }
      return {
        model,
        messages,
        max_tokens: maxTokens,
        ...(toolsConfig?.searchEnabled === true && {
          tools: [
            {
              type: 'web_search',
            },
          ],
        }),
      }
    },
    parseResponse: (data: Record<string, unknown>, model: string) => {
      const route = zenRouteFor(model)
      if (route === 'messages') return parseAnthropicResponse(data)
      if (route === 'gemini') return parseGeminiNativeResponse(data)
      // 'responses' y 'chat' comparten forma de respuesta compatible OpenAI.
      return parseOpenAIResponse(data)
    },
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? ''
    },
    parseCitations: (data: Record<string, unknown>, model: string) => {
      const route = zenRouteFor(model)
      if (route === 'messages') return parseAnthropicCitations(data)
      if (route === 'gemini') return parseGeminiCitations(data)
      return parseOpenAICitations(data)
    },
    parseSearchState: (data: Record<string, unknown>, model: string) => {
      if (zenRouteFor(model) !== 'messages') return undefined
      return data.stop_reason === 'pause_turn' ? 'incomplete' : undefined
    },
    warning:
      'OpenCode Zen requiere un proxy de servidor para evitar problemas de CORS en producción. En localhost se utiliza un proxy local automático.',
  },
  gemini: {
    name: 'Gemini',
    endpoint: (model: string) =>
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    headerAuth: (apiKey: string) => ({
      'x-goog-api-key': apiKey,
    }),
    payloadBuilder: (
      model: string,
      messages: Message[],
      maxTokens: number,
      toolsConfig?: ToolConfig,
    ) => buildGeminiNativePayload(model, messages, maxTokens, toolsConfig),
    buildRequest: buildGeminiRequest,
    buildSearchContinuation: buildGeminiSearchContinuation,
    parseResponse: (data: Record<string, unknown>) =>
      parseGeminiNativeResponse(data),
    parseActualModel: (data: Record<string, unknown>) => {
      return (data.model as string) ?? ''
    },
    parseCitations: parseGeminiCitations,
  },
}

export const getProviderConfig = (provider: string): ProviderConfig | null => {
  return PROVIDERS[provider as ProviderType] || null
}

export const getApiKeyStorageKey = (provider: string): string => {
  return `${provider}ApiKey`
}

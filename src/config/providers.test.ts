import { describe, expect, test } from 'bun:test'
import { getProviderConfig } from './providers'

const textOnly = [
  { role: 'system', content: 'Eres un asistente.' },
  { role: 'user', content: 'Hola' },
]

const oneRedPixelPng = {
  mimeType: 'image/png',
  data: 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=',
}

describe('providers: payloadBuilder sin imágenes queda byte-idéntico', () => {
  test('Groq (chat completions)', () => {
    const groq = getProviderConfig('groq')
    const payload = groq?.payloadBuilder(
      'llama-3.3-70b-versatile',
      textOnly,
      2048,
    )
    expect(payload).toEqual({
      model: 'llama-3.3-70b-versatile',
      messages: textOnly,
      temperature: 0.7,
      max_tokens: 2048,
      presence_penalty: 0.1,
    })
  })

  test('RouteLLM (chat completions)', () => {
    const routellm = getProviderConfig('routellm')
    const payload = routellm?.payloadBuilder('route-1', textOnly, 2048)
    expect(payload).toEqual({
      model: 'route-1',
      messages: textOnly,
      max_tokens: 2048,
      stream: false,
    })
  })

  test('Anthropic (messages)', () => {
    const anthropic = getProviderConfig('anthropic')
    const payload = anthropic?.payloadBuilder('claude-sonnet-5', textOnly, 2048)
    expect(payload).toEqual({
      model: 'claude-sonnet-5',
      max_tokens: 2048,
      system: 'Eres un asistente.',
      messages: [{ role: 'user', content: 'Hola' }],
    })
  })

  test('Gemini (generateContent)', () => {
    const gemini = getProviderConfig('gemini')
    const payload = gemini?.payloadBuilder('gemini-2.5-flash', textOnly, 2048)
    expect(payload).toEqual({
      contents: [{ role: 'user', parts: [{ text: 'Hola' }] }],
      systemInstruction: {
        parts: [
          {
            text: [
              'Eres un asistente.',
              'Trata cada mensaje como continuación de esta conversación, incluso si cambió el modelo. Antes de pedir aclaraciones, resuelve sujetos omitidos y referencias breves usando los turnos recientes. Pregunta solo si después de revisar el historial quedan varias interpretaciones plausibles.',
            ].join('\n'),
          },
        ],
      },
      generationConfig: { maxOutputTokens: 2048, temperature: 1.0 },
    })
  })

  test('OpenAI Responses (con búsqueda web activa, sin imágenes)', () => {
    const openai = getProviderConfig('openai')
    const req = openai?.buildRequest?.('gpt-5', textOnly, 2048, {
      web_search: false,
      code_interpreter: false,
      visit_website: false,
      wolfram_alpha: false,
      browser_search: false,
      searchEnabled: true,
    })
    expect(req?.body).toEqual({
      model: 'gpt-5',
      input: textOnly,
      tools: [{ type: 'web_search' }],
      include: ['web_search_call.action.sources'],
    })
  })

  test('OpenAI sin imágenes y sin búsqueda: buildRequest devuelve null', () => {
    const openai = getProviderConfig('openai')
    const req = openai?.buildRequest?.('gpt-5', textOnly, 2048)
    expect(req).toBeNull()
  })
})

describe('providers: payloadBuilder con imágenes usa la forma del protocolo', () => {
  const messagesWithImage = [
    { role: 'system', content: 'Eres un asistente.' },
    {
      role: 'user',
      content: '¿Qué hay en la imagen?',
      images: [oneRedPixelPng],
    },
  ]

  test('Groq: content pasa a array con image_url', () => {
    const groq = getProviderConfig('groq')
    const payload = groq?.payloadBuilder(
      'qwen/qwen3.8-27b',
      messagesWithImage,
      2048,
    ) as { messages: unknown[] }
    expect(payload.messages[0]).toEqual({
      role: 'system',
      content: 'Eres un asistente.',
    })
    expect(payload.messages[1]).toEqual({
      role: 'user',
      content: [
        { type: 'text', text: '¿Qué hay en la imagen?' },
        {
          type: 'image_url',
          image_url: {
            url: `data:image/png;base64,${oneRedPixelPng.data}`,
          },
        },
      ],
    })
  })

  test('OpenAI: buildRequest usa Responses API con input_image incluso sin búsqueda', () => {
    const openai = getProviderConfig('openai')
    const req = openai?.buildRequest?.('gpt-4o', messagesWithImage, 2048)
    expect(req?.url).toBe('https://api.openai.com/v1/responses')
    expect(req?.parser).toBe('openai-responses')
    const body = req?.body as { input: unknown[] }
    expect(body.input[1]).toEqual({
      role: 'user',
      content: [
        { type: 'input_text', text: '¿Qué hay en la imagen?' },
        {
          type: 'input_image',
          image_url: `data:image/png;base64,${oneRedPixelPng.data}`,
        },
      ],
    })
  })

  test('Anthropic: content lleva bloques image + text', () => {
    const anthropic = getProviderConfig('anthropic')
    const payload = anthropic?.payloadBuilder(
      'claude-sonnet-5',
      messagesWithImage,
      2048,
    ) as { messages: Array<{ role: string; content: unknown }> }
    expect(payload.messages).toEqual([
      {
        role: 'user',
        content: [
          {
            type: 'image',
            source: {
              type: 'base64',
              media_type: 'image/png',
              data: oneRedPixelPng.data,
            },
          },
          { type: 'text', text: '¿Qué hay en la imagen?' },
        ],
      },
    ])
  })

  test('Gemini: parts lleva inline_data + text', () => {
    const gemini = getProviderConfig('gemini')
    const payload = gemini?.payloadBuilder(
      'gemini-2.5-flash',
      messagesWithImage,
      2048,
    ) as { contents: Array<{ role: string; parts: unknown[] }> }
    expect(payload.contents).toEqual([
      {
        role: 'user',
        parts: [
          {
            inline_data: {
              mime_type: 'image/png',
              data: oneRedPixelPng.data,
            },
          },
          { text: '¿Qué hay en la imagen?' },
        ],
      },
    ])
  })

  test('Gemini: buildRequest (interactions/búsqueda) se salta si hay imágenes', () => {
    const gemini = getProviderConfig('gemini')
    const req = gemini?.buildRequest?.(
      'gemini-2.5-flash',
      messagesWithImage,
      2048,
      {
        web_search: false,
        code_interpreter: false,
        visit_website: false,
        wolfram_alpha: false,
        browser_search: false,
        searchEnabled: true,
      },
    )
    expect(req).toBeNull()
  })
})

// Catálogo estático semilla de Gemini (suscripción de Google AI Pro, ver
// odd/tasks/gemini-subscription-bridge.md). Son los modelos que lista
// `agy models` (verificado en vivo 2026-10-02); el catálogo real se refresca
// desde el bridge (ver src/services/modelCatalog/fetchers/geminiSubFetcher.ts).
// El esfuerzo de razonamiento va en el id (-low / -medium / -high): cada id es
// un modelo distinto, sin slider.

export interface GeminiSubModel {
  id: string
  name: string
  developer: string
  provider: 'geminisub'
  contextWindow?: string
}

const GEMINI_CONTEXT = '1048576'

const flashModels: GeminiSubModel[] = ['3.8', '3.7', '3.6'].flatMap((version) =>
  [
    ['high', 'High'],
    ['medium', 'Medium'],
    ['low', 'Low'],
  ].map(([effort, label]) => ({
    id: `gemini-${version}-flash-${effort}`,
    name: `Gemini ${version} Flash (${label})`,
    developer: 'Google',
    provider: 'geminisub' as const,
    contextWindow: GEMINI_CONTEXT,
  })),
)

export const geminiSubModels: GeminiSubModel[] = [
  ...flashModels,
  {
    id: 'gemini-3.1-pro-high',
    name: 'Gemini 3.1 Pro (High)',
    developer: 'Google',
    provider: 'geminisub',
    contextWindow: GEMINI_CONTEXT,
  },
  {
    id: 'gemini-3.1-pro-low',
    name: 'Gemini 3.1 Pro (Low)',
    developer: 'Google',
    provider: 'geminisub',
    contextWindow: GEMINI_CONTEXT,
  },
  {
    id: 'claude-sonnet-4-6',
    name: 'Claude Sonnet 4.6 (Thinking)',
    developer: 'Anthropic',
    provider: 'geminisub',
    contextWindow: '200000',
  },
  {
    id: 'claude-opus-4-6-thinking',
    name: 'Claude Opus 4.6 (Thinking)',
    developer: 'Anthropic',
    provider: 'geminisub',
    contextWindow: '200000',
  },
  {
    id: 'gpt-oss-120b-medium',
    name: 'GPT-OSS 120B (Medium)',
    developer: 'OpenAI',
    provider: 'geminisub',
    contextWindow: '131072',
  },
]

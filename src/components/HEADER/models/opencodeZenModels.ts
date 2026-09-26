// Catálogo estático semilla de OpenCode Zen (plan pago, con API key).
// Se usa como metadata para IDs conocidos y como fallback offline/ante
// fallo del fetch dinámico (ver src/services/modelCatalog/fetchers/zenFetcher.ts).
// contextWindow es aproximado (no siempre documentado por Zen); los modelos
// desconocidos que llegue a listar el fetch dinámico reciben nombre y
// desarrollador derivados del propio ID (ver naming.ts).

export interface OpenCodeZenModel {
  id: string
  name: string
  developer: string
  provider: 'opencodezen'
  contextWindow?: string
}

export const opencodeZenModels: OpenCodeZenModel[] = [
  {
    id: 'claude-sonnet-5',
    name: 'Claude Sonnet 5',
    developer: 'Anthropic',
    provider: 'opencodezen',
    contextWindow: '200000',
  },
  {
    id: 'claude-haiku-4-5',
    name: 'Claude Haiku 4.5',
    developer: 'Anthropic',
    provider: 'opencodezen',
    contextWindow: '200000',
  },
  {
    id: 'gpt-5.4-mini',
    name: 'GPT-5.4 Mini',
    developer: 'OpenAI',
    provider: 'opencodezen',
    contextWindow: '400000',
  },
  {
    id: 'gemini-3.5-flash',
    name: 'Gemini 3.5 Flash',
    developer: 'Google',
    provider: 'opencodezen',
    contextWindow: '1000000',
  },
  {
    id: 'deepseek-v4-flash',
    name: 'DeepSeek V4 Flash',
    developer: 'DeepSeek',
    provider: 'opencodezen',
    contextWindow: '128000',
  },
  {
    id: 'kimi-k3',
    name: 'Kimi K3',
    developer: 'Moonshot AI',
    provider: 'opencodezen',
    contextWindow: '128000',
  },
  {
    id: 'glm-5.3',
    name: 'GLM-5.3',
    developer: 'Zhipu AI',
    provider: 'opencodezen',
    contextWindow: '128000',
  },
]

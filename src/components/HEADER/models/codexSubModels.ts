// Catálogo estático semilla de Codex (suscripción de ChatGPT, ver
// odd/tasks/openai-subscription-bridge.md). Solo lista los modelos vistos en
// vivo el 2026-09-28 (GET /models del bridge, respaldado por `model/list` de
// `codex app-server`) como ancla conocida: el catálogo real (y sus
// capacidades — esfuerzo, visión) se refresca en tiempo real vía el bridge
// (ver src/services/modelCatalog/fetchers/codexSubFetcher.ts). Un modelo
// nuevo que `model/list` empiece a listar aparece igual, con nombre
// derivado del ID (ver naming.ts) hasta que se agregue acá.

export interface CodexSubModel {
  id: string
  name: string
  developer: string
  provider: 'codexsub'
  contextWindow?: string
}

export const codexSubModels: CodexSubModel[] = [
  {
    id: 'gpt-5.6-sol',
    name: 'GPT-5.6 Sol',
    developer: 'OpenAI',
    provider: 'codexsub',
    contextWindow: '258400',
  },
  {
    id: 'gpt-5.6-terra',
    name: 'GPT-5.6 Terra',
    developer: 'OpenAI',
    provider: 'codexsub',
    contextWindow: '258400',
  },
  {
    id: 'gpt-5.6-luna',
    name: 'GPT-5.6 Luna',
    developer: 'OpenAI',
    provider: 'codexsub',
    contextWindow: '258400',
  },
]

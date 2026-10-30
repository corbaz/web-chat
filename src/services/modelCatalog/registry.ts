// Registro central de fetchers dinámicos por proveedor.
// Agregar soporte a un proveedor nuevo es agregar una entrada acá; los
// proveedores sin entrada siguen devolviendo su catálogo estático sin
// cambios (ver store.ts: refreshProvider no hace nada si no hay fetcher).

import { anthropicModels } from '../../components/HEADER/models/anthropicModels'
import { claudeCodeModels } from '../../components/HEADER/models/claudeCodeModels'
import { codexSubModels } from '../../components/HEADER/models/codexSubModels'
import { geminiModels } from '../../components/HEADER/models/geminiModels'
import { geminiSubModels } from '../../components/HEADER/models/geminiSubModels'
import { groqModels } from '../../components/HEADER/models/groqModels'
import { ollamaCloudModels } from '../../components/HEADER/models/ollamaCloudModels'
import { openaiModels } from '../../components/HEADER/models/openaiModels'
import { opencodeFreeModels } from '../../components/HEADER/models/opencodeFreeModels'
import { opencodeZenModels } from '../../components/HEADER/models/opencodeZenModels'
import { opengoModels } from '../../components/HEADER/models/opengoModels'
import { fetchAnthropicModelIds } from './fetchers/anthropicFetcher'
import { fetchClaudeCodeModelIds } from './fetchers/claudeCodeFetcher'
import { fetchCodexSubModelIds } from './fetchers/codexSubFetcher'
import { fetchGeminiModelIds } from './fetchers/geminiFetcher'
import { fetchGeminiSubModelIds } from './fetchers/geminiSubFetcher'
import { fetchGroqModelIds } from './fetchers/groqFetcher'
import { fetchOllamaCloudModelIds } from './fetchers/ollamaCloudFetcher'
import { fetchOpenAIModelIds } from './fetchers/openaiFetcher'
import { fetchOpenCodeGoModelIds } from './fetchers/openCodeGoFetcher'
import { fetchOpenCodeFreeModelIds } from './fetchers/opencodeFreeFetcher'
import { fetchOpenCodeZenModelIds } from './fetchers/zenFetcher'
import type { CatalogModel, FetchedModel, ProviderId } from './types'

export interface ProviderFetcher {
  // Recibe la API key guardada del proveedor ('' si no requiere key).
  fetchIds: (apiKey: string) => Promise<FetchedModel[]>
  staticModels: readonly CatalogModel[]
  // Si es true, solo se refresca cuando hay una key en localStorage.
  requiresKey: boolean
}

export const FETCHER_REGISTRY: Partial<Record<ProviderId, ProviderFetcher>> = {
  anthropic: {
    fetchIds: fetchAnthropicModelIds,
    staticModels: anthropicModels,
    requiresKey: true,
  },
  gemini: {
    fetchIds: fetchGeminiModelIds,
    staticModels: geminiModels,
    requiresKey: true,
  },
  groq: {
    fetchIds: fetchGroqModelIds,
    staticModels: groqModels,
    requiresKey: true,
  },
  openai: {
    fetchIds: fetchOpenAIModelIds,
    staticModels: openaiModels,
    requiresKey: true,
  },
  opengo: {
    fetchIds: fetchOpenCodeGoModelIds,
    staticModels: opengoModels,
    requiresKey: true,
  },
  opencodezen: {
    fetchIds: fetchOpenCodeZenModelIds,
    staticModels: opencodeZenModels,
    requiresKey: true,
  },
  opencodefree: {
    fetchIds: fetchOpenCodeFreeModelIds,
    staticModels: opencodeFreeModels,
    requiresKey: true,
  },
  claudecode: {
    fetchIds: fetchClaudeCodeModelIds,
    staticModels: claudeCodeModels,
    requiresKey: true,
  },
  codexsub: {
    fetchIds: fetchCodexSubModelIds,
    staticModels: codexSubModels,
    requiresKey: true,
  },
  ollamacloud: {
    fetchIds: fetchOllamaCloudModelIds,
    staticModels: ollamaCloudModels,
    requiresKey: true,
  },
  geminisub: {
    fetchIds: fetchGeminiSubModelIds,
    staticModels: geminiSubModels,
    requiresKey: true,
  },
}

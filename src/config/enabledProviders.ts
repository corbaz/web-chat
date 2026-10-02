// Proveedores de la app con su nombre visible, y cuáles están habilitados
// (tienen API key o contraseña guardada). Lo usan el selector de proveedor y
// el cartel que pregunta con qué proveedor arranca una sala vacía.

import { isOpenCodeAvailable } from './providers'

export interface ProviderOption {
  value: string
  label: string
}

export const PROVIDER_OPTIONS: ProviderOption[] = [
  { value: 'groq', label: 'Groq' },
  { value: 'routellm', label: 'RouteLLM' },
  { value: 'openai', label: 'OpenAI' },
  { value: 'anthropic', label: 'Anthropic' },
  { value: 'claudecode', label: 'Claude (suscripción)' },
  { value: 'codexsub', label: 'OpenAI (suscripción)' },
  { value: 'geminisub', label: 'Gemini (suscripción)' },
  { value: 'opengo', label: 'OpenCode Go' },
  { value: 'opencodezen', label: 'OpenCode Zen' },
  { value: 'opencodefree', label: 'OpenCode Free' },
  { value: 'gemini', label: 'Gemini' },
]

export function getEnabledProviders(): ProviderOption[] {
  return PROVIDER_OPTIONS.filter((provider) => {
    if (
      (provider.value === 'opengo' || provider.value === 'opencodezen') &&
      !isOpenCodeAvailable()
    ) {
      return false
    }
    try {
      const apiKey = localStorage.getItem(`${provider.value}ApiKey`)
      return Boolean(apiKey && apiKey.trim() !== '')
    } catch {
      return false
    }
  })
}

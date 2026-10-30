// Catálogo estático de Claude (suscripción) — bridge local a `claude -p` (ver
// odd/tasks/claude-subscription-bridge.md, T4). Es solo el respaldo: al
// arrancar, la app pide `GET /models` al bridge (fetchers/claudeCodeFetcher.ts),
// que arma la lista en vivo desde models.dev. Este archivo se regenera con
// `bun run update:models` (src/config/claudeModels.generated.ts) y aporta los
// nombres de los modelos conocidos.

import { CLAUDE_MODELS } from '../../../config/claudeModels.generated'

export interface ClaudeCodeModel {
  id: string
  name: string
  developer: string
  provider: 'claudecode'
}

export const claudeCodeModels: ClaudeCodeModel[] = CLAUDE_MODELS.map(
  (model) => ({
    id: model.id,
    name: model.name,
    developer: 'Anthropic',
    provider: 'claudecode',
  }),
)

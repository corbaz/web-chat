// Catálogo estático de Claude (suscripción) — bridge local a `claude -p` (ver
// odd/tasks/claude-subscription-bridge.md, T4). Se arma a partir de
// CLAUDE_MODELS (generado por scripts/update-vision-models.ts desde
// models.dev: ids completos de Anthropic, sin fecha, ordenados por familia,
// Sonnet primero). No hay fetcher dinámico: el bridge acepta cualquier id que
// matchee `claude-*` (ver scripts/claude-bridge/args.ts), así que alcanza con
// regenerar este archivo cuando Anthropic suma modelos.

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

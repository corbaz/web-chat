// Capacidades por modelo de `codexsub`, obtenidas en vivo de GET /models del
// bridge (ver client.ts): niveles de esfuerzo y visión. A diferencia de los
// demás proveedores (tablas estáticas generadas de models.dev, ver
// src/config/{effort,vision}.ts), acá no hay generador: `codex app-server`
// expone `supportedReasoningEfforts`/`inputModalities` directamente en
// `model/list` (ver Verified facts en odd/tasks/openai-subscription-bridge.md).
// Módulo en memoria (sin localStorage): se repuebla en cada refresh del
// catálogo (ver fetchers/codexSubFetcher.ts) y por defecto asume esfuerzo
// medio/visión habilitada para un modelo todavía no visto (mejor que
// esconder el slider/el botón de adjuntar antes del primer refresh).

export interface CodexModelCapability {
  effortLevels: string[]
  vision: boolean
}

const capabilities = new Map<string, CodexModelCapability>()

export function setCodexModelCapabilities(
  modelId: string,
  capability: CodexModelCapability,
): void {
  capabilities.set(modelId, capability)
}

export function getCodexEffortLevels(modelId: string): string[] {
  return capabilities.get(modelId)?.effortLevels ?? []
}

export function codexSupportsVision(modelId: string): boolean {
  return capabilities.get(modelId)?.vision ?? true
}

// Modelo y esfuerzo por defecto por proveedor cuando no hay nada guardado
// (T17, user request 2026-09-28). Se usan cuando el proveedor no tiene
// modelo guardado (App.tsx: getInitialModel/getDefaultModelForProvider) y
// cuando el modelo resuelto no tiene esfuerzo guardado (effortSettings.ts:
// resolveEffort). Solo los proveedores listados tienen default explícito; el
// resto sigue usando el primer modelo del catálogo y el nivel más bajo de
// esfuerzo. Si el modelo por defecto no está en el catálogo (aún no llegó el
// refresh, o el proveedor lo retiró), se cae al primer modelo disponible; si
// el esfuerzo por defecto no es válido para el modelo resuelto, se cae al
// nivel más bajo.
export const DEFAULT_MODEL_BY_PROVIDER: Readonly<Record<string, string>> = {
  claudecode: 'claude-opus-5-5',
  groq: 'qwen/qwen3.8-27b',
  opengo: 'glm-5.3-flash',
  opencodezen: 'glm-5.3',
  gemini: 'gemini-3.6-flash',
  // Codex (suscripción de ChatGPT): el más nuevo `gpt-*` de chat general
  // devuelto por el bridge trae `isDefault: true` (verificado en vivo
  // 2026-09-28, ver Verified facts en odd/tasks/openai-subscription-bridge.md),
  // así que no hace falta fijar un id acá — DEFAULT_MODEL_BY_PROVIDER solo
  // sirve de ancla estática mientras no llegó el refresh del catálogo.
  codexsub: 'gpt-5.6-sol',
}

// GLM (opengo/opencodezen) solo tiene low/high/max, sin "medium": se eligió
// el nivel del medio (high) y se avisó al usuario (2026-09-28).
export const DEFAULT_EFFORT_BY_PROVIDER: Readonly<Record<string, string>> = {
  claudecode: 'medium',
  groq: 'medium',
  opengo: 'high',
  opencodezen: 'high',
  gemini: 'medium',
  codexsub: 'medium',
}

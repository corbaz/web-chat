// Ids de los modelos cloud de Ollama tal como los acepta el servidor local
// (`ollama serve` con la sesión de `ollama signin`). El catálogo público
// (https://ollama.com/api/tags) los lista sin sufijo: con tag se agrega
// "-cloud" al tag (gpt-oss:120b -> gpt-oss:120b-cloud) y sin tag ":cloud"
// (kimi-k2.6 -> kimi-k2.6:cloud). Verificado en vivo 2026-10-29.

const CLOUD_SUFFIX = /(:|-)cloud$/

export function isCloudModelId(id: string): boolean {
  return CLOUD_SUFFIX.test(id)
}

export function toCloudModelId(name: string): string {
  if (isCloudModelId(name)) return name
  return name.includes(':') ? `${name}-cloud` : `${name}:cloud`
}

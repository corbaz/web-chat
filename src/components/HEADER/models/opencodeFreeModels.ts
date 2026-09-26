// Catálogo estático semilla de OpenCode Free (servidor local, ver
// odd/tasks/opencode-free-local.md). Solo lista `big-pickle` como ancla
// conocida: el resto de los modelos gratis (`*-free`) se descubren en
// tiempo real vía GET /config/providers (ver
// src/services/modelCatalog/fetchers/opencodeFreeFetcher.ts) y reciben
// nombre/desarrollador derivados del ID (ver naming.ts) hasta que se
// agreguen acá con su metadata real.

export interface OpenCodeFreeModel {
  id: string
  name: string
  developer: string
  provider: 'opencodefree'
}

export const opencodeFreeModels: OpenCodeFreeModel[] = [
  {
    id: 'big-pickle',
    name: 'Big Pickle',
    developer: 'OpenCode',
    provider: 'opencodefree',
  },
]

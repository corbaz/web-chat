// Cuáles modelos cloud entran en el plan gratis de Ollama. Ninguna API lo
// dice: se prueba cada uno contra el servidor local con la sesión del
// usuario (200 = gratis, 402 = fuera del plan, 410 = retirado; verificado en
// vivo 2026-10-29). Clasifica igual que "Revisar modelos"
// (classifyProbeResponse). Lo usa scripts/update-vision-models.ts.

import {
  classifyProbeResponse,
  type ProbeOutcome,
} from '../modelCatalog/modelCheck'

export interface ProbeReply {
  status: number
  message: string
}

export async function selectFreeModels<T extends { id: string }>(
  models: readonly T[],
  probe: (id: string) => Promise<ProbeReply>,
): Promise<{
  free: T[]
  excluded: Array<{ id: string; result: ProbeOutcome }>
}> {
  const classify = async (id: string): Promise<ProbeOutcome> => {
    try {
      const reply = await probe(id)
      return classifyProbeResponse(reply.status, reply.message)
    } catch {
      return 'unknown'
    }
  }

  const free: T[] = []
  const excluded: Array<{ id: string; result: ProbeOutcome }> = []
  // De a uno: el plan gratis admite un solo pedido a la vez.
  for (const model of models) {
    let result = await classify(model.id)
    if (result === 'unknown') result = await classify(model.id)
    if (result === 'ok') free.push(model)
    else excluded.push({ id: model.id, result })
  }
  if (free.length === 0) {
    throw new Error(
      'ningún modelo respondió (¿corre `ollama serve` con `ollama signin`?)',
    )
  }
  return { free, excluded }
}

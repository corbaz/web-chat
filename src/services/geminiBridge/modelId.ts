// En `agy` el esfuerzo de razonamiento va en el id del modelo
// (gemini-3.6-flash-low / -medium / -high). Para buscar precios y límites de
// contexto (tablas de models.dev, que no tienen ese sufijo) se quita.

const EFFORT_SUFFIX = /-(high|medium|low)$/

export function stripGeminiSubEffortSuffix(modelId: string): string {
  return modelId.replace(EFFORT_SUFFIX, '')
}

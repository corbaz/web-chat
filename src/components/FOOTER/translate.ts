// Idiomas de los menús de banderas del footer y los textos que se le piden
// al modelo:
// - Traductor: envía al chat un pedido de traducción (la traducción llega
//   como respuesta).
// - Varita mágica: corrige, formatea en Markdown y redacta el texto en el
//   idioma elegido, y lo deja en el input (rewriteMessage en Footer.tsx).

export type TranslateLanguageId = 'es' | 'en-US' | 'en-GB' | 'pt-BR'

export interface TranslateLanguage {
  id: TranslateLanguageId
  label: string
  // Cómo se nombra el idioma en el pedido al modelo.
  promptName: string
}

export const TRANSLATE_LANGUAGES: readonly TranslateLanguage[] = [
  { id: 'es', label: 'Español', promptName: 'español' },
  {
    id: 'en-US',
    label: 'Inglés (EE. UU.)',
    promptName: 'inglés americano (ortografía y vocabulario de EE. UU.)',
  },
  {
    id: 'en-GB',
    label: 'Inglés (británico)',
    promptName: 'inglés británico (ortografía y vocabulario del Reino Unido)',
  },
  {
    id: 'pt-BR',
    label: 'Portugués (Brasil)',
    promptName: 'portugués de Brasil',
  },
]

function promptNameFor(languageId: TranslateLanguageId): string {
  return (
    TRANSLATE_LANGUAGES.find((l) => l.id === languageId) ??
    TRANSLATE_LANGUAGES[0]
  ).promptName
}

/** Mensaje que el traductor envía al chat. */
export function buildTranslateRequest(
  text: string,
  languageId: TranslateLanguageId,
): string {
  // Texto entre etiquetas y "no repitas el original": sin eso gpt-oss
  // intercalaba cada línea original con su traducción (verificado en vivo
  // 2026-10-30; con este pedido, 4 de 4 corridas salieron solo traducidas).
  const languageName = promptNameFor(languageId)
  return `Traducí al ${languageName} todo el texto que está entre <texto> y </texto>.
- Traducí todas las líneas, incluidos los títulos y las listas.
- No incluyas el texto original ni lo repitas: la respuesta tiene que estar entera en ${languageName}.
- Conservá el formato Markdown, el código y los enlaces.
- Respondé solo con la traducción, sin las etiquetas ni explicaciones.

<texto>
${text}
</texto>`
}

/** Prompt de la varita mágica: el resultado reemplaza el texto del input. */
export function buildImprovePrompt(
  text: string,
  languageId: TranslateLanguageId,
): string {
  return `Corrige y mejora la expresión del siguiente texto, asegurándote de que la gramática y la sintaxis sean impecables. El resultado tiene que quedar redactado en ${promptNameFor(languageId)}: si el texto está en otro idioma, tradúcelo. El texto debe ser formal, profesional, técnico, siempre amigable, sencillo y preciso. El prompt que se recupera debe ser redactado como si lo escribiera el usuario y no el asistente. Dame solo el texto corregido sin explicaciones. En formato markdown enriquecido.

Texto a mejorar:
${text}`
}

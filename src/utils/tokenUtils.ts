/**
 * Utilidades para manejar y calcular tokens en mensajes para APIs de IA
 */

/**
 * Estimación aproximada de tokens basada en palabras.
 * Las APIs de LLM como GPT y Llama suelen usar ~1.3 tokens por palabra en promedio.
 *
 * @param text Texto para estimar tokens
 * @returns Número estimado de tokens
 */
export const estimateTokens = (text: string): number => {
    if (!text) return 0;

    // Contar palabras (aproximadamente 4 caracteres por palabra)
    const wordCount = text.trim().split(/\s+/).length;

    // Aplicar factor de conversión palabra-token (aproximadamente 1.3 tokens por palabra)
    const estimatedTokens = Math.ceil(wordCount * 1.3);

    return estimatedTokens;
};

/**
 * Estima tokens para mensajes de chat completos
 *
 * @param messages Array de mensajes con role y content
 * @returns Número total estimado de tokens
 */
export const estimateMessagesTokens = (
    messages: Array<{ role: string; content: string }>
): number => {
    // Tokens base por cada mensaje (4 tokens por mensaje para metadata)
    const baseTokensPerMessage = 4;

    // Suma de tokens de todos los mensajes
    let totalTokens = 0;

    for (const message of messages) {
        // Tokens del contenido
        totalTokens += estimateTokens(message.content);

        // Tokens base por mensaje (metadata)
        totalTokens += baseTokensPerMessage;
    }

    return totalTokens;
};

/**
 * Obtiene el límite de tokens para un modelo específico
 *
 * @param modelId ID del modelo
 * @returns Límite de tokens para el modelo (por defecto 8192 si no se conoce)
 */
export const getModelTokenLimit = (modelId: string): number => {
    // Definir límites para modelos específicos
    const tokenLimits: Record<string, number> = {
        // Meta
        "llama-3.3-70b-versatile": 128000,
        "llama-3.1-8b-instant": 128000,
        "llama3-8b-8192": 8192,
        "llama3-70b-8192": 8192,
        "llama-guard-3-8b": 8192,
        "meta-llama/llama-4-maverick-17b-128e-instruct": 131072,
        "meta-llama/llama-4-scout-17b-16e-instruct": 131072,

        // Google
        "gemma2-9b-it": 8192,

        // Mistral
        "mistral-saba-24b": 32768,

        // Alibaba
        "qwen-qwq-32b": 128000,

        // DeepSeek
        "deepseek-r1-distill-llama-70b": 128000,

        // SDAIA
        "allam-2-7b": 4096,
    };

    // Devolver el límite para el modelo específico o un valor por defecto
    return tokenLimits[modelId] || 8192;
};

/**
 * Número máximo de tokens que reservaremos para la respuesta del modelo
 */
export const MAX_RESPONSE_TOKENS = 2048;

/**
 * Factor de seguridad para evitar llegar al límite exacto (0.9 = usar el 90% del límite)
 */
export const TOKEN_LIMIT_SAFETY_FACTOR = 0.9;

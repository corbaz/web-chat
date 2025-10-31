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
  messages: Array<{ role: string; content: string }>,
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

import { groqModels } from '../components/HEADER/models/groqModels';

/**
 * Obtiene el límite de tokens para un modelo específico
 *
 * @param modelId ID del modelo
 * @returns Límite de tokens para el modelo (por defecto 8192 si no se conoce)
 */
export const getModelTokenLimit = (modelId: string): number => {
  // Buscar el modelo por su ID
  const model = groqModels.find(m => m.id === modelId);
  
  if (!model || !model.contextWindow) return 8192; // Valor por defecto
  
  // Convertir el contextWindow a número, eliminando comas y K/M
  const contextWindow = model.contextWindow
    .replace(/,/g, '') // Eliminar comas de formato
    .toLowerCase();
  
  // Convertir a número, manejando sufijos como K o M
  let limit = 8192; // Valor por defecto
  
  if (contextWindow.includes('k')) {
    limit = parseFloat(contextWindow) * 1000;
  } else if (contextWindow.includes('m')) {
    limit = parseFloat(contextWindow) * 1000000;
  } else {
    limit = parseFloat(contextWindow) || 8192;
  }
  
  return Math.round(limit);
};

/**
 * Número máximo de tokens que reservaremos para la respuesta del modelo
 */
export const MAX_RESPONSE_TOKENS = 2048;

/**
 * Obtiene el porcentaje de uso de tokens formateado
 * 
 * @param usedTokens Número de tokens utilizados
 * @param totalTokens Número total de tokens disponibles
 * @returns Cadena con el formato "XXXX / YYYYY - Usado: ZZ%"
 */
export const getTokenUsageString = (usedTokens: number, totalTokens: number): string => {
  const percentage = Math.round((usedTokens / totalTokens) * 100);
  return `${usedTokens} / ${totalTokens} - Contexto Usado: ${percentage}%`;
};

/**
 * Factor de seguridad para evitar llegar al límite exacto (0.9 = usar el 90% del límite)
 */
export const TOKEN_LIMIT_SAFETY_FACTOR = 0.9;

export interface ChatMessageType {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    responseTime?: string; // Tiempo que tardó en generarse la respuesta (solo para mensajes del asistente)
    tokensUsed?: number; // Número de tokens utilizados en la petición
    tokenLimit?: number; // Límite de tokens del modelo seleccionado
    modelName?: string; // Nombre del modelo usado para la respuesta
}

export interface GroqMessageType {
    role: "user" | "assistant" | "system";
    content: string;
}

// Clave para almacenar mensajes en localStorage
export const STORAGE_KEY = "prompting_chat_messages";

// Clave para almacenar historial de chats en localStorage
export const CHAT_HISTORY_KEY = "prompting_chat_history";

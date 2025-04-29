import React, { useState, useRef, useEffect } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import ChatMessage from "./ChatMessage.tsx";
import MessageInput, { MessageInputRef } from "./MessageInput.tsx";
import { formatResponseTime } from "../../utils/timeUtils.ts";
import {
    estimateMessagesTokens,
    getModelTokenLimit,
    MAX_RESPONSE_TOKENS,
    TOKEN_LIMIT_SAFETY_FACTOR,
} from "../../utils/tokenUtils.ts";
import axios from "axios";

// Interfaz para los mensajes del chat
export interface ChatMessageType {
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: number;
    responseTime?: string; // Tiempo que tardó en generarse la respuesta (solo para mensajes del asistente)
    tokensUsed?: number; // Número de tokens utilizados en la petición
    tokenLimit?: number; // Límite de tokens del modelo seleccionado
}

// Interfaz para el mensaje que se envía a la API de Groq
interface GroqMessageType {
    role: "user" | "assistant" | "system";
    content: string;
}

// Clave para almacenar mensajes en localStorage
const STORAGE_KEY = "prompting_chat_messages";

interface ChatInterfaceProps {
    theme: ColorPalette;
    isDarkTheme: boolean;
    selectedModel: string;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
    theme,
    isDarkTheme,
    selectedModel,
}) => {
    // Estado para almacenar los mensajes del chat
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<MessageInputRef>(null);
    const requestStartTimeRef = useRef<Record<string, number>>({});

    // Cargar mensajes desde localStorage al iniciar
    useEffect(() => {
        try {
            const storedMessages = localStorage.getItem(STORAGE_KEY);
            if (storedMessages) {
                setMessages(JSON.parse(storedMessages));
            } else {
                // Si no hay mensajes almacenados, establecer mensaje de bienvenida
                setMessages([
                    {
                        id: "intro-message",
                        role: "assistant",
                        content:
                            "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                        timestamp: Date.now(),
                    },
                ]);
            }
        } catch (error) {
            console.error("Error al cargar mensajes:", error);
            // Establecer mensaje de bienvenida en caso de error
            setMessages([
                {
                    id: "intro-message",
                    role: "assistant",
                    content:
                        "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                    timestamp: Date.now(),
                },
            ]);
        }
    }, []);

    // Guardar mensajes en localStorage cada vez que cambien
    useEffect(() => {
        if (messages.length > 0) {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
            } catch (error) {
                console.error("Error al guardar mensajes:", error);
            }
        }
    }, [messages]);

    // Hacer scroll al último mensaje cuando se añade uno nuevo
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // Preparar mensajes para la API de Groq (adaptado para gestionar tokens)
    const prepareMessagesForApi = (
        messagesHistory: ChatMessageType[],
        modelId: string
    ): GroqMessageType[] => {
        // Obtener el límite de tokens para el modelo seleccionado
        const modelTokenLimit = getModelTokenLimit(modelId);

        // Calcular el límite de tokens para el contexto (input)
        // Aplicamos factor de seguridad y reservamos tokens para la respuesta
        const maxContextTokens = Math.floor(
            modelTokenLimit * TOKEN_LIMIT_SAFETY_FACTOR - MAX_RESPONSE_TOKENS
        );

        // Convertir mensajes a formato para API (sin metadatos)
        const apiMessages: GroqMessageType[] = messagesHistory.map((msg) => ({
            role: msg.role,
            content: msg.content,
        }));

        // Añadir sistema de mensajes para asegurar que responda en español
        const systemMessage: GroqMessageType = {
            role: "system",
            content:
                "Eres un asistente virtual útil y conciso. Responde siempre en español.",
        };

        // Calcular tokens del mensaje de sistema
        const systemTokens = estimateMessagesTokens([systemMessage]);
        const availableTokens = maxContextTokens - systemTokens;

        // Si todos los mensajes caben dentro del límite, los enviamos todos
        let totalTokens = estimateMessagesTokens(apiMessages);
        let trimmedMessages = [...apiMessages];

        // Si excedemos el límite, recortamos mensajes más antiguos
        if (totalTokens > availableTokens) {
            console.log(
                `Advertencia: El historial de chat (${totalTokens} tokens estimados) excede el límite disponible (${availableTokens} tokens).`
            );

            // Siempre mantener el último mensaje (la consulta actual)
            const currentMessage = apiMessages[apiMessages.length - 1];
            const currentMessageTokens = estimateMessagesTokens([
                currentMessage,
            ]);

            // Recortar mensajes hasta que quepan en el límite
            trimmedMessages = [currentMessage];
            totalTokens = currentMessageTokens;

            // Añadir mensajes desde el más reciente hacia atrás, hasta llegar al límite
            for (let i = apiMessages.length - 2; i >= 0; i--) {
                const msg = apiMessages[i];
                const msgTokens = estimateMessagesTokens([msg]);

                if (totalTokens + msgTokens <= availableTokens) {
                    trimmedMessages.unshift(msg); // Añadir al principio
                    totalTokens += msgTokens;
                } else {
                    // No podemos añadir más mensajes sin exceder el límite
                    break;
                }
            }

            console.log(
                `Historial recortado a ${trimmedMessages.length} mensajes con aproximadamente ${totalTokens} tokens.`
            );
        }

        // Añadir mensaje de sistema al principio
        return [systemMessage, ...trimmedMessages];
    };

    // Función para enviar un mensaje al API de Groq
    const sendMessage = async (content: string) => {
        if (!content.trim()) return;

        // Generar ID único para el mensaje
        const userMessageId = `user_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;

        // Añadir mensaje del usuario
        const userMessage: ChatMessageType = {
            id: userMessageId,
            role: "user",
            content: content.trim(),
            timestamp: Date.now(),
        };

        // Actualizar mensajes con el nuevo mensaje del usuario
        const updatedMessages = [...messages, userMessage];
        setMessages(updatedMessages);
        setIsLoading(true);

        // Generar un ID único para esta solicitud
        const requestId = `req_${Date.now()}_${Math.random()
            .toString(36)
            .substring(2, 9)}`;
        requestStartTimeRef.current[requestId] = Date.now();

        try {
            // Preparar todos los mensajes para enviar como contexto, gestionando los tokens
            const apiMessages = prepareMessagesForApi(
                updatedMessages,
                selectedModel
            );

            // Obtener información de tokens para mostrarlos en la interfaz
            const totalTokensUsed = estimateMessagesTokens(apiMessages);
            const modelTokenLimit = getModelTokenLimit(selectedModel);

            console.log("Enviando mensajes a Groq API:", apiMessages);
            console.log(
                `Tokens estimados: ${totalTokensUsed} / ${modelTokenLimit}`
            );

            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: selectedModel,
                    messages: apiMessages,
                    temperature: 0.7,
                    max_tokens: MAX_RESPONSE_TOKENS,
                    presence_penalty: 0.1,
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization:
                            "Bearer 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",
                    },
                }
            );

            // Calcular el tiempo de respuesta
            const endTime = Date.now();
            const responseTime =
                endTime - (requestStartTimeRef.current[requestId] || endTime);
            const formattedTime = formatResponseTime(responseTime);

            // Añadir respuesta del asistente con información de tokens
            const assistantMessage: ChatMessageType = {
                id: `assistant_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 9)}`,
                role: "assistant",
                content: response.data.choices[0].message.content,
                timestamp: Date.now(),
                responseTime: formattedTime,
                tokensUsed: totalTokensUsed,
                tokenLimit: modelTokenLimit,
            };

            setMessages((prev) => [...prev, assistantMessage]);

            // Enfocar el input después de un pequeño retraso para asegurar que la UI se ha actualizado
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } catch (error) {
            console.error("Error al obtener respuesta:", error);

            let errorMessage =
                "Error al obtener respuesta. Por favor, intenta de nuevo.";

            if (axios.isAxiosError(error) && error.response) {
                errorMessage = `Error del servidor (${
                    error.response.status
                }): ${
                    error.response.data.error?.message || "Error desconocido"
                }`;
            }

            // Añadir mensaje de error
            const errorResponseMessage: ChatMessageType = {
                id: `error_${Date.now()}_${Math.random()
                    .toString(36)
                    .substring(2, 9)}`,
                role: "assistant",
                content: errorMessage,
                timestamp: Date.now(),
            };

            setMessages((prev) => [...prev, errorResponseMessage]);

            // Enfocar el input también después de un error
            setTimeout(() => {
                inputRef.current?.focus();
            }, 100);
        } finally {
            setIsLoading(false);
            delete requestStartTimeRef.current[requestId];
        }
    };

    return (
        <div
            className="flex flex-col w-full max-w-4xl h-[calc(100vh-180px)] bg-opacity-70 rounded-lg overflow-hidden"
            style={{
                backgroundColor: isDarkTheme
                    ? theme.input.background
                    : theme.input.text,
                border: `1px solid ${theme.accent}`,
                boxShadow: `0px 0px 10px ${theme.accent}`,
            }}
        >
            {/* Área de mensajes */}
            <div
                className="flex-grow overflow-y-auto p-4 space-y-4"
                style={{
                    backgroundColor: isDarkTheme
                        ? theme.background
                        : theme.secondary,
                }}
            >
                {messages.map((message) => (
                    <ChatMessage
                        key={message.id}
                        message={message}
                        theme={theme}
                        isDarkTheme={isDarkTheme}
                    />
                ))}
                {isLoading && (
                    <div
                        className="flex justify-center items-center p-3 rounded-lg"
                        style={{
                            backgroundColor: isDarkTheme
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.05)",
                        }}
                    >
                        <div className="typing-indicator">
                            <span></span>
                            <span></span>
                            <span></span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Área de input */}
            <MessageInput
                ref={inputRef}
                onSendMessage={sendMessage}
                theme={theme}
                isDarkTheme={isDarkTheme}
                isLoading={isLoading}
            />
        </div>
    );
};

export default ChatInterface;

import { useRef, useEffect, useCallback } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import ChatArea from "./ChatArea";
import LeftMenu from "../HEADER/menu/LeftMenu";
import RightMenu from "../HEADER/menu/RightMenu";
import {
    HEADER_HEIGHT_MOBILE,
    FOOTER_HEIGHT_MOBILE,
} from "../../utils/layoutConstants";
import {
    ChatMessageType,
    GroqMessageType,
    STORAGE_KEY,
    CHAT_HISTORY_KEY,
} from "../../interfaces/chat/chatTypes";
import {
    estimateMessagesTokens,
    getModelTokenLimit,
    MAX_RESPONSE_TOKENS,
    TOKEN_LIMIT_SAFETY_FACTOR,
} from "../../utils/tokenUtils";
import { formatResponseTime } from "../../utils/timeUtils";
import axios from "axios";

interface ChatContainerProps {
    messages: ChatMessageType[];
    setMessages: React.Dispatch<React.SetStateAction<ChatMessageType[]>>;
    isLoading: boolean;
    setIsLoading: (isLoading: boolean) => void;
    theme: ColorPalette;
    isDarkTheme: boolean;
    selectedModel: string;
    currentChatId: string | undefined;
    setCurrentChatId: (chatId: string | undefined) => void;
    chatHistory: { id: string; title: string; date: Date }[];
    setChatHistory: React.Dispatch<
        React.SetStateAction<{ id: string; title: string; date: Date }[]>
    >;
    leftMenuOpen: boolean;
    rightMenuOpen: boolean;
    onCloseLeftMenu: () => void;
    onCloseRightMenu: () => void;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onModelChange: (modelId: string) => void;
}

const ChatContainer = ({
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    theme,
    isDarkTheme,
    selectedModel,
    currentChatId,
    setCurrentChatId,
    chatHistory,
    setChatHistory,
    leftMenuOpen,
    rightMenuOpen,
    onCloseLeftMenu,
    onCloseRightMenu,
    onSelectChat,
    onNewChat,
    onModelChange,
}: ChatContainerProps) => {
    // Ref para almacenar tiempos de inicio de solicitudes
    const requestStartTimeRef = useRef<Record<string, number>>({});

    // Efecto para inicializar el chat y cargar datos guardados
    useEffect(() => {
        // Función para generar un ID único para nuevos chats
        const generateId = () => {
            return `chat_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 7)}`;
        };

        // Función para cargar datos del localStorage
        const loadSavedData = () => {
            const storedData = localStorage.getItem(STORAGE_KEY);

            if (storedData) {
                try {
                    const parsedData = JSON.parse(storedData);
                    if (parsedData && typeof parsedData === "object") {
                        const chatIds = Object.keys(parsedData);
                        if (chatIds.length > 0) {
                            const newChatHistory = chatIds.map((id) => ({
                                id,
                                title: `Chat ${id.substring(0, 8)}`,
                                date: new Date(),
                            }));
                            setChatHistory(newChatHistory);
                            if (!currentChatId) {
                                const lastChatId = chatIds[chatIds.length - 1];
                                setCurrentChatId(lastChatId);
                            }
                            return true;
                        }
                    }
                } catch (error) {
                    console.error("Error al cargar datos guardados:", error);
                }
            }
            return false;
        };

        const dataLoaded = loadSavedData();
        if (!dataLoaded && !currentChatId) {
            const newChatId = generateId();
            const newHistory = [
                {
                    id: newChatId,
                    title: `Chat ${newChatId.substring(0, 8)}`,
                    date: new Date(),
                },
            ];
            setChatHistory(newHistory);
            setCurrentChatId(newChatId);
        }
    }, [setChatHistory, setCurrentChatId, currentChatId]);

    // Efecto para cargar mensajes cuando cambia el chat actual
    useEffect(() => {
        if (!currentChatId) return;
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                if (parsedData && parsedData[currentChatId]) {
                    const chatMessages = parsedData[currentChatId];
                    setMessages(() =>
                        Array.isArray(chatMessages) ? chatMessages : []
                    );
                } else {
                    setMessages(() => []);
                }
            } catch (error) {
                console.error("Error al cargar mensajes del chat:", error);
                setMessages(() => []);
            }
        } else {
            setMessages(() => []);
        }
    }, [currentChatId, setMessages]);

    // Efecto para guardar mensajes en localStorage
    useEffect(() => {
        if (currentChatId && messages.length > 0 && !isLoading) {
            const storedData = localStorage.getItem(STORAGE_KEY);
            let dataToStore = {};

            try {
                if (storedData) {
                    dataToStore = JSON.parse(storedData);
                }

                // Creamos un nuevo objeto para evitar modificar directamente la referencia
                const updatedData = {
                    ...dataToStore,
                    [currentChatId]: messages,
                };

                // Solo guardamos si hay cambios
                if (JSON.stringify(updatedData) !== storedData) {
                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(updatedData)
                    );
                }
            } catch (error) {
                console.error("Error al guardar mensajes:", error);
            }
        }
    }, [messages, currentChatId, isLoading]); // Dependemos de messages, currentChatId e isLoading

    // Guardar historial de chats en localStorage cada vez que cambie
    useEffect(() => {
        if (chatHistory.length > 0) {
            try {
                const jsonString = JSON.stringify(chatHistory);
                localStorage.setItem(CHAT_HISTORY_KEY, jsonString);
            } catch (error) {
                console.error("Error al guardar historial de chats:", error);
            }
        }
    }, [chatHistory]);

    // Preparar mensajes para la API de Groq (gestionar tokens)
    const prepareMessagesForApi = (
        messagesHistory: ChatMessageType[],
        modelId: string
    ): GroqMessageType[] => {
        // Obtener el límite de tokens para el modelo seleccionado
        const modelTokenLimit = getModelTokenLimit(modelId);
        const maxContextTokens = Math.floor(
            modelTokenLimit * TOKEN_LIMIT_SAFETY_FACTOR - MAX_RESPONSE_TOKENS
        );

        // Convertir mensajes al formato para API
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

        // Verificar si todos los mensajes caben dentro del límite
        let totalTokens = estimateMessagesTokens(apiMessages);
        let trimmedMessages = [...apiMessages];

        // Si excedemos el límite, recortar mensajes más antiguos
        if (totalTokens > availableTokens) {
            console.log(
                `Advertencia: El historial de chat (${totalTokens} tokens estimados) excede el límite disponible (${availableTokens} tokens).`
            );

            // Mantener el último mensaje (la consulta actual)
            const currentMessage = apiMessages[apiMessages.length - 1];
            const currentMessageTokens = estimateMessagesTokens([
                currentMessage,
            ]);

            // Recortar mensajes hasta que quepan en el límite
            trimmedMessages = [currentMessage];
            totalTokens = currentMessageTokens;

            // Añadir mensajes desde el más reciente hacia atrás
            for (let i = apiMessages.length - 2; i >= 0; i--) {
                const msg = apiMessages[i];
                const msgTokens = estimateMessagesTokens([msg]);

                if (totalTokens + msgTokens <= availableTokens) {
                    trimmedMessages.unshift(msg);
                    totalTokens += msgTokens;
                } else {
                    break;
                }
            }
        }

        // Añadir mensaje de sistema al principio
        return [systemMessage, ...trimmedMessages];
    };

    // Función para enviar un mensaje al API de Groq
    const sendMessage = useCallback(
        async (content: string) => {
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

            // Si el mensaje actual solo contiene el mensaje de bienvenida, actualizar el título del chat
            if (messages.length === 1 && messages[0].id === "intro-message") {
                const newChatId = currentChatId || `chat_${Date.now()}`;
                const title =
                    content.trim().substring(0, 30) +
                    (content.length > 30 ? "..." : "");

                // Actualizar historial de chat
                setChatHistory(
                    (
                        prevHistory: { id: string; title: string; date: Date }[]
                    ) => [
                        ...prevHistory.filter(
                            (chat: { id: string }) => chat.id !== currentChatId
                        ), // Filtrar el actual si existe
                        {
                            id: newChatId,
                            title: title,
                            date: new Date(),
                        },
                    ]
                );

                // Actualizar el ID de chat actual
                setCurrentChatId(newChatId);
            }

            // Generar un ID único para esta solicitud
            const requestId = `req_${Date.now()}_${Math.random()
                .toString(36)
                .substring(2, 9)}`;
            requestStartTimeRef.current[requestId] = Date.now();

            try {
                // Preparar mensajes para enviar como contexto
                const apiMessages = prepareMessagesForApi(
                    updatedMessages,
                    selectedModel
                );
                const totalTokensUsed = estimateMessagesTokens(apiMessages);
                const modelTokenLimit = getModelTokenLimit(selectedModel);

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
                    endTime -
                    (requestStartTimeRef.current[requestId] || endTime);
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

                setMessages((prevMessages: ChatMessageType[]) => [
                    ...prevMessages,
                    assistantMessage,
                ]);
            } catch (error) {
                console.error("Error al obtener respuesta:", error);

                let errorMessage =
                    "Error al obtener respuesta. Por favor, intenta de nuevo.";
                if (axios.isAxiosError(error) && error.response) {
                    errorMessage = `Error del servidor (${
                        error.response.status
                    }): ${
                        error.response.data.error?.message ||
                        "Error desconocido"
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

                setMessages((prevMessages: ChatMessageType[]) => [
                    ...prevMessages,
                    errorResponseMessage,
                ]);
            } finally {
                setIsLoading(false);
                delete requestStartTimeRef.current[requestId];
            }
        },
        [
            messages,
            selectedModel,
            currentChatId,
            setCurrentChatId,
            setChatHistory,
            setIsLoading,
            setMessages,
        ]
    );

    // Escuchar el evento personalizado para enviar mensajes
    useEffect(() => {
        const handleSendMessage = (event: Event) => {
            const customEvent = event as CustomEvent<{ message: string }>;
            sendMessage(customEvent.detail.message);
        };

        document.addEventListener(
            "send-message",
            handleSendMessage as EventListener
        );

        return () => {
            document.removeEventListener(
                "send-message",
                handleSendMessage as EventListener
            );
        };
    }, [sendMessage]);

    return (
        <>
            {/* Contenido principal (chat) */}
            <div
                className="fixed inset-x-0 overflow-hidden"
                style={{
                    top: `var(--header-height, ${HEADER_HEIGHT_MOBILE})`,
                    bottom: `var(--footer-height, ${FOOTER_HEIGHT_MOBILE})`,
                    backgroundColor: isDarkTheme ? "#1a1a2e" : "#f8f8fc",
                }}
            >
                <ChatArea
                    messages={messages}
                    isLoading={isLoading}
                    theme={theme}
                    isDarkTheme={isDarkTheme}
                />
            </div>

            {/* Menús laterales */}
            <LeftMenu
                isOpen={leftMenuOpen}
                onClose={onCloseLeftMenu}
                theme={theme}
                isDarkTheme={isDarkTheme}
                chatHistory={chatHistory}
                onSelectChat={onSelectChat}
                onNewChat={onNewChat}
                currentChatId={currentChatId}
            />

            <RightMenu
                isOpen={rightMenuOpen}
                onClose={onCloseRightMenu}
                theme={theme}
                isDarkTheme={isDarkTheme}
                toggleTheme={() => {}} // Pasamos una función vacía porque ya no manejamos el tema aquí
                selectedModel={selectedModel}
                onModelChange={onModelChange} // Ahora pasamos la función real para cambiar el modelo
            />
        </>
    );
};

export default ChatContainer;

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
    toggleTheme: () => void; // Añadimos la función para cambiar el tema
    selectedModel: string;
    currentChatId: string | undefined;
    setCurrentChatId: React.Dispatch<React.SetStateAction<string | undefined>>; // Añadimos esta propiedad
    chatHistory: { id: string; title: string; date: Date; model?: string }[];
    setChatHistory: React.Dispatch<
        React.SetStateAction<
            { id: string; title: string; date: Date; model?: string }[]
        >
    >;
    leftMenuOpen: boolean;
    rightMenuOpen: boolean;
    onCloseLeftMenu: () => void;
    onCloseRightMenu: () => void;
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    onModelChange: (modelId: string) => void;
    onFocusInput?: () => void;
    onUpdateChatTitle?: (chatId: string, newTitle: string) => void; // Para actualizar el título
    onDeleteChat?: (chatId: string) => void; // Para eliminar un chat
}

const ChatContainer = ({
    messages,
    setMessages,
    isLoading,
    setIsLoading,
    theme,
    isDarkTheme,
    toggleTheme, // Añadimos aquí la prop toggleTheme para utilizarla
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
    onFocusInput,
    onUpdateChatTitle,
    onDeleteChat,
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
            // Intentar cargar el historial existente primero
            const chatHistoryData = localStorage.getItem(CHAT_HISTORY_KEY);
            let existingHistory = [];

            if (chatHistoryData) {
                try {
                    existingHistory = JSON.parse(chatHistoryData);
                    // Si ya tenemos historial, simplemente usamos ese
                    if (existingHistory && existingHistory.length > 0) {
                        // Si el componente recibe un chatHistory vacío, actualizamos con el existente
                        if (chatHistory.length === 0) {
                            setChatHistory(existingHistory);
                        }

                        // Si no hay chat actual seleccionado, seleccionamos el último
                        if (!currentChatId && existingHistory.length > 0) {
                            const lastChat =
                                existingHistory[existingHistory.length - 1];
                            setCurrentChatId(lastChat.id);
                        }
                    }
                } catch (error) {
                    console.error("Error al cargar historial de chats:", error);
                }
            }

            // Después procesamos los mensajes
            if (storedData) {
                try {
                    const parsedData = JSON.parse(storedData);
                    if (parsedData && typeof parsedData === "object") {
                        const chatIds = Object.keys(parsedData);
                        if (chatIds.length > 0) {
                            // Si no hay historial en localStorage, pero sí hay mensajes,
                            // creamos el historial a partir de los mensajes
                            if (existingHistory.length === 0) {
                                const newChatHistory = chatIds.map((id) => ({
                                    id,
                                    title: `Chat ${id.substring(0, 8)}`,
                                    date: new Date(),
                                }));
                                setChatHistory(newChatHistory);
                            }

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
            // Mensaje de bienvenida automático
            const bienvenida = [
                {
                    id: "intro-message",
                    role: "assistant" as const,
                    content:
                        "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                    timestamp: Date.now(),
                },
            ];
            setMessages(bienvenida);
            // Guardar en localStorage para reflejarlo en la UI y persistencia
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ [newChatId]: bienvenida })
            );
            if (onFocusInput) onFocusInput();
        }
    }, [
        setChatHistory,
        setCurrentChatId,
        currentChatId,
        setMessages,
        onFocusInput,
        chatHistory.length, // Añadir la dependencia faltante
    ]);

    // Efecto para cargar mensajes cuando cambia el chat actual
    useEffect(() => {
        if (!currentChatId) return;
        console.log("Intentando cargar mensajes para el chat:", currentChatId);
        const storedData = localStorage.getItem(STORAGE_KEY);
        if (storedData) {
            try {
                const parsedData = JSON.parse(storedData);
                if (parsedData && parsedData[currentChatId]) {
                    const chatMessages = parsedData[currentChatId];
                    console.log("Mensajes encontrados:", chatMessages.length);
                    setMessages(() =>
                        Array.isArray(chatMessages) ? chatMessages : []
                    );
                } else {
                    // Si no hay mensajes para este chat, mostrar bienvenida y guardar
                    console.log(
                        "No hay mensajes para este chat, mostrando bienvenida"
                    );
                    const bienvenida = [
                        {
                            id: "intro-message",
                            role: "assistant" as const,
                            content:
                                "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                            timestamp: Date.now(),
                        },
                    ];
                    setMessages(bienvenida);

                    // Crear una estructura actualizada para guardar en localStorage
                    const existingData = parsedData || {};
                    const updatedData = {
                        ...existingData,
                        [currentChatId]: bienvenida,
                    };

                    localStorage.setItem(
                        STORAGE_KEY,
                        JSON.stringify(updatedData)
                    );
                }
            } catch (error) {
                console.error("Error al cargar mensajes del chat:", error);
                setMessages(() => []);
            }
        } else if (currentChatId) {
            // Si no hay nada en localStorage pero hay chatId, mostrar bienvenida y guardar
            const bienvenida = [
                {
                    id: "intro-message",
                    role: "assistant" as const,
                    content:
                        "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                    timestamp: Date.now(),
                },
            ];
            setMessages(bienvenida);
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify({ [currentChatId]: bienvenida })
            );
        }
        if (onFocusInput) onFocusInput();
    }, [currentChatId, setMessages, onFocusInput]);

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

                // Actualizar historial de chat incluyendo el modelo actual
                setChatHistory(
                    (
                        prevHistory: {
                            id: string;
                            title: string;
                            date: Date;
                            model?: string;
                        }[]
                    ) => [
                        ...prevHistory.filter(
                            (chat: { id: string }) => chat.id !== currentChatId
                        ), // Filtrar el actual si existe
                        {
                            id: newChatId,
                            title: title,
                            date: new Date(),
                            model: selectedModel, // Guardar el modelo seleccionado actualmente
                        },
                    ]
                );

                // Actualizar el ID de chat actual
                setCurrentChatId(newChatId);
            } else {
                // Si no es el primer mensaje, actualizar el modelo en el historial
                setChatHistory((prevHistory) =>
                    prevHistory.map((chat) =>
                        chat.id === currentChatId
                            ? { ...chat, model: selectedModel }
                            : chat
                    )
                );
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
                    modelName: selectedModel, // Guardar el modelo usado
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

    // Cuando la IA responde o se agrega un mensaje del asistente, enfocar input
    useEffect(() => {
        if (
            messages.length > 0 &&
            messages[messages.length - 1].role === "assistant"
        ) {
            if (onFocusInput) onFocusInput();
        }
    }, [messages, onFocusInput]);

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
                onUpdateChatTitle={onUpdateChatTitle}
                onDeleteChat={onDeleteChat} // Pasar la función para eliminar chats
            />

            <RightMenu
                isOpen={rightMenuOpen}
                onClose={onCloseRightMenu}
                theme={theme}
                isDarkTheme={isDarkTheme}
                toggleTheme={toggleTheme} // Ahora pasamos la función real para cambiar el tema
                selectedModel={selectedModel}
                onModelChange={onModelChange}
            />
        </>
    );
};

export default ChatContainer;

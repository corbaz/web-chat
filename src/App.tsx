import { useState, useRef, useEffect } from "react";
import { darkTheme, lightTheme } from "./interfaces/temas/temas.tsx";
import { groqModels } from "./components/HEADER/models/groqModels";
import { setupMobileKeyboardHandler } from "./utils/mobileUtils";
import { formatResponseTime } from "./utils/timeUtils";
import {
    estimateMessagesTokens,
    getModelTokenLimit,
    MAX_RESPONSE_TOKENS,
    TOKEN_LIMIT_SAFETY_FACTOR,
} from "./utils/tokenUtils";
import {
    HEADER_HEIGHT_MOBILE,
    FOOTER_HEIGHT_MOBILE,
    generateLayoutCSS,
} from "./utils/layoutConstants";
import axios from "axios";

// Componentes
import Header from "./components/HEADER/Header";
import Footer, { FooterRef } from "./components/FOOTER/Footer";
import ChatArea from "./components/CHAT/ChatArea";
import LeftMenu from "./components/HEADER/menu/LeftMenu";
import RightMenu from "./components/HEADER/menu/RightMenu";

// Interfaces
import {
    ChatMessageType,
    GroqMessageType,
    STORAGE_KEY,
} from "./interfaces/chat/chatTypes";

// Constante de versión
const APP_VERSION = "v.2.15";

export const App = () => {
    // Estados para la UI
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [theme, setTheme] = useState(darkTheme);
    const [selectedModel, setSelectedModel] = useState(groqModels[0].id);

    // Estados para los menús laterales
    const [leftMenuOpen, setLeftMenuOpen] = useState(false);
    const [rightMenuOpen, setRightMenuOpen] = useState(false);

    // Estados para el chat
    const [messages, setMessages] = useState<ChatMessageType[]>([]);
    const [isLoading, setIsLoading] = useState<boolean>(false);
    const [chatHistory, setChatHistory] = useState<
        { id: string; title: string; date: Date }[]
    >([]);
    const [currentChatId, setCurrentChatId] = useState<string | undefined>(
        undefined
    );

    // Ref para el textarea del footer
    const footerRef = useRef<FooterRef>(null);

    // Ref para almacenar tiempos de inicio de solicitudes
    const requestStartTimeRef = useRef<Record<string, number>>({});

    // Inyectar las variables CSS de layout
    useEffect(() => {
        // Crear un elemento style
        const styleElement = document.createElement("style");
        styleElement.setAttribute("id", "layout-constants-css");
        styleElement.textContent = generateLayoutCSS();

        // Añadir al head
        document.head.appendChild(styleElement);

        // Limpiar al desmontar
        return () => {
            const existingStyle = document.getElementById(
                "layout-constants-css"
            );
            if (existingStyle) {
                document.head.removeChild(existingStyle);
            }
        };
    }, []);

    // Función para cambiar el tema
    const toggleTheme = () => {
        setIsDarkTheme(!isDarkTheme);
        setTheme(isDarkTheme ? lightTheme : darkTheme);
        // Agregar un pequeño retraso antes de enfocar para asegurar que la UI se actualice
        setTimeout(() => {
            footerRef.current?.focusTextarea();
        }, 100);
    };

    // Función para cambiar el modelo
    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);
        // Agregamos un pequeño retraso antes de enfocar
        setTimeout(() => {
            footerRef.current?.focusTextarea();
        }, 100);
    };

    // Configurar el manejador del teclado para dispositivos móviles y aplicar el tema inicial
    useEffect(() => {
        setupMobileKeyboardHandler();
        setTheme(isDarkTheme ? darkTheme : lightTheme);

        // Configurar clases de HTML y body para que ocupen toda la pantalla sin scroll
        document.documentElement.classList.add(
            "m-0",
            "p-0",
            "w-full",
            "h-full",
            "overflow-hidden",
            "bg-black",
            "max-w-screen"
        );
        document.body.classList.add(
            "m-0",
            "p-0",
            "w-full",
            "h-full",
            "overflow-hidden",
            "bg-red-500",
            "max-w-screen"
        );
    }, [isDarkTheme]);

    // Cargar mensajes desde localStorage al iniciar
    useEffect(() => {
        try {
            const storedMessages = localStorage.getItem(STORAGE_KEY);
            if (storedMessages) {
                try {
                    const parsedMessages = JSON.parse(storedMessages);

                    if (
                        parsedMessages &&
                        Array.isArray(parsedMessages) &&
                        parsedMessages.length > 0
                    ) {
                        console.log(
                            `Cargados ${parsedMessages.length} mensajes desde localStorage`
                        );
                        setMessages(parsedMessages);

                        // Crear un ID de chat para esta conversación cargada
                        const chatId = `chat_${Date.now()}`;
                        setCurrentChatId(chatId);

                        // Extraer un título de la primera pregunta o usar uno por defecto
                        const firstUserMessage = parsedMessages.find(
                            (m) => m.role === "user"
                        );
                        const title = firstUserMessage
                            ? firstUserMessage.content.substring(0, 30) +
                              (firstUserMessage.content.length > 30
                                  ? "..."
                                  : "")
                            : "Conversación anterior";

                        // Añadir a la lista de chats
                        setChatHistory([
                            {
                                id: chatId,
                                title: title,
                                date: new Date(),
                            },
                        ]);

                        return; // Salir del efecto si hay mensajes guardados
                    }
                } catch (parseError) {
                    console.error("Error al parsear mensajes:", parseError);
                }
            }

            // Solo si no hay mensajes guardados o son inválidos, mostrar el mensaje de bienvenida
            setMessages([
                {
                    id: "intro-message",
                    role: "assistant",
                    content:
                        "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                    timestamp: Date.now(),
                },
            ]);
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
                const jsonString = JSON.stringify(messages);
                localStorage.setItem(STORAGE_KEY, jsonString);
            } catch (error) {
                console.error(
                    "Error al guardar mensajes en localStorage:",
                    error
                );
            }
        }
    }, [messages]);

    // Efecto para enfocar el textarea al cargar la app
    useEffect(() => {
        const timer = setTimeout(() => {
            footerRef.current?.focusTextarea();
        }, 300);

        return () => clearTimeout(timer);
    }, []);

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

    // Función para borrar completamente el historial de conversación
    const clearContext = () => {
        // Mostrar mensaje de bienvenida después de borrar el historial
        setMessages([
            {
                id: "intro-message",
                role: "assistant",
                content:
                    "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                timestamp: Date.now(),
            },
        ]);

        // Crear un nuevo chat ID
        const newChatId = `chat_${Date.now()}`;
        setCurrentChatId(newChatId);

        // Si hay chats en el historial, añadir uno nuevo
        if (chatHistory.length > 0) {
            setChatHistory([
                ...chatHistory,
                {
                    id: newChatId,
                    title: "Nueva conversación",
                    date: new Date(),
                },
            ]);
        }

        // Enfocar el input después de limpiar el contexto
        setTimeout(() => {
            footerRef.current?.focusTextarea();
        }, 100);

        // Cerrar los menús laterales si están abiertos
        setLeftMenuOpen(false);
        setRightMenuOpen(false);
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

        // Si el mensaje actual solo contiene el mensaje de bienvenida, actualizar el título del chat
        if (messages.length === 1 && messages[0].id === "intro-message") {
            const newChatId = currentChatId || `chat_${Date.now()}`;
            const title =
                content.trim().substring(0, 30) +
                (content.length > 30 ? "..." : "");

            // Actualizar historial de chat
            setChatHistory((prev) => [
                ...prev.filter((chat) => chat.id !== currentChatId), // Filtrar el actual si existe
                {
                    id: newChatId,
                    title: title,
                    date: new Date(),
                },
            ]);

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

            // Enfocar el input después
            setTimeout(() => {
                footerRef.current?.focusTextarea();
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

            setTimeout(() => {
                footerRef.current?.focusTextarea();
            }, 100);
        } finally {
            setIsLoading(false);
            delete requestStartTimeRef.current[requestId];
        }
    };

    // Función para crear una nueva conversación
    const handleNewChat = () => {
        clearContext();
    };

    // Función para seleccionar un chat del historial
    const handleSelectChat = (chatId: string) => {
        // Aquí implementaríamos la carga del chat seleccionado
        // Por ahora solo actualizamos el ID y cerramos el menú
        setCurrentChatId(chatId);
        setLeftMenuOpen(false);
    };

    return (
        <div
            className="flex flex-col h-screen w-full overflow-hidden"
            style={{
                backgroundColor: theme.background,
            }}
        >
            {/* Header con título, versión y selector de modelos - Fijo con altura constante */}
            <Header
                title="PROMPTING"
                version={APP_VERSION}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                theme={theme}
                isDarkTheme={isDarkTheme}
                onToggleLeftMenu={() => {
                    setLeftMenuOpen(!leftMenuOpen);
                    if (rightMenuOpen) setRightMenuOpen(false);
                }}
                onToggleRightMenu={() => {
                    setRightMenuOpen(!rightMenuOpen);
                    if (leftMenuOpen) setLeftMenuOpen(false);
                }}
            />

            {/* Contenido principal (chat) fijo en el centro con su propio scroll */}
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

            {/* Footer con área de entrada y controles - Fijo con altura constante */}
            <Footer
                ref={footerRef}
                onSendMessage={sendMessage}
                toggleTheme={toggleTheme}
                clearContext={clearContext}
                hasContext={messages.length > 1}
                theme={theme}
                isDarkTheme={isDarkTheme}
                isLoading={isLoading}
            />

            {/* Menús laterales */}
            <LeftMenu
                isOpen={leftMenuOpen}
                onClose={() => setLeftMenuOpen(false)}
                theme={theme}
                isDarkTheme={isDarkTheme}
                chatHistory={chatHistory}
                onSelectChat={handleSelectChat}
                onNewChat={handleNewChat}
                currentChatId={currentChatId}
            />

            <RightMenu
                isOpen={rightMenuOpen}
                onClose={() => setRightMenuOpen(false)}
                theme={theme}
                isDarkTheme={isDarkTheme}
                toggleTheme={toggleTheme}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
            />
        </div>
    );
};

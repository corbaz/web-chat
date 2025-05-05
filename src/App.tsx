import { useState, useEffect, useCallback, useRef } from "react";
import { darkTheme, lightTheme } from "./interfaces/temas/temas.tsx";
import { groqModels } from "./components/HEADER/models/groqModels";
import { setupMobileKeyboardHandler } from "./utils/mobileUtils";
import { generateLayoutCSS } from "./utils/layoutConstants";

// Componentes principales
import Header from "./components/HEADER/Header";
import Footer, { FooterRef } from "./components/FOOTER/Footer";
// Importación utilizando el archivo índice
import { ChatContainer } from "./components/CHAT";

// Interfaces
import { ChatMessageType } from "./interfaces/chat/chatTypes";

// Constante de versión
const APP_VERSION = "v.2.32";

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
        { id: string; title: string; date: Date; model?: string }[]
    >([]);
    const [currentChatId, setCurrentChatId] = useState<string | undefined>(
        undefined
    );

    const footerRef = useRef<FooterRef>(null);

    // Función para enfocar el textarea desde cualquier parte
    const focusInput = useCallback(() => {
        setTimeout(() => {
            footerRef.current?.focusTextarea();
        }, 100);
    }, []);

    // Inyectar las variables CSS de layout
    useEffect(() => {
        const styleElement = document.createElement("style");
        styleElement.setAttribute("id", "layout-constants-css");
        styleElement.textContent = generateLayoutCSS();
        document.head.appendChild(styleElement);

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
    const toggleTheme = useCallback(() => {
        setIsDarkTheme((prevIsDark) => {
            // Actualizamos el tema basándonos en el valor previo real
            setTheme(prevIsDark ? lightTheme : darkTheme);
            return !prevIsDark;
        });
    }, []);

    // Configurar el manejador del teclado para dispositivos móviles
    useEffect(() => {
        setupMobileKeyboardHandler();
        setTheme(isDarkTheme ? darkTheme : lightTheme);

        // Configurar clases de HTML y body
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        // Primero limpiar las clases existentes para evitar duplicados
        const classesToAdd = [
            "m-0",
            "p-0",
            "w-full",
            "h-full",
            "overflow-hidden",
            "max-w-screen",
        ];

        htmlElement.classList.add(...classesToAdd, "bg-black");
        bodyElement.classList.add(...classesToAdd, "bg-red-500");

        return () => {
            // Limpieza al desmontar o antes de re-ejecutar el efecto
            classesToAdd.forEach((cls) => {
                htmlElement.classList.remove(cls);
                bodyElement.classList.remove(cls);
            });
            htmlElement.classList.remove("bg-black");
            bodyElement.classList.remove("bg-red-500");
        };
    }, [isDarkTheme]);

    // Manejadores para los menús laterales
    const handleToggleLeftMenu = () => {
        setLeftMenuOpen(!leftMenuOpen);
        if (rightMenuOpen) setRightMenuOpen(false);
        focusInput();
    };

    const handleToggleRightMenu = () => {
        setRightMenuOpen(!rightMenuOpen);
        if (leftMenuOpen) setLeftMenuOpen(false);
        focusInput();
    };

    // Manejador para cambiar el modelo
    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);

        // Guardar el modelo seleccionado para el chat actual en el historial
        if (currentChatId) {
            setChatHistory((prev) =>
                prev.map((chat) =>
                    chat.id === currentChatId
                        ? { ...chat, model: modelId }
                        : chat
                )
            );
        }

        focusInput();
    };

    // Manejador para crear una nueva conversación
    const handleNewChat = () => {
        const newMessages = [
            {
                id: "intro-message",
                role: "assistant" as const,
                content:
                    "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                timestamp: Date.now(),
                modelName: selectedModel, // Guardar el modelo actual en el mensaje de bienvenida
            },
        ];

        // Generar un nuevo ID para esta conversación
        const newChatId = `chat_${Date.now()}`;

        // Actualizar el localStorage con la nueva conversación
        try {
            // 1. Actualizar las conversaciones
            const storedConversations = localStorage.getItem("chat-messages");
            let conversations = {};

            if (storedConversations) {
                try {
                    const parsed = JSON.parse(storedConversations);
                    if (parsed && typeof parsed === "object") {
                        conversations = parsed as Record<
                            string,
                            ChatMessageType[]
                        >;
                    }
                } catch (e) {
                    console.error("Error al parsear conversaciones:", e);
                }
            }

            // Agregar la nueva conversación
            conversations = {
                ...conversations,
                [newChatId]: newMessages,
            };

            // Guardar todas las conversaciones
            localStorage.setItem(
                "chat-messages",
                JSON.stringify(conversations)
            );

            // 2. Actualizar el historial de chats (NO borrar los anteriores)
            const newChatHistory = [
                ...chatHistory,
                {
                    id: newChatId,
                    title: "Nuevo Chat",
                    date: new Date(),
                    model: selectedModel, // Guardar el modelo seleccionado actualmente
                },
            ];

            localStorage.setItem(
                "chat-history",
                JSON.stringify(newChatHistory)
            );

            // 3. Actualizar el estado de React
            setMessages(newMessages);
            setCurrentChatId(newChatId);
            setChatHistory(newChatHistory);
        } catch (error) {
            console.error("Error al crear nueva conversación:", error);
            // En caso de error, solo actualizamos el estado de React
            setMessages(newMessages);
            setCurrentChatId(newChatId);
            setChatHistory((prevHistory) => [
                ...prevHistory,
                {
                    id: newChatId,
                    title: "Nuevo Chat",
                    date: new Date(),
                    model: selectedModel, // Incluir el modelo seleccionado actual
                },
            ]);
        }

        // Cerrar los menús laterales
        setLeftMenuOpen(false);
        setRightMenuOpen(false);
        focusInput();
    };

    // Manejador para limpiar el chat actual, borrarlo del historial y crear uno nuevo
    const handleClearChat = useCallback(() => {
        if (!currentChatId) return;

        // Crear un chat nuevo
        const newChatId = `chat_${Date.now()}`;

        // Mensaje de bienvenida para el nuevo chat
        const welcomeMessage = [
            {
                id: "intro-message",
                role: "assistant" as const,
                content:
                    "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                timestamp: Date.now(),
                modelName: selectedModel,
            },
        ];

        try {
            // 1. Actualizar los mensajes en localStorage
            const storedConversations = localStorage.getItem("chat-messages");
            let conversations: Record<string, ChatMessageType[]> = {};

            if (storedConversations) {
                conversations = JSON.parse(storedConversations);
                // Eliminar la conversación actual
                delete conversations[currentChatId];
            }

            // Añadir la nueva conversación
            conversations[newChatId] = welcomeMessage;
            localStorage.setItem(
                "chat-messages",
                JSON.stringify(conversations)
            );

            // 2. Actualizar el historial de chats
            const updatedHistory = chatHistory.filter(
                (chat) => chat.id !== currentChatId
            );
            const newChatEntry = {
                id: newChatId,
                title: "Nuevo Chat",
                date: new Date(),
                model: selectedModel,
            };

            const newChatHistory = [...updatedHistory, newChatEntry];
            localStorage.setItem(
                "chat-history",
                JSON.stringify(newChatHistory)
            );

            // 3. Actualizar el estado
            setMessages(welcomeMessage);
            setCurrentChatId(newChatId);
            setChatHistory(newChatHistory);
        } catch (error) {
            console.error(
                "Error al limpiar y crear nueva conversación:",
                error
            );
        }

        focusInput();
    }, [currentChatId, selectedModel, chatHistory, setChatHistory, focusInput]);

    // Modificar el tipo de handleUpdateChatHistory para que sea compatible con React.Dispatch<React.SetStateAction<...>>
    const handleUpdateChatHistory = useCallback(
        (
            value: React.SetStateAction<
                { id: string; title: string; date: Date; model?: string }[]
            >
        ) => {
            if (typeof value === "function") {
                setChatHistory((prev) => {
                    const newValue = value(prev);
                    // Almacenar en localStorage
                    try {
                        localStorage.setItem(
                            "chat-history",
                            JSON.stringify(newValue)
                        );
                    } catch (error) {
                        console.error(
                            "Error al guardar historial de chat:",
                            error
                        );
                    }
                    return newValue;
                });
            } else {
                // Almacenar en localStorage
                try {
                    localStorage.setItem("chat-history", JSON.stringify(value));
                } catch (error) {
                    console.error("Error al guardar historial de chat:", error);
                }
                setChatHistory(value);
            }
        },
        []
    ); // Sin dependencias para evitar recreaciones innecesarias

    // Manejador para actualizar el estado de carga
    const handleLoadingChange = (loading: boolean) => {
        setIsLoading(loading);
    };

    // Manejador para actualizar el título de un chat
    const handleUpdateChatTitle = useCallback(
        (chatId: string, newTitle: string) => {
            setChatHistory((prev) =>
                prev.map((chat) =>
                    chat.id === chatId ? { ...chat, title: newTitle } : chat
                )
            );
        },
        []
    );

    // Manejador para eliminar un chat y navegar a otro
    const handleDeleteChat = useCallback(
        (chatIdToDelete: string) => {
            if (!chatIdToDelete) return;

            try {
                // 1. Eliminar los mensajes de esta conversación de localStorage
                const storedConversations =
                    localStorage.getItem("chat-messages");
                if (storedConversations) {
                    const conversations = JSON.parse(storedConversations);
                    // Eliminar la conversación
                    delete conversations[chatIdToDelete];
                    localStorage.setItem(
                        "chat-messages",
                        JSON.stringify(conversations)
                    );
                }

                // 2. Actualizar el historial de chats
                const updatedHistory = chatHistory.filter(
                    (chat) => chat.id !== chatIdToDelete
                );

                // Actualizar el historial en localStorage y estado inmediatamente
                localStorage.setItem(
                    "chat-history",
                    JSON.stringify(updatedHistory)
                );
                setChatHistory(updatedHistory);

                // 3. Si estamos eliminando el chat actual, navegar a otro
                if (currentChatId === chatIdToDelete) {
                    // Si era el último chat, crear uno nuevo completamente separado
                    if (updatedHistory.length === 0) {
                        // Importante: limpiar el chat actual antes de crear uno nuevo
                        setCurrentChatId(undefined);
                        setMessages([]);

                        // Crear un nuevo chat con un pequeño retraso para asegurar que el estado se actualice
                        setTimeout(() => {
                            // Generar un nuevo ID único
                            const newChatId = `chat_${Date.now()}`;
                            const welcomeMessage = [
                                {
                                    id: "intro-message",
                                    role: "assistant" as const,
                                    content:
                                        "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                                    timestamp: Date.now(),
                                    modelName: selectedModel,
                                },
                            ];

                            // Guardar el nuevo chat en localStorage
                            const newConversations: Record<
                                string,
                                ChatMessageType[]
                            > = {};
                            newConversations[newChatId] = welcomeMessage;
                            localStorage.setItem(
                                "chat-messages",
                                JSON.stringify(newConversations)
                            );

                            // Crear un nuevo historial con solo el nuevo chat
                            const newHistory = [
                                {
                                    id: newChatId,
                                    title: "Nuevo Chat",
                                    date: new Date(),
                                    model: selectedModel,
                                },
                            ];
                            localStorage.setItem(
                                "chat-history",
                                JSON.stringify(newHistory)
                            );

                            // Actualizar el estado
                            setMessages(welcomeMessage);
                            setCurrentChatId(newChatId);
                            setChatHistory(newHistory);
                        }, 50);

                        return;
                    }

                    // Si quedan chats, buscar otro chat para navegar
                    // Intentar encontrar un chat más reciente
                    const newerChats = updatedHistory.filter(
                        (chat) =>
                            new Date(chat.date) >
                            new Date(
                                chatHistory.find((c) => c.id === chatIdToDelete)
                                    ?.date || 0
                            )
                    );

                    // Si hay chats más recientes, ir al más antiguo de ellos
                    if (newerChats.length > 0) {
                        const sortedNewer = [...newerChats].sort(
                            (a, b) =>
                                new Date(a.date).getTime() -
                                new Date(b.date).getTime()
                        );
                        setCurrentChatId(sortedNewer[0].id);

                        // Cargar mensajes del chat seleccionado
                        const storedData =
                            localStorage.getItem("chat-messages");
                        if (storedData) {
                            const parsedData = JSON.parse(storedData);
                            if (parsedData && parsedData[sortedNewer[0].id]) {
                                setMessages(parsedData[sortedNewer[0].id]);
                                // Actualizar modelo si es necesario
                                if (sortedNewer[0].model) {
                                    setSelectedModel(sortedNewer[0].model);
                                }
                            }
                        }
                    }
                    // Si no hay chats más recientes, ir al más reciente de los anteriores
                    else if (updatedHistory.length > 0) {
                        const latestChat = updatedHistory.reduce(
                            (latest, chat) =>
                                new Date(chat.date) > new Date(latest.date)
                                    ? chat
                                    : latest,
                            updatedHistory[0]
                        );
                        setCurrentChatId(latestChat.id);

                        // Cargar mensajes del chat seleccionado
                        const storedData =
                            localStorage.getItem("chat-messages");
                        if (storedData) {
                            const parsedData = JSON.parse(storedData);
                            if (parsedData && parsedData[latestChat.id]) {
                                setMessages(parsedData[latestChat.id]);
                                // Actualizar modelo si es necesario
                                if (latestChat.model) {
                                    setSelectedModel(latestChat.model);
                                }
                            }
                        }
                    }
                }
            } catch (error) {
                console.error("Error al eliminar chat:", error);
            }
        },
        [
            chatHistory,
            currentChatId,
            selectedModel,
            setChatHistory,
            setMessages,
            setCurrentChatId,
            setSelectedModel,
        ]
    );

    return (
        <div
            className="flex flex-col h-screen w-full overflow-hidden"
            style={{
                backgroundColor: theme.background,
            }}
        >
            {/* Header con título, versión y selector de modelos */}
            <Header
                title="PROMPTING"
                version={APP_VERSION}
                selectedModel={selectedModel}
                onModelChange={handleModelChange}
                theme={theme}
                isDarkTheme={isDarkTheme}
                onToggleLeftMenu={handleToggleLeftMenu}
                onToggleRightMenu={handleToggleRightMenu}
            />

            {/* Contenedor principal del chat */}
            <ChatContainer
                messages={messages}
                setMessages={setMessages} // Usar setMessages directamente
                isLoading={isLoading}
                setIsLoading={handleLoadingChange}
                theme={theme}
                isDarkTheme={isDarkTheme}
                toggleTheme={toggleTheme} // Añadimos esta propiedad
                selectedModel={selectedModel}
                currentChatId={currentChatId}
                setCurrentChatId={setCurrentChatId}
                chatHistory={chatHistory}
                setChatHistory={handleUpdateChatHistory}
                leftMenuOpen={leftMenuOpen}
                rightMenuOpen={rightMenuOpen}
                onCloseLeftMenu={() => {
                    setLeftMenuOpen(false);
                    focusInput();
                }}
                onCloseRightMenu={() => {
                    setRightMenuOpen(false);
                    focusInput();
                }}
                onSelectChat={(chatId) => {
                    // Buscar el chat seleccionado
                    const selectedChat = chatHistory.find(
                        (chat) => chat.id === chatId
                    );

                    // Simplemente cambiamos al chat seleccionado
                    setCurrentChatId(chatId);

                    // Si el chat tiene un modelo guardado, actualizamos el selector
                    if (selectedChat && selectedChat.model) {
                        setSelectedModel(selectedChat.model);
                    }

                    focusInput();
                }}
                onNewChat={handleNewChat}
                onModelChange={handleModelChange}
                onFocusInput={focusInput}
                onUpdateChatTitle={handleUpdateChatTitle}
                onDeleteChat={handleDeleteChat}
            />

            {/* Footer con área de entrada y controles */}
            <Footer
                ref={footerRef}
                onSendMessage={(message) => {
                    // Delegamos la lógica de envío al componente ChatContainer
                    if (message.trim()) {
                        const event = new CustomEvent("send-message", {
                            detail: { message },
                        });
                        document.dispatchEvent(event);
                        focusInput();
                    }
                }}
                toggleTheme={toggleTheme}
                clearContext={handleClearChat}
                hasContext={messages.length > 1}
                theme={theme}
                isDarkTheme={isDarkTheme}
                isLoading={isLoading}
                chatTitle={
                    chatHistory.find((chat) => chat.id === currentChatId)?.title
                }
            />
        </div>
    );
};

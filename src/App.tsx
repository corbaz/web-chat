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
const APP_VERSION = "v.2.20";

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
                        conversations = parsed;
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
                    title: "Nueva conversación",
                    date: new Date(),
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
                    title: "Nueva conversación",
                    date: new Date(),
                },
            ]);
        }

        // Cerrar los menús laterales
        setLeftMenuOpen(false);
        setRightMenuOpen(false);
        focusInput();
    };

    // Modificar el tipo de handleUpdateChatHistory para que sea compatible con React.Dispatch<React.SetStateAction<...>>
    const handleUpdateChatHistory = useCallback(
        (
            value: React.SetStateAction<
                { id: string; title: string; date: Date }[]
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
                    setCurrentChatId(chatId);
                    focusInput();
                }}
                onNewChat={handleNewChat}
                onModelChange={handleModelChange}
                onFocusInput={focusInput}
                onUpdateChatTitle={handleUpdateChatTitle}
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
                clearContext={handleNewChat}
                hasContext={messages.length > 1}
                theme={theme}
                isDarkTheme={isDarkTheme}
                isLoading={isLoading}
            />
        </div>
    );
};

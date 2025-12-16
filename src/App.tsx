import { useState, useEffect, useCallback, useRef } from 'react';
import { darkTheme, lightTheme } from './interfaces/temas/temas.tsx';
import { groqModels } from './components/HEADER/models/groqModels';
import { routellmModels } from './components/HEADER/models/routellmModels';
import { openaiModels } from './components/HEADER/models/openaiModels';
import { anthropicModels } from './components/HEADER/models/anthropicModels';
import { setupMobileKeyboardHandler } from './utils/mobileUtils';
import { generateLayoutCSS } from './utils/layoutConstants';
import { createWelcomeMessage } from './constants/messages';
import ApiKeyModal from './components/ApiKeyModal/ApiKeyModal.tsx';

// Componentes principales
import Header from './components/HEADER/Header';
import Footer, { FooterRef } from './components/FOOTER/Footer';
// Importación utilizando el archivo índice
import ChatContainer from './components/chat/ChatContainer';

// Interfaces
import { ChatMessageType } from './interfaces/chat/chatTypes';
const PROVIDER_IDS = ['groq', 'routellm', 'openai', 'anthropic'] as const;
// Constante de versión
export const APP_VERSION = 'v.3.6';

export const App = () => {
    // Estados para la UI
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const theme = isDarkTheme ? darkTheme : lightTheme;
    const hasAnyApiKey = useCallback(
        () =>
            PROVIDER_IDS.some((p) => {
                const key = localStorage.getItem(`${p}ApiKey`);
                return key && key.trim() !== '';
            }),
        []
    );

    const getInitialProvider = () => {
        const stored = localStorage.getItem('selectedProvider');
        // Si hay un provider guardado y tiene API key, úsalo
        if (stored) {
            const key = localStorage.getItem(`${stored}ApiKey`);
            if (key && key.trim() !== '') return stored;
        }
        // Si no, elige el primero que tenga API key
        for (const p of PROVIDER_IDS) {
            const key = localStorage.getItem(`${p}ApiKey`);
            if (key && key.trim() !== '') return p;
        }
        // Fallback
        return 'groq';
    };

    const getInitialModel = (provider: string) => {
        // Intentar cargar el modelo guardado en localStorage
        const savedModel = localStorage.getItem('selectedModel');

        // Verificar que el modelo guardado pertenece al provider actual
        let allModels: { id: string }[] = [];
        switch (provider) {
            case 'groq':
                allModels = groqModels;
                break;
            case 'routellm':
                allModels = routellmModels;
                break;
            case 'openai':
                allModels = openaiModels;
                break;
            case 'anthropic':
                allModels = anthropicModels;
                break;
            default:
                allModels = groqModels;
        }

        // Si el modelo guardado existe en el provider actual, usarlo
        if (savedModel && allModels.some((m) => m.id === savedModel)) {
            return savedModel;
        }

        // Si no, devolver el primer modelo del provider
        return allModels[0]?.id || groqModels[0].id;
    };

    const initialProvider = getInitialProvider();
    const [selectedProvider, setSelectedProvider] =
        useState<string>(initialProvider);
    const [selectedModel, setSelectedModel] = useState(() =>
        getInitialModel(initialProvider)
    );

    const getDefaultModelForProvider = (provider: string) => {
        switch (provider) {
            case 'groq':
                return groqModels[0]?.id || selectedModel;
            case 'routellm':
                return routellmModels[0]?.id || selectedModel;
            case 'openai':
                return openaiModels[0]?.id || selectedModel;
            case 'anthropic':
                return anthropicModels[0]?.id || selectedModel;
            default:
                return groqModels[0]?.id || selectedModel;
        }
    };

    const handleProviderChange = (providerId: string) => {
        setSelectedProvider(providerId);
        localStorage.setItem('selectedProvider', providerId);
        const newModel = getDefaultModelForProvider(providerId);
        setSelectedModel(newModel);
        localStorage.setItem('selectedModel', newModel);
    };

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
    const [isApiKeySet, setIsApiKeySet] = useState(hasAnyApiKey());
    const [apiKeyModalReset, setApiKeyModalReset] = useState(0);

    const footerRef = useRef<FooterRef>(null);

    // Función para enfocar el textarea desde cualquier parte
    const focusInput = useCallback(() => {
        setTimeout(() => {
            footerRef.current?.focusTextarea();
        }, 100);
    }, []);

    // Reaccionar a cambios en API keys (guardar o borrar)
    useEffect(() => {
        const handleApiKeyChange = () => {
            const hasKey = hasAnyApiKey();
            setIsApiKeySet(hasKey);
            if (!hasKey) {
                setApiKeyModalReset((prev) => prev + 1); // fuerza re-montar el modal
            }
        };

        window.addEventListener('apikey-changed', handleApiKeyChange);
        return () => {
            window.removeEventListener('apikey-changed', handleApiKeyChange);
        };
    }, [hasAnyApiKey]);

    // Inyectar las variables CSS de layout
    useEffect(() => {
        const styleElement = document.createElement('style');
        styleElement.setAttribute('id', 'layout-constants-css');
        styleElement.textContent = generateLayoutCSS();
        document.head.appendChild(styleElement);

        return () => {
            const existingStyle = document.getElementById(
                'layout-constants-css'
            );
            if (existingStyle) {
                document.head.removeChild(existingStyle);
            }
        };
    }, []);

    // Función para cambiar el tema
    const toggleTheme = useCallback(() => {
        setIsDarkTheme((prevIsDark) => !prevIsDark);
    }, []);

    // Configurar el manejador del teclado para dispositivos móviles
    useEffect(() => {
        setupMobileKeyboardHandler();

        // Configurar clases de HTML y body
        const htmlElement = document.documentElement;
        const bodyElement = document.body;

        // Primero limpiar las clases existentes para evitar duplicados
        const classesToAdd = [
            'm-0',
            'p-0',
            'w-full',
            'h-full',
            'overflow-hidden',
            'max-w-screen',
        ];

        htmlElement.classList.add(...classesToAdd, 'bg-black');
        bodyElement.classList.add(...classesToAdd, 'bg-red-500');

        return () => {
            // Limpieza al desmontar o antes de re-ejecutar el efecto
            classesToAdd.forEach((cls) => {
                htmlElement.classList.remove(cls);
                bodyElement.classList.remove(cls);
            });
            htmlElement.classList.remove('bg-black');
            bodyElement.classList.remove('bg-red-500');
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
        localStorage.setItem('selectedModel', modelId);

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
        const newMessages = [createWelcomeMessage(selectedModel)];

        // Generar un nuevo ID para esta conversación
        const newChatId = `chat_${Date.now()}`;

        // Actualizar el localStorage con la nueva conversación
        try {
            // 1. Actualizar las conversaciones
            const storedConversations = localStorage.getItem('chat-messages');
            let conversations = {};

            if (storedConversations) {
                try {
                    const parsed = JSON.parse(storedConversations);
                    if (parsed && typeof parsed === 'object') {
                        conversations = parsed as Record<
                            string,
                            ChatMessageType[]
                        >;
                    }
                } catch (e) {
                    console.error('Error al parsear conversaciones:', e);
                }
            }

            // Agregar la nueva conversación
            conversations = {
                ...conversations,
                [newChatId]: newMessages,
            };

            // Guardar todas las conversaciones
            localStorage.setItem(
                'chat-messages',
                JSON.stringify(conversations)
            );

            // 2. Actualizar el historial de chats (NO borrar los anteriores)
            const newChatHistory = [
                ...chatHistory,
                {
                    id: newChatId,
                    title: 'Nuevo Chat',
                    date: new Date(),
                    model: selectedModel, // Guardar el modelo seleccionado actualmente
                },
            ];

            localStorage.setItem(
                'chat-history',
                JSON.stringify(newChatHistory)
            );

            // 3. Actualizar el estado de React
            setMessages(newMessages);
            setCurrentChatId(newChatId);
            setChatHistory(newChatHistory);
        } catch (error) {
            console.error('Error al crear nueva conversación:', error);
            // En caso de error, solo actualizamos el estado de React
            setMessages(newMessages);
            setCurrentChatId(newChatId);
            setChatHistory((prevHistory) => [
                ...prevHistory,
                {
                    id: newChatId,
                    title: 'Nuevo Chat',
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
        const welcomeMessage = [createWelcomeMessage(selectedModel)];

        try {
            // 1. Actualizar los mensajes en localStorage
            const storedConversations = localStorage.getItem('chat-messages');
            let conversations: Record<string, ChatMessageType[]> = {};

            if (storedConversations) {
                conversations = JSON.parse(storedConversations);
                // Eliminar la conversación actual
                delete conversations[currentChatId];
            }

            // Añadir la nueva conversación
            conversations[newChatId] = welcomeMessage;
            localStorage.setItem(
                'chat-messages',
                JSON.stringify(conversations)
            );

            // 2. Actualizar el historial de chats
            const updatedHistory = chatHistory.filter(
                (chat) => chat.id !== currentChatId
            );
            const newChatEntry = {
                id: newChatId,
                title: 'Nuevo Chat',
                date: new Date(),
                model: selectedModel,
            };

            const newChatHistory = [...updatedHistory, newChatEntry];
            localStorage.setItem(
                'chat-history',
                JSON.stringify(newChatHistory)
            );

            // 3. Actualizar el estado
            setMessages(welcomeMessage);
            setCurrentChatId(newChatId);
            setChatHistory(newChatHistory);
        } catch (error) {
            console.error(
                'Error al limpiar y crear nueva conversación:',
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
            if (typeof value === 'function') {
                setChatHistory((prev) => {
                    const newValue = value(prev);
                    // Almacenar en localStorage
                    try {
                        localStorage.setItem(
                            'chat-history',
                            JSON.stringify(newValue)
                        );
                    } catch (error) {
                        console.error(
                            'Error al guardar historial de chat:',
                            error
                        );
                    }
                    return newValue;
                });
            } else {
                // Almacenar en localStorage
                try {
                    localStorage.setItem('chat-history', JSON.stringify(value));
                } catch (error) {
                    console.error('Error al guardar historial de chat:', error);
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
                    localStorage.getItem('chat-messages');
                if (storedConversations) {
                    const conversations = JSON.parse(storedConversations);
                    // Eliminar la conversación
                    delete conversations[chatIdToDelete];
                    localStorage.setItem(
                        'chat-messages',
                        JSON.stringify(conversations)
                    );
                }

                // 2. Actualizar el historial de chats
                const updatedHistory = chatHistory.filter(
                    (chat) => chat.id !== chatIdToDelete
                );

                // Actualizar el historial en localStorage y estado inmediatamente
                localStorage.setItem(
                    'chat-history',
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
                                createWelcomeMessage(selectedModel),
                            ];

                            // Guardar el nuevo chat en localStorage
                            const newConversations: Record<
                                string,
                                ChatMessageType[]
                            > = {};
                            newConversations[newChatId] = welcomeMessage;
                            localStorage.setItem(
                                'chat-messages',
                                JSON.stringify(newConversations)
                            );

                            // Crear un nuevo historial con solo el nuevo chat
                            const newHistory = [
                                {
                                    id: newChatId,
                                    title: 'Nuevo Chat',
                                    date: new Date(),
                                    model: selectedModel,
                                },
                            ];
                            localStorage.setItem(
                                'chat-history',
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
                            localStorage.getItem('chat-messages');
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
                            localStorage.getItem('chat-messages');
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
                console.error('Error al eliminar chat:', error);
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

    const handleApiKeyProvided = () => {
        setIsApiKeySet(true);
    };

    return (
        <div
            className="flex flex-col h-screen w-full overflow-hidden"
            style={{
                backgroundColor: theme.background,
            }}
        >
            <ApiKeyModal
                key={apiKeyModalReset}
                theme={theme}
                isDarkTheme={isDarkTheme}
                onApiKeyProvided={handleApiKeyProvided}
            />
            {isApiKeySet && (
                <>
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
                        selectedProvider={selectedProvider}
                        onProviderChange={handleProviderChange}
                    />
                    {/* Contenedor principal del chat */}
                    <ChatContainer
                        messages={messages}
                        setMessages={setMessages}
                        isLoading={isLoading}
                        setIsLoading={handleLoadingChange}
                        theme={theme}
                        isDarkTheme={isDarkTheme}
                        toggleTheme={toggleTheme}
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
                            const selectedChat = chatHistory.find(
                                (chat) => chat.id === chatId
                            );
                            setCurrentChatId(chatId);
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
                        selectedProvider={selectedProvider}
                        onRepeatMessage={(message) => {
                            if (footerRef.current) {
                                footerRef.current.setMessage(message);
                            }
                        }}
                    />
                    {/* Footer con área de entrada y controles */}
                    <Footer
                        ref={footerRef}
                        onSendMessage={(message) => {
                            if (message.trim()) {
                                const event = new CustomEvent('send-message', {
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
                        selectedModel={selectedModel}
                        selectedProvider={selectedProvider}
                        chatTitle={
                            chatHistory.find(
                                (chat) => chat.id === currentChatId
                            )?.title
                        }
                        onUpdateChatTitle={(newTitle) => {
                            if (currentChatId) {
                                handleUpdateChatTitle(currentChatId, newTitle);
                            }
                        }}
                        currentChatId={currentChatId}
                    />
                </>
            )}
        </div>
    );
};

import "./style.css";

import { darkTheme, lightTheme } from "./interfaces/temas/temas.tsx";
import { useEffect, useRef, useState } from "react";

// Constante de versión para mostrar junto al título
const APP_VERSION = "v.1.01";

import { DeepChat } from "deep-chat-react";
import ModelSelector from "./components/ModelSelector";
import axios from "axios";
import { getDeepChatStyles } from "./interfaces/deepchat/estilos";
import { groqModels } from "./components/models/groqModels";
import { setupMobileKeyboardHandler } from "./utils/mobileUtils";

// Definimos un tipo para el ref del componente DeepChat
// Usamos una interfaz más completa basada en la documentación de DeepChat
interface DeepChatInstance {
    getMessages: () => unknown;
    submitUserMessage: (message: string) => void;
    addMessage: (message: unknown) => void;
    updateMessage: (message: unknown) => void;
    // Añadimos más métodos que podría tener el componente DeepChat
    clearMessages: () => void;
    setInputValue: (value: string) => void;
    [key: string]: unknown; // Para permitir otros métodos o propiedades que no conocemos
}

// Función para formatear el tiempo de respuesta
const formatResponseTime = (milliseconds: number): string => {
    if (milliseconds < 1000) {
        return `${milliseconds}ms`;
    } else {
        const seconds = (milliseconds / 1000).toFixed(2);
        return `${seconds}s`;
    }
};

export const App = () => {
    // Usamos un tipo más específico para el ref de DeepChat
    const chatRef = useRef<DeepChatInstance | null>(null);
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [theme, setTheme] = useState(darkTheme);
    const [key, setKey] = useState(0); // Agregar un estado para el key
    const [selectedModel, setSelectedModel] = useState(groqModels[0].id); // Modelo seleccionado por defecto
    // Referencia para almacenar los tiempos de inicio de las consultas
    const requestStartTimeRef = useRef<Record<string, number>>({});

    // Obtener los estilos del DeepChat basados en el tema actual
    const deepChatStyles = getDeepChatStyles(theme);

    // Función para cambiar el tema
    const toggleTheme = () => {
        setIsDarkTheme(!isDarkTheme);
        setTheme(isDarkTheme ? lightTheme : darkTheme);
        setKey(key + 1); // Actualizar el key al cambiar el tema
    };

    // Función reutilizable para hacer solicitudes a la API de Groq usando axios
    const fetchGroqResponse = async (prompt: string, requestId: string) => {
        try {
            const prompting = prompt + ". Contesta siempre en español";
            console.log(
                "Enviando solicitud a Groq API con modelo:",
                selectedModel
            );

            const response = await axios.post(
                "https://api.groq.com/openai/v1/chat/completions",
                {
                    model: selectedModel, // Usar el modelo seleccionado
                    messages: [
                        {
                            role: "user",
                            content: prompting,
                        },
                    ],
                    temperature: 0.7, // Valor entre 0 y 2, menor valor = respuestas más deterministas
                    max_completion_tokens: 2048, // Limitar la longitud de la respuesta
                    presence_penalty: 0.1, // Penalizar ligeramente la repetición de temas
                },
                {
                    headers: {
                        "Content-Type": "application/json",
                        Authorization:
                            "Bearer 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",
                    },
                }
            );

            console.log("Respuesta recibida de Groq API");

            // Calcular el tiempo de respuesta
            const endTime = Date.now();
            const responseTime =
                endTime - (requestStartTimeRef.current[requestId] || endTime);

            // Formatear la respuesta con el tiempo
            const formattedTime = formatResponseTime(responseTime);
            const responseContent = response.data.choices[0].message.content;
            return `⏱️ Respuesta generada en ${formattedTime}\n\n${responseContent}`;
        } catch (error) {
            console.error("Error fetching response from Groq:", error);

            // Manejo de errores más detallado
            if (axios.isAxiosError(error)) {
                if (error.response) {
                    // El servidor respondió con un código de estado diferente de 2xx
                    console.error(
                        "Error de API:",
                        error.response.status,
                        error.response.data
                    );
                    return `Error del servidor (${error.response.status}): ${
                        error.response.data.error?.message ||
                        "Error desconocido"
                    }`;
                } else if (error.request) {
                    // La solicitud se realizó pero no se recibió respuesta
                    console.error("No se recibió respuesta del servidor");
                    return "Error de conexión: No se recibió respuesta del servidor. Verifica tu conexión a internet.";
                }
            }

            return "Error al obtener respuesta. Por favor, intenta de nuevo.";
        }
    };

    // Función para cerrar el teclado en dispositivos móviles
    const closeKeyboard = () => {
        // Desenfocar cualquier elemento activo para cerrar el teclado
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }

        // Solución específica para iOS
        const tempInput = document.createElement("input");
        tempInput.style.position = "absolute";
        tempInput.style.opacity = "0";
        tempInput.style.height = "0";
        tempInput.style.fontSize = "16px";
        tempInput.style.appearance = "none";
        document.body.appendChild(tempInput);
        tempInput.focus();
        tempInput.blur();
        document.body.removeChild(tempInput);

        // Solución específica para Android
        if (/Android/i.test(navigator.userAgent)) {
            document.documentElement.style.height = "100%";
            setTimeout(() => {
                document.documentElement.style.height = "";
            }, 100);
        }
    };

    useEffect(() => {
        // Configurar el manejador del teclado para dispositivos móviles
        setupMobileKeyboardHandler();

        // Inicializar el tema
        setTheme(isDarkTheme ? darkTheme : lightTheme);

        // Añadir un event listener global para cerrar el teclado cuando se presiona Enter
        const handleKeyDown = (e: KeyboardEvent) => {
            if (
                e.key === "Enter" &&
                !e.shiftKey &&
                document.activeElement instanceof HTMLInputElement
            ) {
                // Desenfocar el input después de un pequeño retraso para permitir que el mensaje se envíe
                setTimeout(() => {
                    const activeElement = document.activeElement as HTMLElement;
                    activeElement?.blur();
                }, 100);
            }
        };

        document.addEventListener("keydown", handleKeyDown);

        return () => {
            document.removeEventListener("keydown", handleKeyDown);
        };
    }, [isDarkTheme]);

    return (
        <div className="App" style={{ backgroundColor: theme.background }}>
            <div className="flex flex-col items-center pt-10">
                <div className="flex items-end">
                    <h1
                        className="text-6xl font-bold text-center"
                        style={{ color: theme.title.color }}
                    >
                        PROMPTING
                    </h1>
                    <span
                        className="text-sm ml-2 mb-3"
                        style={{ color: theme.title.color }}
                    >
                        {APP_VERSION}
                    </span>
                </div>
                <div className="absolute right-5 top-5 flex items-center">
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={!isDarkTheme}
                            onChange={toggleTheme}
                        />
                        <span
                            className="slider round"
                            style={{
                                backgroundColor: isDarkTheme
                                    ? theme.accent
                                    : theme.secondary,
                                boxShadow: `0 0 5px ${theme.accent}`,
                            }}
                        >
                            {/* Mostrar ambos íconos permanentemente */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="sun-icon"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="moon-icon"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                                />
                            </svg>
                        </span>
                    </label>
                </div>
            </div>

            {/* Model selector positioned above the chat */}
            <div className="w-full flex justify-center mb-2">
                <ModelSelector
                    selectedModel={selectedModel}
                    onModelChange={setSelectedModel}
                    theme={theme}
                    isDarkTheme={isDarkTheme}
                />
            </div>

            <div className="chat-container">
                <DeepChat
                    key={`${key}-${selectedModel}`}
                    // Usamos una función de casting para el ref
                    ref={(el) => {
                        // Asignamos el elemento al ref
                        chatRef.current = el as unknown as DeepChatInstance;
                    }}
                    style={deepChatStyles.container}
                    messageStyles={deepChatStyles.messageStyles}
                    textInput={deepChatStyles.textInput}
                    submitButtonStyles={deepChatStyles.submitButtonStyles}
                    auxiliaryStyle={deepChatStyles.auxiliaryStyle}
                    connect={{
                        handler: (body: unknown, signals: unknown) => {
                            try {
                                // Cerrar el teclado en dispositivos móviles
                                closeKeyboard();

                                // Obtener el último mensaje del usuario
                                const lastUserMessage = (
                                    body as {
                                        messages: Array<{
                                            role: string;
                                            text?: string;
                                            id?: string;
                                        }>;
                                    }
                                ).messages
                                    .slice()
                                    .reverse()
                                    .find((msg) => msg.role === "user");

                                if (!lastUserMessage?.text) {
                                    console.error(
                                        "No se encontró un mensaje de usuario válido"
                                    );
                                    (
                                        signals as {
                                            onResponse: (response: {
                                                text: string;
                                            }) => void;
                                        }
                                    ).onResponse({
                                        text: "No se pudo procesar tu mensaje. Por favor, intenta de nuevo.",
                                    });
                                    return;
                                }

                                console.log(
                                    "Mensaje del usuario:",
                                    lastUserMessage.text
                                );

                                // Generar un ID único para esta solicitud y registrar el tiempo de inicio
                                const requestId = `req_${Date.now()}_${Math.random()
                                    .toString(36)
                                    .substr(2, 9)}`;
                                requestStartTimeRef.current[requestId] =
                                    Date.now();

                                // Usar la función reutilizable para obtener la respuesta
                                fetchGroqResponse(
                                    lastUserMessage.text,
                                    requestId
                                )
                                    .then((responseText) => {
                                        console.log(
                                            "Respuesta recibida:",
                                            responseText
                                        );

                                        // Usar signals.onResponse para enviar la respuesta a DeepChat
                                        (
                                            signals as {
                                                onResponse: (response: {
                                                    text: string;
                                                }) => void;
                                            }
                                        ).onResponse({ text: responseText });

                                        // Limpiar el registro del tiempo para este requestId
                                        delete requestStartTimeRef.current[
                                            requestId
                                        ];
                                    })
                                    .catch((error) => {
                                        console.error(
                                            "Error en el handler de connect:",
                                            error
                                        );
                                        (
                                            signals as {
                                                onResponse: (response: {
                                                    text: string;
                                                }) => void;
                                            }
                                        ).onResponse({
                                            text: "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.",
                                        });

                                        // Limpiar el registro del tiempo para este requestId
                                        delete requestStartTimeRef.current[
                                            requestId
                                        ];
                                    });
                            } catch (error) {
                                console.error(
                                    "Error en el handler de connect:",
                                    error
                                );
                                (
                                    signals as {
                                        onResponse: (response: {
                                            text: string;
                                        }) => void;
                                    }
                                ).onResponse({
                                    text: "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.",
                                });
                            }
                        },
                    }}
                    inputMode="text"
                    introMessage={{
                        text: "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoy?",
                    }}
                />
            </div>
        </div>
    );
};

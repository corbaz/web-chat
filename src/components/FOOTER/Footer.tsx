import React, { useState, useRef, useEffect } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import { isMobile } from "../../utils/mobileUtils";
import LunaIcon from "../../assets/luna.svg";
import EscobaIcon from "../../assets/escoba.svg";
import TrashIcon from "../../assets/trash.svg";
import VaritaIcon from "../../assets/varita_magica.svg";
import axios from "axios"; // Importamos axios para las peticiones HTTP

interface FooterProps {
    onSendMessage: (message: string) => void;
    toggleTheme: () => void;
    clearContext?: () => void;
    hasContext?: boolean;
    theme: ColorPalette;
    isDarkTheme: boolean;
    isLoading: boolean;
    chatTitle?: string; // Título del chat
    onUpdateChatTitle?: (newTitle: string) => void; // Nueva prop para actualizar el título
    currentChatId?: string; // Necesario para saber qué chat se está editando
    selectedModel?: string; // Modelo actualmente seleccionado
}

// Crear una interfaz para exponer el método focus
export interface FooterRef {
    focusTextarea: () => void;
}

const Footer = React.forwardRef<FooterRef, FooterProps>(
    (
        {
            onSendMessage,
            toggleTheme,
            clearContext,
            hasContext = false,
            theme,
            isDarkTheme,
            isLoading,
            chatTitle,
            onUpdateChatTitle,
            currentChatId,
            selectedModel,
        },
        ref
    ) => {
        const [message, setMessage] = useState("");
        const [isEditingTitle, setIsEditingTitle] = useState(false);
        const [editTitleValue, setEditTitleValue] = useState("");
        const [isMagicLoading, setIsMagicLoading] = useState(false); // Estado para controlar la carga de la varita mágica
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const titleInputRef = useRef<HTMLInputElement>(null);
        const mobileDevice = typeof window !== "undefined" && isMobile();

        // Exponer el método focusTextarea al componente padre
        React.useImperativeHandle(ref, () => ({
            focusTextarea: () => {
                if (textareaRef.current && !mobileDevice) {
                    textareaRef.current.focus();
                }
            },
        }));

        // Actualizar el valor de edición cuando cambia el título
        useEffect(() => {
            if (chatTitle) {
                setEditTitleValue(chatTitle);
            }
        }, [chatTitle]);

        // Enfocar el input de título cuando se activa el modo de edición
        useEffect(() => {
            if (isEditingTitle && titleInputRef.current) {
                titleInputRef.current.focus();
            }
        }, [isEditingTitle]);

        // Ajustar el tamaño del textarea según el contenido
        const adjustTextareaHeight = () => {
            const textarea = textareaRef.current;
            if (textarea) {
                textarea.style.height = "auto";
                textarea.style.height = `${Math.min(
                    textarea.scrollHeight,
                    120
                )}px`;
            }
        };

        // Resetear el tamaño del textarea cuando se envía un mensaje
        useEffect(() => {
            if (message === "" && textareaRef.current) {
                textareaRef.current.style.height = "auto";
            }
        }, [message]);

        const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
            setMessage(e.target.value);
            adjustTextareaHeight();
        };

        const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
            // Enviar mensaje al presionar Enter (sin Shift)
            if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendMessage();
            }
        };

        const handleSendMessage = () => {
            if (message.trim() && !isLoading) {
                onSendMessage(message);
                setMessage("");

                // Cerrar el teclado en dispositivos móviles
                if (
                    mobileDevice &&
                    document.activeElement instanceof HTMLElement
                ) {
                    document.activeElement.blur();
                }
            }
        };

        // Nueva función para manejar la varita mágica
        const handleMagicButton = async () => {
            if (message.trim() && !isLoading && !isMagicLoading) {
                try {
                    setIsMagicLoading(true); // Usar el modelo proporcionado como prop o buscar en el historial de chat si no está disponible
                    let modelToUse = selectedModel || "mixtral-8x7b-32768"; // Usar el prop si está disponible, o el valor por defecto

                    // Si no se proporcionó el modelo como prop, intentar obtenerlo del historial de chat
                    if (!selectedModel && currentChatId) {
                        try {
                            const chatHistoryRaw =
                                localStorage.getItem("chat-history");
                            if (chatHistoryRaw) {
                                const chatHistoryArr =
                                    JSON.parse(chatHistoryRaw);
                                const currentChat = chatHistoryArr.find(
                                    (chat: { id: string }) =>
                                        chat.id === currentChatId
                                );
                                if (currentChat && currentChat.model) {
                                    modelToUse = currentChat.model;
                                }
                            }
                        } catch (e) {
                            console.error(
                                "Error al obtener modelo del chat:",
                                e
                            );
                        }
                    }

                    // Construir el prompt para mejorar el texto
                    const promptToSend = `Corrige y mejora la expresión en español del siguiente texto,
asegurándote de que la gramática y la sintaxis sean impecables.El texto debe ser formal, profesional, técnico, siempre amigable, sencillo y preciso. El prompt que se recupera debe ser redactado como si lo escribiera el usuario y no el asistente. Dame solo el texto corregido sin explicaciones.

Texto a mejorar:
${message}`;

                    // Realizar la petición a Groq con la misma configuración que en ChatContainer
                    const response = await axios.post(
                        "https://api.groq.com/openai/v1/chat/completions",
                        {
                            model: modelToUse,
                            messages: [
                                {
                                    role: "user",
                                    content: promptToSend,
                                },
                            ],
                            temperature: 0.7,
                            max_tokens: 2048,
                            presence_penalty: 0.1,
                        },
                        {
                            headers: {
                                "Content-Type": "application/json",
                                Authorization:
                                    "Bearer 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",
                            },
                        }
                    ); // Extraer la respuesta mejorada
                    let improvedText =
                        response.data.choices[0].message.content.trim();

                    // Filtrar el contenido entre etiquetas <think> </think>
                    improvedText = improvedText
                        .replace(/<think>[\s\S]*?<\/think>/g, "")
                        .trim();

                    // Actualizar el textarea con el texto mejorado filtrado
                    setMessage(improvedText);

                    // Ajustar altura del textarea para el nuevo contenido
                    setTimeout(adjustTextareaHeight, 0);

                    // Dar foco al textarea
                    if (textareaRef.current) {
                        textareaRef.current.focus();
                    }
                } catch (error) {
                    console.error("Error al mejorar el texto:", error);
                    // Opcionalmente, mostrar un mensaje de error al usuario
                } finally {
                    setIsMagicLoading(false);
                }
            }
        };

        // Función para limpiar el texto del textarea
        const handleClearText = () => {
            setMessage("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.focus();
            }
        };

        // Manejar inicio de edición del título
        const handleTitleClick = () => {
            if (!isLoading && chatTitle && currentChatId && onUpdateChatTitle) {
                setIsEditingTitle(true);
                setEditTitleValue(chatTitle);
            }
        };

        // Manejar cambios en el input de título
        const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
            setEditTitleValue(e.target.value);
        };

        // Manejar la finalización de la edición del título
        const handleTitleBlur = () => {
            if (editTitleValue.trim() && onUpdateChatTitle && currentChatId) {
                // Actualizar el título en el contexto del chat
                onUpdateChatTitle(editTitleValue);

                // También actualizamos en localStorage para persistencia
                try {
                    const chatHistoryRaw = localStorage.getItem("chat-history");
                    if (chatHistoryRaw) {
                        let chatHistoryArr = JSON.parse(chatHistoryRaw);
                        chatHistoryArr = chatHistoryArr.map(
                            (c: {
                                id: string;
                                title: string;
                                date: Date;
                                model?: string;
                            }) =>
                                c.id === currentChatId
                                    ? { ...c, title: editTitleValue }
                                    : c
                        );
                        localStorage.setItem(
                            "chat-history",
                            JSON.stringify(chatHistoryArr)
                        );
                    }
                } catch (error) {
                    console.error(
                        "Error al actualizar título en localStorage:",
                        error
                    );
                }
            }
            setIsEditingTitle(false);
        };

        return (
            <footer
                className="fixed bottom-0 left-0 right-0 z-50 w-full"
                style={{
                    backgroundColor: theme.background,
                    borderTop: `1px solid ${theme.accent}`,
                }}
                role="contentinfo"
                aria-label="Entrada de mensajes"
            >
                <div className="flex justify-center w-full">
                    <div className="px-4 py-2 w-full md:max-w-3xl lg:max-w-4xl xl:max-w-6xl">
                        {/* Barra de entrada de texto */}
                        <div
                            className="flex items-stretch rounded-lg border"
                            style={{
                                border: `1px solid ${theme.accent}`,
                                backgroundColor: theme.background,
                            }}
                        >
                            {/* Botón de papelera para limpiar el mensaje actual */}
                            <button
                                onClick={handleClearText}
                                title="Eliminar Prompt"
                                aria-label="Eliminar Prompt"
                                className={`rounded-l-lg flex items-center justify-center text-base touch-manipulation min-w-[48px] min-h-[48px] p-2.5 ${
                                    message.trim() && !isLoading
                                        ? "opacity-100"
                                        : "opacity-50 cursor-not-allowed"
                                }`}
                                style={{
                                    backgroundColor: theme.button.background,
                                    borderRight: `1px solid ${theme.accent}`,
                                }}
                            >
                                <img
                                    src={TrashIcon}
                                    alt="Eliminar Prompt"
                                    className="w-5 h-5"
                                    style={{
                                        filter: isDarkTheme
                                            ? "brightness(0) invert(1)"
                                            : "brightness(1) invert(0)",
                                    }}
                                />
                            </button>
                            {/* Área de texto para escribir mensajes */}
                            {/* Usar textarea para permitir múltiples líneas */}{" "}
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe un Prompt ..."
                                className="flex-grow p-3 resize-none overflow-y-auto min-h-[48px] max-h-[120px] bg-transparent text-base touch-manipulation appearance-none rounded-none"
                                style={{
                                    color: isDarkTheme
                                        ? theme.input.text
                                        : theme.text,
                                    border: "none",
                                    outline: "none",
                                    scrollbarWidth: "thin",
                                    scrollbarColor: `${theme.accent} transparent`,
                                }}
                                disabled={isLoading || isMagicLoading}
                                aria-label="Mensaje"
                                rows={1}
                            />
                            {/* Botón de varita mágica */}
                            <button
                                onClick={handleMagicButton}
                                title="Mejorar Prompt"
                                aria-label="Mejorar Prompt"
                                className={`flex items-center justify-center text-base touch-manipulation min-w-[48px] min-h-[48px] p-2.5 pr-3 ${
                                    message.trim() &&
                                    !isLoading &&
                                    !isMagicLoading
                                        ? "opacity-100"
                                        : "opacity-50 cursor-not-allowed"
                                }`}
                                style={{
                                    backgroundColor: theme.button.background,
                                    borderRight: `1px solid ${theme.background}`,
                                }}
                            >
                                {isMagicLoading ? (
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        strokeWidth="1.5"
                                        stroke="currentColor"
                                        className="w-6 h-6 animate-spin"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            d="M12 4.5v15m7.5-7.5h-15"
                                        />
                                    </svg>
                                ) : (
                                    <img
                                        src={VaritaIcon}
                                        alt="Mejorar Prompt"
                                        className="w-5 h-5"
                                        style={{
                                            filter: isDarkTheme
                                                ? "brightness(0) invert(1)"
                                                : "brightness(1) invert(0)",
                                        }}
                                    />
                                )}
                            </button>
                            {/* Botón de enviar mensaje */}
                            <button
                                onClick={handleSendMessage}
                                title="Enviar Prompt"
                                aria-label="Enviar Prompt"
                                className={`rounded-r-lg flex items-center justify-center text-base touch-manipulation min-w-[48px] min-h-[48px] p-2.5 ${
                                    message.trim() && !isLoading
                                        ? "opacity-100"
                                        : "opacity-50 cursor-not-allowed"
                                }`}
                                style={{
                                    backgroundColor: theme.button.background,
                                    borderRight: `1px solid ${theme.background}`,
                                }}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="w-6 h-6"
                                    style={{
                                        filter: isDarkTheme
                                            ? "brightness(0) invert(1)"
                                            : "brightness(1) invert(0)",
                                    }}
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                                    ></path>
                                </svg>
                            </button>
                        </div>

                        {/* Barra de herramientas */}
                        <div
                            className="flex items-stretch justify-between rounded-lg border mt-2 mb-2"
                            style={{
                                border: `1px solid ${theme.accent}`,
                                backgroundColor: theme.background,
                                height: "48px", // Misma altura que la barra de mensajes
                            }}
                        >
                            {/* Botón de escoba a la izquierda - Limpia Contexto */}
                            <div className="flex items-center">
                                
                                {clearContext && (
                                    <button
                                        title="Eliminar contexto del Chat"
                                        aria-label="Eliminar contexto del Chat"
                                        onClick={clearContext}
                                        className={`rounded-l-lg flex items-center justify-center text-base touch-manipulation min-w-[44px] min-h-[44px] p-2.5 ${
                                            hasContext
                                                ? "opacity-100"
                                                : "opacity-50 cursor-not-allowed"
                                        }`}
                                        style={{
                                            backgroundColor:
                                                theme.button.background,
                                            borderRight: `1px solid ${theme.accent}`,
                                        }}
                                    >
                                        <img
                                            src={EscobaIcon}
                                            alt="Eliminar contexto del Chat"
                                            className="w-6 h-6"
                                            style={{
                                                filter: isDarkTheme
                                                    ? "brightness(0) invert(1)"
                                                    : "brightness(1) invert(0)",
                                            }}
                                        />
                                    </button>
                                )}
                            </div>

                            {/* Título del chat - Columna central */}
                            <div className="flex items-center justify-center flex-grow">
                                {isEditingTitle ? (
                                    <input
                                        ref={titleInputRef}
                                        value={editTitleValue}
                                        onChange={handleTitleChange}
                                        onBlur={handleTitleBlur}
                                        onKeyDown={(e) => {
                                            // Evitar que la barra espaciadora haga perder el foco
                                            e.stopPropagation();

                                            if (e.key === "Enter") {
                                                handleTitleBlur();
                                            } else if (e.key === "Escape") {
                                                setIsEditingTitle(false);
                                                setEditTitleValue(
                                                    chatTitle || ""
                                                );
                                            }
                                        }}
                                        onFocus={(e) => {
                                            // Seleccionar texto al enfocar
                                            e.target.select();
                                        }}
                                        className="text-base font-medium bg-transparent text-left border-b outline-none p-2 mb-2"
                                        style={{
                                            borderColor: theme.text,
                                            color: theme.text,
                                        }}
                                        maxLength={30} // Límite máximo
                                    />
                                ) : (
                                    chatTitle && (
                                        <span
                                            className="text-base font-medium cursor-pointer truncate max-w-[240px]"
                                            style={{
                                                color: theme.text,
                                            }}
                                            onClick={handleTitleClick}
                                        >
                                            {chatTitle.length > 25
                                                ? chatTitle.split(" ")[0] +
                                                  (chatTitle.split(" ")[0]
                                                      .length < 25
                                                      ? " " +
                                                        chatTitle.substring(
                                                            chatTitle.split(
                                                                " "
                                                            )[0].length + 1,
                                                            25
                                                        ) +
                                                        "..."
                                                      : "...")
                                                : chatTitle}
                                        </span>
                                    )
                                )}
                            </div>

                            {/* Switch de tema - Columna derecha */}
                            <div className="flex items-center">
                                {/* Switch de tema con clases Tailwind */}
                                <button
                                    onClick={toggleTheme}
                                    className="relative inline-block w-[56px] h-[28px] overflow-hidden rounded-full mr-2"
                                    title="Cambiar Tema"
                                    aria-label="Cambiar entre tema claro y oscuro"
                                >
                                    <div
                                        className="absolute cursor-pointer inset-0 rounded-full transition-all duration-300"
                                        style={{
                                            backgroundColor: isDarkTheme
                                                ? theme.accent
                                                : theme.secondary,
                                        }}
                                    >
                                        {/* Círculo del switch */}
                                        <span
                                            className="absolute h-5 w-5 bg-white rounded-full z-10 transition-transform duration-300 transform"
                                            style={{
                                                top: "4px",
                                                left: "4px",
                                                transform: isDarkTheme
                                                    ? "translateX(24px)"
                                                    : "translateX(0)",
                                            }}
                                        />

                                        {/* Icono de sol (visible en tema claro) */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="absolute h-3.5 w-3.5 right-2 text-yellow-400 z-[2]"
                                            style={{
                                                top: "7px",
                                                opacity: isDarkTheme ? 0 : 1,
                                            }}
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

                                        {/* Icono de luna (visible en tema oscuro) */}
                                        <img
                                            src={LunaIcon}
                                            alt="Tema oscuro"
                                            className="absolute h-3.5 w-3.5 left-2 z-[2] text-yellow-400"
                                            style={{
                                                top: "7px",
                                                opacity: isDarkTheme ? 1 : 0,
                                            }}
                                        />
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        );
    }
);

export default Footer;

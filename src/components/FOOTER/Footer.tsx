import React, { useState, useRef, useEffect } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import { isMobile } from "../../utils/mobileUtils";
import LunaIcon from "../../assets/luna.svg";
import EscobaIcon from "../../assets/escoba.svg";

interface FooterProps {
    onSendMessage: (message: string) => void;
    toggleTheme: () => void;
    clearContext?: () => void;
    hasContext?: boolean;
    theme: ColorPalette;
    isDarkTheme: boolean;
    isLoading: boolean;
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
        },
        ref
    ) => {
        const [message, setMessage] = useState("");
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const mobileDevice = typeof window !== "undefined" && isMobile();

        // Exponer el método focusTextarea al componente padre
        React.useImperativeHandle(ref, () => ({
            focusTextarea: () => {
                if (textareaRef.current && !mobileDevice) {
                    textareaRef.current.focus();
                }
            },
        }));

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

        // Función para limpiar el texto del textarea
        const handleClearText = () => {
            setMessage("");
            if (textareaRef.current) {
                textareaRef.current.style.height = "auto";
                textareaRef.current.focus();
            }
        };

        return (
            <footer
                className="fixed bottom-0 left-0 right-0 z-50 w-full"
                style={{
                    backgroundColor: isDarkTheme
                        ? theme.background
                        : theme.secondary,
                }}
                role="contentinfo"
                aria-label="Entrada de mensajes"
            >
                <div className="flex justify-center w-full">
                    <div className="px-4 py-2 w-full md:max-w-3xl lg:max-w-4xl xl:max-w-6xl">
                        {/* Área de entrada de texto */}
                        <div
                            className="flex items-stretch rounded-lg border"
                            style={{
                                border: `1px solid ${theme.accent}`,
                                backgroundColor: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.02)",
                            }}
                        >
                            <textarea
                                ref={textareaRef}
                                value={message}
                                onChange={handleChange}
                                onKeyDown={handleKeyDown}
                                placeholder="Escribe un mensaje..."
                                className="flex-grow p-3 resize-none overflow-hidden min-h-[48px] max-h-[120px] bg-transparent rounded-l-lg text-base touch-manipulation appearance-none rounded-none"
                                style={{
                                    color: isDarkTheme
                                        ? theme.input.text
                                        : theme.input.background,
                                    border: "none",
                                    outline: "none",
                                }}
                                disabled={isLoading}
                                aria-label="Mensaje"
                                rows={1}
                            />

                            <button
                                onClick={handleSendMessage}
                                title="Enviar mensaje"
                                aria-label="Enviar mensaje"
                                className={`rounded-r-lg flex items-center justify-center text-base touch-manipulation min-w-[48px] min-h-[48px] p-2.5 ${
                                    message.trim() && !isLoading
                                        ? "opacity-100"
                                        : "opacity-50 cursor-not-allowed"
                                }`}
                                style={{
                                    backgroundColor: theme.button.background,
                                    color: theme.button.text,
                                    borderLeft: `1px solid ${theme.accent}`,
                                }}
                                disabled={!message.trim() || isLoading}
                            >
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    strokeWidth="1.5"
                                    stroke="currentColor"
                                    className="w-6 h-6"
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
                            className="grid grid-cols-3 items-center mt-2 mb-2 rounded-lg p-2"
                            style={{
                                backgroundColor: isDarkTheme
                                    ? "rgba(255, 255, 255, 0.05)"
                                    : "rgba(0, 0, 0, 0.03)",
                                border: `1px solid ${theme.accent}`,
                            }}
                        >
                            {/* Botón de papelera para limpiar el mensaje actual - Columna izquierda */}
                            <div className="justify-self-start flex items-center">
                                <button
                                    onClick={handleClearText}
                                    className={`p-1 rounded-full flex items-center justify-center transition-opacity duration-200 text-base touch-manipulation min-w-[44px] min-h-[44px] ${
                                        message.length > 0
                                            ? "opacity-100"
                                            : "opacity-50 cursor-not-allowed"
                                    }`}
                                    style={{
                                        backgroundColor:
                                            message.length > 0
                                                ? theme.button.background
                                                : isDarkTheme
                                                ? "rgba(255, 255, 255, 0.1)"
                                                : "rgba(0, 0, 0, 0.08)",
                                        color: theme.button.text,
                                    }}
                                    disabled={message.length === 0}
                                    title="Borrar mensaje"
                                    aria-label="Borrar mensaje"
                                >
                                    <svg
                                        xmlns="http://www.w3.org/2000/svg"
                                        fill="none"
                                        viewBox="0 0 24 24"
                                        stroke="currentColor"
                                        className="w-5 h-5"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="2"
                                            d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                        />
                                    </svg>
                                </button>
                            </div>

                            {/* Espacio para futuros botones o indicadores de estado - Columna central */}
                            <div className="justify-self-center flex items-center">
                                {isLoading && (
                                    <div className="flex items-center gap-1">
                                        <span className="h-2 w-2 rounded-full bg-gray-400 inline-block opacity-75 animate-typing"></span>
                                        <span className="h-2 w-2 rounded-full bg-gray-400 inline-block opacity-75 animate-typing animation-delay-[200ms]"></span>
                                        <span className="h-2 w-2 rounded-full bg-gray-400 inline-block opacity-75 animate-typing animation-delay-[400ms]"></span>
                                    </div>
                                )}
                            </div>

                            {/* Botones de utilidad - Columna derecha */}
                            <div className="justify-self-end flex items-center space-x-2">
                                {/* Botón de escoba para borrar el contexto */}
                                {clearContext && (
                                    <button
                                        onClick={clearContext}
                                        className={`p-1 rounded-full flex items-center justify-center transition-opacity duration-200 text-base touch-manipulation min-w-[44px] min-h-[44px] ${
                                            hasContext
                                                ? "opacity-100"
                                                : "opacity-50 cursor-not-allowed"
                                        }`}
                                        style={{
                                            backgroundColor: hasContext
                                                ? theme.button.background
                                                : isDarkTheme
                                                ? "rgba(255, 255, 255, 0.1)"
                                                : "rgba(0, 0, 0, 0.08)",
                                            color: theme.button.text,
                                        }}
                                        disabled={!hasContext}
                                        title="Borrar historial"
                                        aria-label="Borrar historial de conversación"
                                    >
                                        <img
                                            src={EscobaIcon}
                                            alt="Borrar historial"
                                            className="w-5 h-5"
                                            style={{
                                                filter: "brightness(0) invert(1)",
                                            }}
                                        />
                                    </button>
                                )}

                                {/* Switch de tema con clases Tailwind */}
                                <div
                                    className="relative inline-block w-[56px] h-[28px]"
                                    title="Cambiar tema"
                                >
                                    <input
                                        type="checkbox"
                                        className="opacity-0 w-0 h-0"
                                        checked={!isDarkTheme}
                                        onChange={toggleTheme}
                                        aria-label="Cambiar entre tema claro y oscuro"
                                    />
                                    <span
                                        className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full flex items-center transition-all duration-300"
                                        style={{
                                            backgroundColor: isDarkTheme
                                                ? theme.accent
                                                : theme.secondary,
                                            boxShadow: `0 0 5px ${theme.accent}`,
                                        }}
                                    >
                                        {/* Círculo del switch */}
                                        <span
                                            className={`absolute h-5 w-5 left-1 bottom-1 bg-black rounded-full z-10 transition-transform duration-300 ${
                                                !isDarkTheme
                                                    ? "transform translate-x-7"
                                                    : ""
                                            }`}
                                        ></span>

                                        {/* Icono de sol */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="absolute h-3.5 w-3.5 top-1/2 right-1.5 transform -translate-y-1/2 text-yellow-400 z-[2]"
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

                                        {/* Icono de luna */}
                                        <img
                                            src={LunaIcon}
                                            alt="Tema oscuro"
                                            className="absolute h-3.5 w-3.5 top-1/2 left-1.5 transform -translate-y-1/2 z-[2] text-yellow-400"
                                        />
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </footer>
        );
    }
);

export default Footer;

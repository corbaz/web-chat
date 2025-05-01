import React, {
    useState,
    useRef,
    useEffect,
    forwardRef,
    useImperativeHandle,
} from "react";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";
import { isMobile } from "../../utils/mobileUtils.ts";
import LunaIcon from "../../assets/luna.svg"; // Importando el ícono de luna desde el archivo SVG
import EscobaIcon from "../../assets/escoba.svg"; // Importando el ícono de escoba desde el archivo SVG

export interface MessageInputRef {
    focus: () => void;
}

interface MessageInputProps {
    onSendMessage: (message: string) => void;
    toggleTheme: () => void;
    clearContext?: () => void; // Función para borrar el historial completo (opcional)
    hasContext?: boolean; // Indica si hay mensajes en el historial para borrar
    theme: ColorPalette;
    isDarkTheme: boolean;
    isLoading: boolean;
}

const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(
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

        // Exponer el método focus para que pueda ser llamado desde el componente padre
        useImperativeHandle(ref, () => ({
            focus: () => {
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
                    150
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
            <div
                className="border-t p-3 flex flex-col bg-opacity-80"
                style={{
                    borderColor: theme.accent,
                    backgroundColor: isDarkTheme
                        ? theme.input.background
                        : theme.input.text,
                }}
            >
                {/* Área de entrada de texto */}
                <div
                    className="flex items-stretch rounded-lg border"
                    style={{ border: `1px solid ${theme.accent}` }}
                >
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        className="flex-grow p-2 md:p-3 resize-none overflow-hidden min-h-[40px] max-h-[150px] bg-transparent rounded-l-lg text-base md:text-base touch-manipulation appearance-none rounded-none"
                        style={{
                            backgroundColor: isDarkTheme
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.05)",
                            color: isDarkTheme
                                ? theme.input.text
                                : theme.input.background,
                            lineHeight: "20px",
                            paddingTop: "10px",
                            paddingBottom: "10px",
                            border: "none",
                            outline: "none",
                        }}
                        disabled={isLoading}
                    />

                    <button
                        onClick={handleSendMessage}
                        title="Enviar Pregunta"
                        className={`rounded-r-lg flex items-center justify-center text-base touch-manipulation min-w-[44px] min-h-[44px] p-2.5 ${
                            message.trim() && !isLoading
                                ? "opacity-100"
                                : "opacity-50 cursor-not-allowed"
                        }`}
                        style={{
                            backgroundColor: theme.button.background,
                            color: theme.button.text,
                            borderLeft: `1px solid ${theme.accent}`,
                            height: "auto", // Asegura que el botón tome la altura completa del contenedor
                        }}
                        disabled={!message.trim() || isLoading}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth="1.5"
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                            ></path>
                        </svg>
                    </button>
                </div>

                {/* Barra de herramientas - Convertida a grid */}
                <div
                    className="grid grid-cols-3 items-center mt-3 mb-3 rounded-lg"
                    style={{
                        backgroundColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.03)",
                        border: `1px solid ${theme.accent}`,
                        minHeight: "36px",
                        padding: "4px 8px",
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
                                width: "32px", // Tamaño fijo para ambos botones
                                height: "32px", // Tamaño fijo para ambos botones
                            }}
                            disabled={message.length === 0}
                            title="Borrar Mensaje"
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                                className="w-4 h-4 md:w-5 md:h-5"
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

                    {/* Espacio para futuros botones - Columna central */}
                    <div className="justify-self-center"></div>

                    {/* Botón de contexto (escoba) y switch de tema - Columna derecha */}
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
                                    width: "32px", // Tamaño fijo para ambos botones
                                    height: "32px", // Tamaño fijo para ambos botones
                                }}
                                disabled={!hasContext}
                                title="Borrar Contexto"
                            >
                                <img
                                    src={EscobaIcon}
                                    alt="Broom Icon"
                                    className="w-4 h-4 md:w-5 md:h-5"
                                    style={{
                                        filter: "brightness(0) invert(1)", // Para que sea blanco como el otro icono
                                        width: "20px",
                                        height: "20px",
                                    }}
                                />
                            </button>
                        )}

                        {/* Switch de tema con clases Tailwind */}
                        <div
                            className="relative inline-block w-[60px] h-[30px]"
                            title="Cambiar tema"
                        >
                            <input
                                type="checkbox"
                                className="opacity-0 w-0 h-0"
                                checked={!isDarkTheme}
                                onChange={toggleTheme}
                            />
                            <span
                                className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-[34px] flex items-center transition-all duration-400"
                                style={{
                                    backgroundColor: isDarkTheme
                                        ? theme.accent
                                        : theme.secondary,
                                    boxShadow: `0 0 5px ${theme.accent}`,
                                }}
                            >
                                {/* Círculo del switch */}
                                <span
                                    className={`absolute h-[22px] w-[22px] left-[4px] bottom-[4px] bg-black rounded-full z-10 transition-all duration-400 ${
                                        !isDarkTheme
                                            ? "transform translate-x-[30px]"
                                            : ""
                                    }`}
                                ></span>

                                {/* Icono de sol */}
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    className="absolute h-4 w-4 top-1/2 right-[7px] transform -translate-y-1/2 text-yellow-400 z-[2]"
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
                                    alt="Moon Icon"
                                    className="absolute h-4 w-4 top-1/2 left-[7px] transform -translate-y-1/2 z-[2] text-yellow-400"
                                />
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        );
    }
);

export default MessageInput;

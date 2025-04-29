import React, {
    useState,
    useRef,
    useEffect,
    forwardRef,
    useImperativeHandle,
} from "react";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";
import { isMobile } from "../../utils/mobileUtils.ts";

export interface MessageInputRef {
    focus: () => void;
}

interface MessageInputProps {
    onSendMessage: (message: string) => void;
    theme: ColorPalette;
    isDarkTheme: boolean;
    isLoading: boolean;
}

const MessageInput = forwardRef<MessageInputRef, MessageInputProps>(
    ({ onSendMessage, theme, isDarkTheme, isLoading }, ref) => {
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
                {/* Textarea para el mensaje */}
                <div className="relative flex-grow">
                    <textarea
                        ref={textareaRef}
                        value={message}
                        onChange={handleChange}
                        onKeyDown={handleKeyDown}
                        placeholder="Escribe un mensaje..."
                        className="w-full p-3 rounded-lg resize-none overflow-hidden min-h-[40px] max-h-[150px] flex items-center"
                        style={{
                            backgroundColor: isDarkTheme
                                ? "rgba(255, 255, 255, 0.1)"
                                : "rgba(0, 0, 0, 0.05)",
                            color: isDarkTheme
                                ? theme.input.text
                                : theme.input.background,
                            border: `1px solid ${theme.accent}`,
                            lineHeight: "20px", // Asegura que el texto esté centrado verticalmente
                            paddingTop: "10px", // Ajusta el padding superior para centrar mejor
                            paddingBottom: "10px", // Ajusta el padding inferior
                            paddingLeft: "12px", // Ya no necesitamos el padding extra a la izquierda
                            paddingRight: "40px", // Ajusta el padding derecho para el botón de enviar
                        }}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
                        title="Enviar Pregunta"
                        className={`absolute p-2 rounded-full flex items-center justify-center ${
                            message.trim() && !isLoading
                                ? "opacity-100"
                                : "opacity-50 cursor-not-allowed"
                        }`}
                        style={{
                            backgroundColor: theme.button.background,
                            color: theme.button.text,
                            right: "8px", // Ajuste horizontal
                            top: "50%", // Posicionar en el centro vertical
                            transform: "translateY(-50%)", // Centrar perfectamente
                        }}
                        disabled={!message.trim() || isLoading}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke-width="1.5"
                            stroke="currentColor"
                            className="w-5 h-5"
                        >
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                            ></path>
                        </svg>
                    </button>
                </div>

                {/* Barra de herramientas */}
                <div
                    className="flex items-center mt-3 p-3 rounded-lg"
                    style={{
                        backgroundColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.05)"
                            : "rgba(0, 0, 0, 0.03)",
                        border: `1px solid ${theme.accent}`, // Mismo borde que el textarea
                        height: "36px",
                    }}
                >
                    {/* Botón de limpieza en la barra de herramientas */}
                    <button
                        onClick={handleClearText}
                        className={`p-1 rounded-full flex items-center justify-center transition-opacity duration-200 ${
                            message.length > 0
                                ? "opacity-100"
                                : "opacity-50 cursor-not-allowed"
                        }`}
                        style={{
                            backgroundColor:
                                message.length > 0
                                    ? theme.button.background
                                    : isDarkTheme
                                    ? "rgba(255, 255, 255, 0.3)"
                                    : "rgba(0, 0, 0, 0.3)",
                            color: theme.button.text,
                        }}
                        disabled={message.length === 0}
                        title="Borrar mensaje"
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
                    {/* Espacio para futuros botones de herramientas */}
                    <div className="flex-grow"></div>
                </div>
            </div>
        );
    }
);

export default MessageInput;

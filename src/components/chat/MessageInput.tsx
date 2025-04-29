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
                className="border-t p-3 flex items-end bg-opacity-80"
                style={{
                    borderColor: theme.accent,
                    backgroundColor: isDarkTheme
                        ? theme.input.background
                        : theme.input.text,
                }}
            >
                <div className="relative flex-grow">
                    {/* Botón de limpieza en el lado izquierdo */}
                    {message.length > 0 && (
                        <button
                            onClick={handleClearText}
                            className="absolute p-2 rounded-full flex items-center justify-center opacity-100"
                            style={{
                                backgroundColor: theme.button.background,
                                color: theme.button.text,
                                left: "8px", // Ajuste horizontal izquierdo
                                top: "50%", // Posicionar en el centro vertical
                                transform: "translateY(-50%)", // Centrar perfectamente
                                zIndex: 10, // Asegurar que esté por encima del textarea
                            }}
                            title="Limpiar texto"
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
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                        </button>
                    )}
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
                            paddingLeft: message.length > 0 ? "48px" : "12px", // Aumentado de 40px a 48px para dar más espacio
                            paddingRight: "40px", // Ajusta el padding derecho para el botón de enviar
                        }}
                        disabled={isLoading}
                    />
                    <button
                        onClick={handleSendMessage}
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
            </div>
        );
    }
);

export default MessageInput;

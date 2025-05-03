import React, { useRef, useEffect, useState } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import { isMobile } from "../../utils/mobileUtils";

interface MessageInputProps {
    onSendMessage: (message: string) => void;
    isLoading: boolean;
    theme: ColorPalette;
    isDarkTheme: boolean;
}

const MessageInput = React.forwardRef<HTMLTextAreaElement, MessageInputProps>(
    ({ onSendMessage, isLoading, theme, isDarkTheme }, ref) => {
        const [message, setMessage] = useState("");
        const textareaRef = useRef<HTMLTextAreaElement>(null);
        const mobileDevice = typeof window !== "undefined" && isMobile();

        // Si se proporciona una ref externa, la sincronizamos con nuestra ref interna
        React.useImperativeHandle(
            ref,
            () => textareaRef.current as HTMLTextAreaElement
        );

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

        return (
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
        );
    }
);

export default MessageInput;

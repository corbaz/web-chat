import React, { useState, useRef, useEffect } from "react";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";
import { isMobile } from "../../utils/mobileUtils.ts";

interface MessageInputProps {
    onSendMessage: (message: string) => void;
    theme: ColorPalette;
    isDarkTheme: boolean;
    isLoading: boolean;
}

const MessageInput: React.FC<MessageInputProps> = ({
    onSendMessage,
    theme,
    isDarkTheme,
    isLoading,
}) => {
    const [message, setMessage] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const mobileDevice = typeof window !== "undefined" && isMobile();

    // Ajustar el tamaño del textarea según el contenido
    const adjustTextareaHeight = () => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${Math.min(textarea.scrollHeight, 150)}px`;
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
            if (mobileDevice && document.activeElement instanceof HTMLElement) {
                document.activeElement.blur();
            }
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
                <textarea
                    ref={textareaRef}
                    value={message}
                    onChange={handleChange}
                    onKeyDown={handleKeyDown}
                    placeholder="Escribe un mensaje..."
                    className="w-full p-3 pr-12 rounded-lg resize-none overflow-hidden min-h-[40px] max-h-[150px]"
                    style={{
                        backgroundColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.05)",
                        color: isDarkTheme
                            ? theme.input.text
                            : theme.input.background,
                        border: `1px solid ${theme.accent}`,
                    }}
                    disabled={isLoading}
                />
                <button
                    onClick={handleSendMessage}
                    className={`absolute right-2 bottom-2 p-2 rounded-full flex items-center justify-center ${
                        message.trim() && !isLoading
                            ? "opacity-100"
                            : "opacity-50 cursor-not-allowed"
                    }`}
                    style={{
                        backgroundColor: theme.button.background,
                        color: theme.button.text,
                    }}
                    disabled={!message.trim() || isLoading}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                        strokeWidth={1.5}
                        stroke="currentColor"
                        className="w-5 h-5"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
};

export default MessageInput;

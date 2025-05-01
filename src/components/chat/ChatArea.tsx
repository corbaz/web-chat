import React, { useRef, useEffect } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import ChatMessage from "./ChatMessage";
import { ChatMessageType } from "../../interfaces/chat/chatTypes";

interface ChatAreaProps {
    messages: ChatMessageType[];
    isLoading: boolean;
    theme: ColorPalette;
    isDarkTheme: boolean;
}

const ChatArea: React.FC<ChatAreaProps> = ({
    messages,
    isLoading,
    theme,
    isDarkTheme,
}) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Hacer scroll al último mensaje cuando se añade uno nuevo
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    return (
        <div
            className="w-full h-full overflow-y-auto px-4 py-4 space-y-4"
            style={{
                backgroundColor: isDarkTheme
                    ? "rgba(0, 0, 0, 0.2)"
                    : "rgba(255, 255, 255, 0.8)",
            }}
            aria-live="polite"
            aria-relevant="additions"
        >
            {messages.map((message) => (
                <ChatMessage
                    key={message.id}
                    message={message}
                    theme={theme}
                    isDarkTheme={isDarkTheme}
                />
            ))}

            {isLoading && (
                <div
                    className="flex justify-center items-center p-3 rounded-lg my-2"
                    style={{
                        backgroundColor: isDarkTheme
                            ? "rgba(255, 255, 255, 0.1)"
                            : "rgba(0, 0, 0, 0.05)",
                    }}
                >
                    <div className="flex items-center gap-2 p-2">
                        <span className="h-[10px] w-[10px] rounded-full bg-gray-500 inline-block opacity-60 animate-typing"></span>
                        <span className="h-[10px] w-[10px] rounded-full bg-gray-500 inline-block opacity-60 animate-typing animation-delay-[200ms]"></span>
                        <span className="h-[10px] w-[10px] rounded-full bg-gray-500 inline-block opacity-60 animate-typing animation-delay-[400ms]"></span>
                    </div>
                </div>
            )}

            {/* Elemento vacío para hacer scroll automático */}
            <div ref={messagesEndRef} />
        </div>
    );
};

export default ChatArea;

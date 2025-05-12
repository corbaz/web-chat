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
        <div className="flex justify-center w-full h-full">
            <div
                className="w-full h-full overflow-y-auto px-3 pt-5 pb-6 space-y-4 sm:pt-3 sm:pb-0 sm:px-5 md:px-8 lg:px-10 xl:px-12"
                style={{
                    backgroundColor: theme.messages.ai.background,
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
                        className="flex justify-center items-center p-3 rounded-lg my-24"
                        style={{
                            backgroundColor: theme.messages.user.background,
                        }}
                    >
                        <div className="flex items-center gap-2 p-2">
                            <span
                                className="h-[10px] w-[10px] rounded-full inline-block opacity-60 animate-typing"
                                style={{
                                    backgroundColor: theme.messages.user.text,
                                }}
                            ></span>
                            <span
                                className="h-[10px] w-[10px] rounded-full inline-block opacity-60 animate-typing animation-delay-[200ms]"
                                style={{
                                    backgroundColor: theme.messages.user.text,
                                }}
                            ></span>
                            <span
                                className="h-[10px] w-[10px] rounded-full inline-block opacity-60 animate-typing animation-delay-[400ms]"
                                style={{
                                    backgroundColor: theme.messages.user.text,
                                }}
                            ></span>
                        </div>
                    </div>
                )}

                {/* Elemento vacío para hacer scroll automático */}
                <div ref={messagesEndRef} />
            </div>
        </div>
    );
};

export default ChatArea;

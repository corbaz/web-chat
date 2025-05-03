import React from "react";
import { ChatMessageType } from "../../interfaces/chat/chatTypes";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";

interface ChatMessageProps {
    message: ChatMessageType;
    theme: ColorPalette;
    isDarkTheme: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    theme,
    isDarkTheme,
}) => {
    const isUser = message.role === "user";

    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
        >
            <div
                className={`max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-3 ${
                    isUser ? "rounded-tr-none" : "rounded-tl-none"
                }`}
                style={{
                    backgroundColor: isUser
                        ? isDarkTheme
                            ? theme.messages.user.background
                            : theme.messages.user.text
                        : isDarkTheme
                        ? theme.messages.ai.background
                        : theme.messages.ai.text,
                    color: isUser
                        ? isDarkTheme
                            ? theme.messages.user.text
                            : theme.messages.user.background
                        : isDarkTheme
                        ? theme.messages.ai.text
                        : theme.messages.ai.background,
                    boxShadow:
                        "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)",
                }}
            >
                <div className="whitespace-pre-wrap text-left">
                    {message.content}
                </div>

                {!isUser && (
                    <div className="flex flex-col space-y-1 mt-2">
                        {message.responseTime && (
                            <div className="text-xs opacity-70 text-right">
                                ⏱️ Respuesta de {message.modelName || "modelo"} en{" "}
                                {message.responseTime.replace("s", " s")}
                            </div>
                        )}

                        {message.tokensUsed !== undefined &&
                            message.tokenLimit !== undefined && (
                                <div className="text-xs opacity-70 text-right">
                                    📊 Tokens enviados: {message.tokensUsed} /{" "}
                                    {message.tokenLimit}
                                </div>
                            )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ChatMessage;

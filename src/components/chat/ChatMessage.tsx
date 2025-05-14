import React, { lazy, Suspense } from "react";
import { ChatMessageType } from "../../interfaces/chat/chatTypes";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";
import { groqModels } from "../../components/HEADER/models/groqModels";
import "./markdown-styles.css";

// Componente de markdown cargado dinámicamente
const MarkdownRenderer = lazy(() => import("./MarkdownRenderer.tsx"));

// Tipos para los props
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

    // Determinar el tema a usar según el modo claro/oscuro
    const userTheme = isDarkTheme
        ? theme.messages.user
        : {
              background: theme.messages.user.background,
              text: theme.messages.user.text,
          };

    const aiTheme = isDarkTheme
        ? theme.messages.ai
        : {
              background: theme.messages.ai.background,
              text: theme.messages.ai.text,
          };

    // Obtener el nombre corto del modelo
    const getModelShortName = (modelId?: string): string => {
        if (!modelId) return "modelo";

        const model = groqModels.find((m) => m.id === modelId);
        if (model) return model.name;

        return modelId.split("/").pop()?.split("-")[0] || "modelo";
    };

    // Formatear el tiempo de respuesta
    const formatResponseTimeToMs = (responseTime: string): string => {
        const timeInSeconds = parseFloat(responseTime.replace("s", ""));

        if (timeInSeconds < 1) {
            return `${Math.round(timeInSeconds * 1000)}ms`;
        } else {
            return responseTime;
        }
    };

    // Estilos base para los mensajes
    const messageStyles = {
        backgroundColor: isUser ? userTheme.background : aiTheme.background,
        color: isUser ? userTheme.text : aiTheme.text,
        boxShadow: isUser
            ? "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)"
            : "",
        overflowWrap: "break-word" as const,
        wordWrap: "break-word" as const,
        wordBreak: "break-word" as const,
        hyphens: "auto" as const,
    };

    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
        >
            <div
                className={`max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-3 ${
                    isUser ? "rounded-tr-none" : "rounded-tl-none"
                }`}
                style={messageStyles}
            >
                {/* Contenido del mensaje - markdown para AI, texto plano para usuario */}
                {isUser ? (
                    // Texto plano para mensajes del usuario
                    <div className="whitespace-pre-wrap text-left overflow-hidden">
                        {message.content}
                    </div> // Markdown para mensajes de IA
                ) : (
                    <div className="markdown-content">
                        <Suspense
                            fallback={
                                <div className="p-2">{message.content}</div>
                            }
                        >
                            <MarkdownRenderer content={message.content} />
                        </Suspense>
                    </div>
                )}

                {/* Metadatos para mensajes de IA */}
                {!isUser && (
                    <div className="flex flex-col space-y-1 mt-2">
                        {message.responseTime && (
                            <div className="text-xs opacity-70 text-right">
                                ⏱️ Respuesta de{" "}
                                {getModelShortName(message.modelName)} en{" "}
                                {formatResponseTimeToMs(message.responseTime)}
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

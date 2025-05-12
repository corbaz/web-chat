import React from "react";
import { ChatMessageType } from "../../interfaces/chat/chatTypes";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";
import { groqModels } from "../../components/HEADER/models/groqModels";

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

    const userTheme = isDarkTheme
        ? theme.messages.user
        : {
              background:theme.messages.user.background, 
              text: theme.messages.user.text,
          };
    const aiTheme = isDarkTheme
        ? theme.messages.ai
        : {
              background: theme.messages.ai.background,
              text: theme.messages.ai.text,
          };

    const getModelShortName = (modelId?: string): string => {
        if (!modelId) return "modelo";

        // Buscar el modelo en la lista de modelos
        const model = groqModels.find((m) => m.id === modelId);
        if (model) {
            // Usar el nombre del modelo como está definido en groqModels
            return model.name;
        }

        // Si no se encuentra, devolver solo la primera parte del ID
        return modelId.split("/").pop()?.split("-")[0] || "modelo";
    };

    const formatResponseTimeToMs = (responseTime: string): string => {
        // Extraer el valor numérico de segundos (elimina la 's' del final)
        const timeInSeconds = parseFloat(responseTime.replace("s", ""));

        // Si es menor a 1 segundo, mostrar en milisegundos
        if (timeInSeconds < 1) {
            return `${Math.round(timeInSeconds * 1000)}ms`;
        }
        // Si es igual o mayor a 1 segundo, mantener el formato original en segundos
        else {
            return responseTime;
        }
    };

    return (
        <div
            className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}
        >
            <div
                className={`max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-3 ${
                    isUser ? "rounded-tr-none" : "rounded-tl-none"
                }`}
                style={{
                    backgroundColor: isUser ? userTheme.background : aiTheme.background,
                    color: isUser ? userTheme.text : aiTheme.text,
                    boxShadow: isUser
                        ? "0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)"
                        : "",
                }}
            >
                <div className="whitespace-pre-wrap text-left">
                    {message.content}
                </div>

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

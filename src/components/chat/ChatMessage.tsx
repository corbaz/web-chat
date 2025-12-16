import React, { lazy, Suspense } from "react";
import { ChatMessageType } from "../../interfaces/chat/chatTypes.ts"; //../../interfaces/chat/chatTypes";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";
import { groqModels } from "../../components/HEADER/models/groqModels";
import { routellmModels } from "../../components/HEADER/models/routellmModels";
import { getTokenUsageString } from "../../utils/tokenUtils";
import "./markdown-styles.css";

// Componente de markdown cargado dinámicamente
const MarkdownRenderer = lazy(() => import("../chat/MarkdownRenderer.tsx"));

// Tipos para los props
interface ChatMessageProps {
  message: ChatMessageType;
  theme: ColorPalette;
  isDarkTheme: boolean;
  onRepeatMessage?: (message: string) => void; // Función para repetir mensaje
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  theme,
  isDarkTheme,
  onRepeatMessage,
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

    const model = [...groqModels, ...routellmModels].find(
      (m) => m.id === modelId,
    );
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

  // Función para copiar mensaje al portapapeles
  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (err) {
      console.error("Error al copiar mensaje:", err);
    }
  };

  // Función para repetir mensaje (pega en el input)
  const handleRepeatMessage = () => {
    if (onRepeatMessage) {
      onRepeatMessage(message.content);
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
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[80%] md:max-w-[70%] rounded-lg px-4 py-3 ${
          isUser ? "rounded-tr-none" : "rounded-tl-none"
        }`}
        style={messageStyles}
      >
        {" "}
        {/* Contenido del mensaje - markdown para todos los mensajes */}
        {isUser ? ( // Markdown para mensajes del usuario
          <div className="whitespace-pre-wrap text-left overflow-hidden markdown-content user-markdown">
            <Suspense fallback={<div className="p-2">{message.content}</div>}>
              <MarkdownRenderer content={message.content} />
            </Suspense>
          </div> // Markdown para mensajes del usuario
        ) : (
          <div className="markdown-content">
            <Suspense fallback={<div className="p-2">{message.content}</div>}>
              <MarkdownRenderer content={message.content} />
            </Suspense>
          </div>
        )}
        {/* Metadatos para mensajes de IA */}
        {!isUser && (
          <div className="flex flex-col space-y-1 mt-2">
            {message.responseTime && (
              <div className="text-xs opacity-70 text-right">
                ⏱️ Respuesta de {getModelShortName(message.modelName)} en{" "}
                {formatResponseTimeToMs(message.responseTime)}
              </div>
            )}

            {message.tokensUsed !== undefined &&
              message.tokenLimit !== undefined && (
                <div className="text-xs opacity-70 text-right">
                  📊 Tokens:{" "}
                  {getTokenUsageString(message.tokensUsed, message.tokenLimit)}
                </div>
              )}
          </div>
        )}
        {/* Botones de acciones para mensajes del usuario */}
        {isUser && (
          <div className="flex gap-2 mt-2 justify-end">
            {/* Botón copiar */}
            <button
              onClick={handleCopyMessage}
              title="Copiar pregunta"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded opacity-60 hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                color: isUser ? userTheme.text : aiTheme.text,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copiar
            </button>

            {/* Botón repetir */}
            <button
              onClick={handleRepeatMessage}
              title="Repetir pregunta"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded opacity-60 hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                color: isUser ? userTheme.text : aiTheme.text,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Repetir
            </button>
          </div>
        )}
        {/* Botón copiar para mensajes de IA */}
        {!isUser && (
          <div className="flex gap-2 mt-2 justify-end">
            {/* Botón copiar */}
            <button
              onClick={handleCopyMessage}
              title="Copiar respuesta"
              className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded opacity-60 hover:opacity-100 transition-opacity"
              style={{
                backgroundColor: isDarkTheme
                  ? "rgba(255, 255, 255, 0.1)"
                  : "rgba(0, 0, 0, 0.1)",
                color: isUser ? userTheme.text : aiTheme.text,
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                className="w-3.5 h-3.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              Copiar
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatMessage;

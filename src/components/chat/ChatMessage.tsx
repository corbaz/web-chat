import React, { lazy, Suspense } from "react";
import { ChatMessageType } from "../../interfaces/chat/chatTypes.ts";
import { ColorPalette } from "../../interfaces/temas/temas.tsx";
import { groqModels } from "../../components/HEADER/models/groqModels";
import { routellmModels } from "../../components/HEADER/models/routellmModels";
import { getTokenUsageString } from "../../utils/tokenUtils";
import "./markdown-styles.css";

const MarkdownRenderer = lazy(() => import("../chat/MarkdownRenderer.tsx"));

interface ChatMessageProps {
  message: ChatMessageType;
  theme: ColorPalette;
  isDarkTheme?: boolean;
  onRepeatMessage?: (message: string) => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
  message,
  theme,
  onRepeatMessage,
}) => {
  const isUser = message.role === "user";

  const getModelShortName = (modelId?: string): string => {
    if (!modelId) return "modelo";
    const model = [...groqModels, ...routellmModels].find(
      (m) => m.id === modelId,
    );
    if (model) return model.name;
    return modelId.split("/").pop()?.split("-")[0] || "modelo";
  };

  const formatResponseTimeToMs = (responseTime: string): string => {
    const t = parseFloat(responseTime.replace("s", ""));
    return t < 1 ? `${Math.round(t * 1000)}ms` : responseTime;
  };

  const handleCopyMessage = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
    } catch (err) {
      console.error("Error al copiar mensaje:", err);
    }
  };

  const handleRepeatMessage = () => {
    if (onRepeatMessage) onRepeatMessage(message.content);
  };

  // ── Neumorphic message styles ────────────────────────────────────────────
  const userMsgStyle: React.CSSProperties = {
    backgroundColor: theme.messages.user.background,
    color: theme.messages.user.text,
    boxShadow: theme.shadow.outer,
    borderLeft: `3px solid ${theme.accent}`,
    borderRadius: "16px 4px 16px 16px",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    hyphens: "auto",
  };

  const aiMsgStyle: React.CSSProperties = {
    backgroundColor: theme.messages.ai.background,
    color: theme.messages.ai.text,
    boxShadow: theme.shadow.inset,
    borderLeft: `3px solid ${theme.accentAlt}`,
    borderRadius: "4px 16px 16px 16px",
    overflowWrap: "break-word",
    wordBreak: "break-word",
    hyphens: "auto",
  };

  // Neumorphic action button
  const actionBtnStyle: React.CSSProperties = {
    backgroundColor: theme.background,
    color: theme.textMuted,
    boxShadow: theme.shadow.sm,
    borderRadius: "8px",
    border: "none",
    cursor: "pointer",
  };

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}>
      <div
        className="max-w-[82%] md:max-w-[72%] px-4 py-3"
        style={isUser ? userMsgStyle : aiMsgStyle}
      >
        {/* Message content */}
        <div
          className={`text-sm leading-relaxed overflow-hidden ${
            isUser
              ? "whitespace-pre-wrap text-left user-markdown"
              : "markdown-content"
          }`}
        >
          <Suspense
            fallback={<div className="p-2 opacity-60">{message.content}</div>}
          >
            <MarkdownRenderer content={message.content} />
          </Suspense>
        </div>

        {/* AI metadata */}
        {!isUser && (
          <div className="flex flex-col gap-0.5 mt-2.5">
            {message.responseTime && (
              <div
                className="text-xs text-right"
                style={{ color: theme.textMuted }}
              >
                ⏱ {getModelShortName(message.modelName)} ·{" "}
                {formatResponseTimeToMs(message.responseTime)}
              </div>
            )}
            {message.tokensUsed !== undefined &&
              message.tokenLimit !== undefined && (
                <div
                  className="text-xs text-right"
                  style={{ color: theme.textMuted }}
                >
                  📊{" "}
                  {getTokenUsageString(message.tokensUsed, message.tokenLimit)}
                </div>
              )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-1.5 mt-2.5 justify-end">
          <button
            type="button"
            onClick={handleCopyMessage}
            title="Copiar"
            className="nm-press inline-flex items-center gap-1 text-xs px-2 py-1"
            style={actionBtnStyle}
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

          {isUser && (
            <button
              type="button"
              onClick={handleRepeatMessage}
              title="Repetir pregunta"
              className="nm-press inline-flex items-center gap-1 text-xs px-2 py-1"
              style={actionBtnStyle}
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
          )}
        </div>
      </div>
    </div>
  );
};

export default ChatMessage;

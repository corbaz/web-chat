import React, { useRef, useEffect } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import ChatMessage from "../chat/ChatMessage";
import { ChatMessageType } from "../../interfaces/chat/chatTypes";

interface ChatAreaProps {
  messages: ChatMessageType[];
  isLoading: boolean;
  theme: ColorPalette;
  isDarkTheme: boolean;
  onRepeatMessage?: (message: string) => void;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  messages,
  isLoading,
  theme,
  isDarkTheme,
  onRepeatMessage,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInitialMount = useRef(true);

  // Hacer scroll al fondo absoluto cuando cambian los mensajes
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const scrollToBottom = (behavior: ScrollBehavior = "auto") => {
      // Usar un valor grande para asegurar el bottom en casos con subpíxeles o contenido async
      el.scrollTo({ top: el.scrollHeight + 1000, behavior });
    };

    if (isInitialMount.current) {
      // Dos rAF para esperar layout + pintura
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom("auto");
          isInitialMount.current = false;
        });
      });
    } else {
      scrollToBottom("smooth");
    }

    // Observa cambios de tamaño que puedan ocurrir tras render diferido (e.g. imágenes/markdown)
    const ro = new ResizeObserver(() => scrollToBottom("auto"));
    ro.observe(el);
    // Desactivar el observer poco después para evitar interferir con lectura manual
    const timeout = setTimeout(() => {
      ro.disconnect();
    }, 800);

    // Fallback adicional tras un breve tiempo
    const t2 = setTimeout(() => scrollToBottom("auto"), 120);

    return () => {
      clearTimeout(timeout);
      clearTimeout(t2);
      ro.disconnect();
    };
  }, [messages]);

  return (
    <div className="flex justify-center w-full h-full">
      <div
        className="w-full h-full overflow-y-auto px-3 pt-5 pb-6 space-y-4 sm:pt-3 sm:pb-0 sm:px-5 md:px-8 lg:px-10 xl:px-12"
        ref={containerRef}
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
            onRepeatMessage={onRepeatMessage}
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

import React, { useState, useRef, useEffect } from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import { isMobile } from "../../utils/mobileUtils";
import LunaIcon from "../../assets/luna.svg";
import EscobaIcon from "../../assets/escoba.svg";
import TrashIcon from "../../assets/trash.svg";
import VaritaIcon from "../../assets/varita_magica.svg";
import { getProviderConfig, getApiKeyStorageKey } from "../../config/providers";
import axios from "axios";

interface FooterProps {
  onSendMessage: (message: string) => void;
  toggleTheme: () => void;
  clearContext?: () => void;
  hasContext?: boolean;
  theme: ColorPalette;
  isDarkTheme: boolean;
  isLoading: boolean;
  chatTitle?: string;
  onUpdateChatTitle?: (newTitle: string) => void;
  currentChatId?: string;
  selectedModel?: string;
  selectedProvider?: string;
  onCloseMenus?: () => void;
}

export interface FooterRef {
  focusTextarea: () => void;
  setMessage: (msg: string) => void;
}

const Footer = React.forwardRef<FooterRef, FooterProps>(
  (
    {
      onSendMessage,
      toggleTheme,
      clearContext,
      hasContext = false,
      theme,
      isDarkTheme,
      isLoading,
      chatTitle,
      onUpdateChatTitle,
      currentChatId,
      selectedModel,
      selectedProvider,
      onCloseMenus,
    },
    ref,
  ) => {
    const [message, setMessage] = useState("");
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [editTitleValue, setEditTitleValue] = useState("");
    const [isMagicLoading, setIsMagicLoading] = useState(false);
    const [showMagicResponse, setShowMagicResponse] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const titleInputRef = useRef<HTMLInputElement>(null);
    const mobileDevice = typeof window !== "undefined" && isMobile();

    React.useImperativeHandle(ref, () => ({
      focusTextarea: () => {
        if (textareaRef.current && !mobileDevice) textareaRef.current.focus();
      },
      setMessage: (msg: string) => {
        setMessage(msg);
        setTimeout(() => { if (textareaRef.current) textareaRef.current.focus(); }, 50);
      },
    }));

    useEffect(() => {
      if (chatTitle) setEditTitleValue(chatTitle);
    }, [chatTitle]);

    useEffect(() => {
      if (isEditingTitle && titleInputRef.current) titleInputRef.current.focus();
    }, [isEditingTitle]);

    const adjustTextareaHeight = () => {
      const el = textareaRef.current;
      if (el) {
        el.style.height = "auto";
        el.style.height = `${Math.min(el.scrollHeight, 120)}px`;
      }
    };

    useEffect(() => {
      if (message === "" && textareaRef.current)
        textareaRef.current.style.height = "auto";
    }, [message]);

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMessage(e.target.value);
      if (showMagicResponse) setShowMagicResponse(false);
      adjustTextareaHeight();
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      const isTypingKey =
        e.key.length === 1 || ["Backspace","Delete","Enter","Space"].includes(e.key);
      if (isTypingKey && onCloseMenus) onCloseMenus();
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    };

    const handleSendMessage = () => {
      if (message.trim() && !isLoading) {
        onSendMessage(message);
        setMessage("");
        setShowMagicResponse(false);
        if (mobileDevice && document.activeElement instanceof HTMLElement)
          document.activeElement.blur();
      }
    };

    const handleMagicButton = async () => {
      if (message.trim() && !isLoading && !isMagicLoading) {
        try {
          setIsMagicLoading(true);
          let modelToUse: string = selectedModel || "llama-3.3-70b-versatile";

          if (!selectedModel && currentChatId) {
            try {
              const raw = localStorage.getItem("chat-history");
              if (raw) {
                const arr = JSON.parse(raw);
                const chat = arr.find((c: { id: string }) => c.id === currentChatId);
                if (chat?.model) modelToUse = chat.model;
              }
            } catch (e) {
              console.error("Error al obtener modelo del chat:", e);
            }
          }

          const promptToSend = `Corrige y mejora la expresión en español del siguiente texto,
asegurándote de que la gramática y la sintaxis sean impecables.El texto debe ser formal, profesional, técnico, siempre amigable, sencillo y preciso. El prompt que se recupera debe ser redactado como si lo escribiera el usuario y no el asistente. Dame solo el texto corregido sin explicaciones. En formato markdown enriquecido.

Texto a mejorar:
${message}`;

          const provider = selectedProvider || localStorage.getItem("selectedProvider") || "groq";
          const providerConfig = getProviderConfig(provider);
          if (!providerConfig) { setIsMagicLoading(false); alert(`Proveedor no configurado: ${provider}`); return; }

          const apiKey = localStorage.getItem(getApiKeyStorageKey(provider));
          if (!apiKey?.trim()) { setIsMagicLoading(false); alert(`Falta API key para ${providerConfig.name}`); return; }

          const payload = providerConfig.payloadBuilder(modelToUse, [{ role: "user", content: promptToSend }], 2048);
          const response = await axios.post(providerConfig.endpoint, payload, {
            headers: { "Content-Type": "application/json", ...providerConfig.headerAuth(apiKey) },
          });

          let improved = response.data.choices[0].message.content.trim();
          improved = improved.replace(/<think>[\s\S]*?<\/think>/g, "").trim();
          setMessage(improved);
          setShowMagicResponse(true);
          setTimeout(adjustTextareaHeight, 0);
          textareaRef.current?.focus();
        } catch (error) {
          console.error("Error en varita mágica:", error);
        } finally {
          setIsMagicLoading(false);
        }
      }
    };

    const handleClearText = () => {
      setMessage("");
      setShowMagicResponse(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
        textareaRef.current.focus();
      }
    };

    const handlePasteFromClipboard = async () => {
      try {
        const text = await navigator.clipboard.readText();
        setMessage(text);
        if (showMagicResponse) setShowMagicResponse(false);
        adjustTextareaHeight();
        textareaRef.current?.focus();
      } catch (err) {
        console.error("Error al pegar desde portapapeles:", err);
        alert("No se pudo acceder al portapapeles. Verifica los permisos.");
      }
    };

    const handleTitleClick = () => {
      if (!isLoading && chatTitle && currentChatId && onUpdateChatTitle) {
        setIsEditingTitle(true);
        setEditTitleValue(chatTitle);
      }
    };

    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      setEditTitleValue(e.target.value);
    };

    const handleTitleBlur = () => {
      if (editTitleValue.trim() && onUpdateChatTitle && currentChatId) {
        onUpdateChatTitle(editTitleValue);
        try {
          const raw = localStorage.getItem("chat-history");
          if (raw) {
            let arr = JSON.parse(raw);
            arr = arr.map((c: { id: string; title: string; date: Date; model?: string }) =>
              c.id === currentChatId ? { ...c, title: editTitleValue } : c,
            );
            localStorage.setItem("chat-history", JSON.stringify(arr));
          }
        } catch (error) {
          console.error("Error al actualizar título:", error);
        }
      }
      setIsEditingTitle(false);
    };

    // ── Shared style helpers ─────────────────────────────────────────────────
    const iconFilter = isDarkTheme ? "brightness(0) invert(1)" : "brightness(0.35)";

    const nmBtnBase: React.CSSProperties = {
      backgroundColor: theme.background,
      boxShadow: theme.shadow.outer,
      color: theme.text,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      minWidth: "44px",
      minHeight: "44px",
      padding: "10px",
      borderRadius: "12px",
      border: "none",
      cursor: "pointer",
      flexShrink: 0,
    };

    const nmBtnDisabled: React.CSSProperties = {
      ...nmBtnBase,
      opacity: 0.4,
      cursor: "not-allowed",
    };

    const nmBtnAccent: React.CSSProperties = {
      ...nmBtnBase,
      background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})`,
      boxShadow: `${theme.shadow.sm}, ${theme.shadow.accent}`,
      color: "#fff",
    };

    const nmBtnAccentDisabled: React.CSSProperties = {
      ...nmBtnBase,
      opacity: 0.4,
      cursor: "not-allowed",
      background: `linear-gradient(135deg, ${theme.accent}, ${theme.accentAlt})`,
      color: "#fff",
    };

    const canSend = message.trim() && !isLoading;
    const canMagic = message.trim() && !isLoading && !isMagicLoading;

    return (
      <footer
        className="fixed bottom-0 left-0 right-0 z-50 w-full"
        style={{
          backgroundColor: theme.background,
          boxShadow: `0 -4px 24px ${
            isDarkTheme ? "rgba(0,0,0,0.5)" : "rgba(0,0,0,0.10)"
          }`,
        }}
        role="contentinfo"
        aria-label="Entrada de mensajes"
      >
        <div className="flex justify-center w-full">
          <div className="px-4 py-3 w-full md:max-w-3xl lg:max-w-4xl xl:max-w-6xl space-y-2">

            {/* ── Input bar ─────────────────────────────────────────────────── */}
            <div
              className="flex items-center gap-2 px-2 py-2 rounded-2xl"
              style={{
                backgroundColor: theme.background,
                boxShadow: theme.shadow.inset,
              }}
            >
              {/* Clear text button */}
              <button
                type="button"
                onClick={handleClearText}
                title="Eliminar Prompt"
                aria-label="Eliminar Prompt"
                className="nm-press"
                style={canSend ? nmBtnBase : nmBtnDisabled}
                disabled={!canSend}
              >
                <img src={TrashIcon} alt="Eliminar" className="w-5 h-5" style={{ filter: iconFilter }} />
              </button>

              {/* Textarea */}
              <textarea
                ref={textareaRef}
                value={message}
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                placeholder="Escribe un Prompt ..."
                className="grow py-2 px-1 resize-none overflow-y-auto min-h-12 max-h-30 bg-transparent text-sm touch-manipulation appearance-none"
                style={{
                  color: showMagicResponse
                    ? isDarkTheme ? "#fbbf24" : "#dc2626"
                    : theme.input.text,
                  caretColor: theme.accent,
                  border: "none",
                  outline: "none",
                  scrollbarWidth: "thin",
                  scrollbarColor: `${theme.accent} transparent`,
                  lineHeight: "1.6",
                }}
                disabled={isLoading || isMagicLoading}
                aria-label="Mensaje"
                rows={1}
                onFocus={() => { if (!message.trim() && showMagicResponse) setShowMagicResponse(false); }}
              />

              {/* Paste button */}
              <button
                type="button"
                onClick={handlePasteFromClipboard}
                title="Pegar del portapapeles"
                aria-label="Pegar del portapapeles"
                className="nm-press"
                style={nmBtnBase}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth="1.5" stroke="currentColor" className="w-5 h-5"
                  style={{ color: theme.textMuted }}>
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>

              {/* Magic wand button */}
              <button
                type="button"
                onClick={handleMagicButton}
                title="Mejorar Prompt"
                aria-label="Mejorar Prompt"
                className="nm-press"
                style={canMagic ? nmBtnBase : nmBtnDisabled}
                disabled={!canMagic}
              >
                {isMagicLoading ? (
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                    strokeWidth="1.5" stroke="currentColor" className="w-5 h-5 animate-spin"
                    style={{ color: theme.accent }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                  </svg>
                ) : (
                  <img src={VaritaIcon} alt="Mejorar Prompt" className="w-5 h-5" style={{ filter: iconFilter }} />
                )}
              </button>

              {/* Send button — accent gradient */}
              <button
                type="button"
                onClick={handleSendMessage}
                title="Enviar Prompt"
                aria-label="Enviar Prompt"
                className="nm-press"
                style={canSend ? nmBtnAccent : nmBtnAccentDisabled}
                disabled={!canSend}
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                  strokeWidth="1.8" stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round"
                    d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                </svg>
              </button>
            </div>

            {/* ── Toolbar ───────────────────────────────────────────────────── */}
            <div
              className="flex items-center justify-between px-3 rounded-2xl"
              style={{
                backgroundColor: theme.background,
                boxShadow: theme.shadow.sm,
                height: "48px",
              }}
            >
              {/* Clear context (broom) */}
              <div className="flex items-center">
                {clearContext && (
                  <button
                    type="button"
                    title="Eliminar contexto del Chat"
                    aria-label="Eliminar contexto del Chat"
                    onClick={clearContext}
                    className="nm-press p-2 rounded-xl"
                    style={{
                      backgroundColor: theme.background,
                      boxShadow: hasContext ? theme.shadow.sm : "none",
                      opacity: hasContext ? 1 : 0.35,
                      cursor: hasContext ? "pointer" : "not-allowed",
                    }}
                  >
                    <img src={EscobaIcon} alt="Limpiar contexto" className="w-5 h-5"
                      style={{ filter: iconFilter }} />
                  </button>
                )}
              </div>

              {/* Chat title — center */}
              <div className="flex items-center justify-center grow px-2">
                {isEditingTitle ? (
                  <input
                    ref={titleInputRef}
                    value={editTitleValue}
                    onChange={handleTitleChange}
                    aria-label="Título del chat"
                    title="Título del chat"
                    onBlur={handleTitleBlur}
                    onKeyDown={(e) => {
                      e.stopPropagation();
                      if (e.key === "Enter") handleTitleBlur();
                      else if (e.key === "Escape") {
                        setIsEditingTitle(false);
                        setEditTitleValue(chatTitle || "");
                      }
                    }}
                    onFocus={(e) => e.target.select()}
                    className="text-sm font-semibold bg-transparent text-center border-b-2 outline-none px-2 py-0.5"
                    style={{
                      borderColor: theme.accent,
                      color: theme.accent,
                      maxWidth: "200px",
                    }}
                    maxLength={30}
                  />
                ) : (
                  chatTitle && (
                    <span
                      className="text-sm font-semibold cursor-pointer truncate max-w-60 select-none"
                      style={{ color: theme.textMuted }}
                      onClick={handleTitleClick}
                      title="Editar título"
                    >
                      {chatTitle.length > 25
                        ? chatTitle.split(" ")[0] +
                          (chatTitle.split(" ")[0].length < 25
                            ? " " + chatTitle.substring(chatTitle.split(" ")[0].length + 1, 25) + "…"
                            : "…")
                        : chatTitle}
                    </span>
                  )
                )}
              </div>

              {/* Theme toggle — neumorphic */}
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="nm-press relative inline-flex items-center w-16 h-8 rounded-full cursor-pointer"
                  title="Cambiar Tema"
                  aria-label="Cambiar entre tema claro y oscuro"
                  style={{
                    backgroundColor: theme.background,
                    boxShadow: theme.shadow.inset,
                  }}
                >
                  {/* Knob — neumorphic raised circle */}
                  <span
                    className="absolute flex items-center justify-center h-6 w-6 rounded-full transition-transform duration-300"
                    style={{
                      left: "4px",
                      transform: isDarkTheme ? "translateX(30px)" : "translateX(0)",
                      backgroundColor: theme.background,
                      boxShadow: theme.shadow.sm,
                    }}
                  >
                    {/* Sun icon (light theme) */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 transition-opacity duration-300"
                      style={{
                        opacity: isDarkTheme ? 0 : 1,
                        position: "absolute",
                        color: theme.accent,
                      }}
                      fill="none" viewBox="0 0 24 24" stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                        d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                      />
                    </svg>
                    {/* Moon icon (dark theme) */}
                    <img
                      src={LunaIcon}
                      alt="Tema oscuro"
                      className="h-3.5 w-3.5 transition-opacity duration-300"
                      style={{
                        opacity: isDarkTheme ? 1 : 0,
                        position: "absolute",
                        filter: "brightness(0) invert(1)",
                      }}
                    />
                  </span>

                  {/* Accent indicator dot */}
                  <span
                    className="absolute rounded-full transition-opacity duration-300"
                    style={{
                      width: "4px",
                      height: "4px",
                      backgroundColor: theme.accent,
                      opacity: 0.6,
                      left: isDarkTheme ? "10px" : "auto",
                      right: isDarkTheme ? "auto" : "10px",
                    }}
                  />
                </button>
              </div>
            </div>

          </div>
        </div>
      </footer>
    );
  },
);

export default Footer;

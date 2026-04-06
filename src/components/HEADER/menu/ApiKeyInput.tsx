import React, { useState, useEffect, useRef } from "react";
import { ColorPalette } from "../../../interfaces/temas/temas";

interface ApiKeyInputProps {
  theme: ColorPalette;
  isDarkTheme: boolean;
  selectedProvider?: string;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({
  theme,
  isDarkTheme,
  selectedProvider,
}) => {
  const [localProvider, setLocalProvider] = useState<string>(() => {
    return selectedProvider || localStorage.getItem("selectedProvider") || "groq";
  });
  const [userOverride, setUserOverride] = useState<boolean>(false);
  const provider = userOverride ? localProvider : selectedProvider || localProvider;

  const [apiKey, setApiKey] = useState<string>(() => {
    const initialProvider = localStorage.getItem("selectedProvider") || "groq";
    return localStorage.getItem(`${initialProvider}ApiKey`) || "";
  });
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);
  const prevProviderRef = useRef<string>(provider);

  useEffect(() => {
    if (prevProviderRef.current !== provider) {
      prevProviderRef.current = provider;
      queueMicrotask(() => {
        const savedApiKey = localStorage.getItem(`${provider}ApiKey`);
        setApiKey(savedApiKey || "");
      });
    }
  }, [provider]);

  useEffect(() => {
    const handleChange = () => {
      const savedApiKey = localStorage.getItem(`${provider}ApiKey`);
      setApiKey(savedApiKey || "");
    };
    window.addEventListener("apikey-changed", handleChange);
    return () => window.removeEventListener("apikey-changed", handleChange);
  }, [provider]);

  const handleClearApiKey = () => {
    localStorage.removeItem(`${provider}ApiKey`);
    setApiKey("");
    setIsVisible(false);
    setShowFeedback(true);
    window.dispatchEvent(new Event("apikey-changed"));
    setTimeout(() => setShowFeedback(false), 3000);
  };

  // Shared input style
  const nmInputStyle: React.CSSProperties = {
    backgroundColor: theme.input.background,
    color: theme.input.text,
    boxShadow: theme.shadow.inset,
    border: "none",
    borderRadius: "12px",
  };

  const nmSelectStyle: React.CSSProperties = {
    ...nmInputStyle,
    appearance: "none" as const,
    cursor: "pointer",
  };

  const providerName = (id: string) =>
    id === "groq" ? "Groq"
    : id === "routellm" ? "RouteLLM"
    : id === "openai" ? "OpenAI"
    : "Anthropic";

  const providerLink = (id: string) =>
    id === "groq" ? "https://console.groq.com/keys"
    : id === "routellm" ? "https://routellm.abacus.ai/"
    : id === "openai" ? "https://platform.openai.com/api-keys"
    : "https://console.anthropic.com/settings/keys";

  return (
    <div className="mb-6">
      {/* Section heading */}
      <h3
        className="text-sm font-semibold mb-3 tracking-wide uppercase"
        style={{ color: theme.accent, letterSpacing: "0.06em" }}
      >
        API Key
      </h3>

      {/* Provider selector */}
      <div className="mb-3">
        <label
          className="block text-xs font-medium mb-1.5"
          style={{ color: theme.textMuted }}
        >
          Proveedor
        </label>
        <div className="relative">
          <select
            title="Proveedor"
            aria-label="Proveedor"
            value={provider}
            onChange={(e) => {
              setLocalProvider(e.target.value);
              if (!userOverride) setUserOverride(true);
              const saved = localStorage.getItem(`${e.target.value}ApiKey`);
              setApiKey(saved || "");
              if (!saved) {
                window.dispatchEvent(
                  new CustomEvent("request-apikey-modal", {
                    detail: { provider: e.target.value },
                  }),
                );
              }
            }}
            className="w-full px-3 py-2.5 pr-8 text-sm"
            style={nmSelectStyle}
          >
            <option value="groq">Groq</option>
            <option value="routellm">RouteLLM (Abacus.AI)</option>
            <option value="openai">OpenAI</option>
            <option value="anthropic">Anthropic</option>
          </select>
          {/* Chevron */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"
            style={{ color: theme.textMuted }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </div>

      {/* API Key field */}
      <div className="space-y-2">
        <div className="relative">
          <input
            type={isVisible ? "text" : "password"}
            value={apiKey}
            readOnly
            placeholder={
              apiKey
                ? ""
                : `Sin API Key de ${providerName(provider)}`
            }
            className="w-full px-3 py-2.5 pr-10 text-sm cursor-default"
            style={{
              ...nmInputStyle,
              opacity: apiKey ? 1 : 0.55,
              color: theme.input.text,
            }}
          />
          <button
            type="button"
            onClick={() => setIsVisible(!isVisible)}
            className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 rounded-lg nm-press"
            style={{ color: theme.textMuted, backgroundColor: "transparent" }}
            title={isVisible ? "Ocultar API Key" : "Mostrar API Key"}
          >
            {isVisible ? (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88" />
              </svg>
            ) : (
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"
                strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z" />
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
            )}
          </button>
        </div>

        {/* Action buttons */}
        {apiKey ? (
          <button
            type="button"
            onClick={handleClearApiKey}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-medium nm-press"
            style={{
              backgroundColor: isDarkTheme
                ? "rgba(255, 80, 70, 0.12)"
                : "rgba(220, 38, 38, 0.08)",
              color: isDarkTheme ? "#ff7070" : "#dc2626",
              boxShadow: theme.shadow.sm,
            }}
          >
            Borrar API Key
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new CustomEvent("request-apikey-modal", { detail: { provider } }),
              );
            }}
            className="w-full px-3 py-2.5 rounded-xl text-sm font-semibold nm-press"
            style={{
              backgroundColor: theme.background,
              color: theme.accent,
              boxShadow: theme.shadow.outer,
            }}
          >
            Cargar API Key
          </button>
        )}

        {/* Feedback */}
        {showFeedback && (
          <div
            className="text-xs py-1.5 px-3 rounded-lg text-center font-medium"
            style={{
              backgroundColor: isDarkTheme
                ? "rgba(255, 80, 70, 0.12)"
                : "rgba(220, 38, 38, 0.08)",
              color: isDarkTheme ? "#ff7070" : "#dc2626",
            }}
          >
            API Key eliminada.
          </div>
        )}

        {/* Link to provider */}
        <p className="text-xs leading-relaxed" style={{ color: theme.textMuted }}>
          Obtén tu clave en{" "}
          <a
            href={providerLink(provider)}
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: theme.accent, textDecoration: "underline" }}
          >
            {providerName(provider)}
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeyInput;

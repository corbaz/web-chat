import React, { useState, useEffect } from "react";
import { ColorPalette } from "../../../interfaces/temas/temas";

interface ApiKeyInputProps {
  theme: ColorPalette;
  isDarkTheme: boolean;
}

const ApiKeyInput: React.FC<ApiKeyInputProps> = ({ theme, isDarkTheme }) => {
  const [apiKey, setApiKey] = useState<string>("");
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isSaved, setIsSaved] = useState<boolean>(false);
  const [showFeedback, setShowFeedback] = useState<boolean>(false);

  // Cargar la API key guardada al montar el componente
  useEffect(() => {
    const savedApiKey = localStorage.getItem("groqApiKey");
    if (savedApiKey) {
      setApiKey(savedApiKey);
      setIsSaved(true);
    }
  }, []);

  // Guardar la API key en localStorage
  const handleSaveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem("groqApiKey", apiKey.trim());
      setIsSaved(true);
      setShowFeedback(true);

      // Ocultar el mensaje de confirmación después de 3 segundos
      setTimeout(() => {
        setShowFeedback(false);
      }, 3000);
    }
  };

  // Limpiar la API key
  const handleClearApiKey = () => {
    localStorage.removeItem("groqApiKey");
    setApiKey("");
    setIsSaved(false);
    setIsVisible(false);
    setShowFeedback(true);

    // Ocultar el mensaje de confirmación después de 3 segundos
    setTimeout(() => {
      setShowFeedback(false);
    }, 3000);
  };

  return (
    <div className="mb-6">
      <h3
        className="text-md font-semibold mb-2"
        style={{ color: theme.title.color }}
      >
        API Key de Groq
      </h3>
      <div className="space-y-2">
        <div className="flex relative">
          <input
            type={isVisible ? "text" : "password"}
            value={apiKey}
            onChange={(e) => {
              setApiKey(e.target.value);
              setIsSaved(false);
            }}
            placeholder="Ingresa tu API Key de Groq"
            className="w-full p-2 pr-8 rounded"
            style={{
              backgroundColor: theme.input.background,
              color: theme.input.text,
              borderColor: theme.accent,
              border: `1px solid ${theme.accent}`,
            }}
          />
          <button
            onClick={() => setIsVisible(!isVisible)}
            className="absolute pl-4 right-2 top-1/2 transform -translate-y-1/2"
            style={{ color: theme.text }}
            title={isVisible ? "Ocultar API Key" : "Mostrar API Key"}
          >
            {isVisible ? (
              // Icono de ojo tachado (ocultar)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
                />
              </svg>
            ) : (
              // Icono de ojo (mostrar)
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
                className="w-5 h-5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                />
              </svg>
            )}
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={handleSaveApiKey}
            className="px-3 py-1 rounded text-sm flex-1"
            style={{
              backgroundColor: theme.button.background,
              color: theme.button.text,
            }}
          >
            Guardar API Key
          </button>
          <button
            onClick={handleClearApiKey}
            className="px-3 py-1 rounded text-sm flex-1"
            style={{
              backgroundColor: isDarkTheme
                ? "rgba(255, 59, 48, 0.2)"
                : "rgba(255, 59, 48, 0.1)",
              color: "#FF3B30",
            }}
            disabled={!apiKey}
          >
            Borrar API Key
          </button>
        </div>
        {showFeedback && (
          <div
            className="text-sm py-1 px-2 mt-1 rounded-md text-center"
            style={{
              backgroundColor: isSaved
                ? isDarkTheme
                  ? "rgba(50, 200, 100, 0.2)"
                  : "rgba(50, 200, 100, 0.1)"
                : isDarkTheme
                  ? "rgba(255, 59, 48, 0.2)"
                  : "rgba(255, 59, 48, 0.1)",
              color: isSaved ? "#32C864" : "#FF3B30",
            }}
          >
            {isSaved ? "API Key guardada correctamente." : "API Key eliminada."}
          </div>
        )}
        <p className="text-xs mt-1" style={{ color: theme.text }}>
          Para obtener tu API Key, regístrate en{" "}
          <a
            href="https://console.groq.com/keys"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: isDarkTheme ? "#8AB4F8" : "#0066CC",
              textDecoration: "underline",
            }}
          >
            console.groq.com
          </a>
        </p>
      </div>
    </div>
  );
};

export default ApiKeyInput;

import "./style.css";

import ModelSelector from "./components/ModelSelector";
import { groqModels } from "./components/models/groqModels";
import { darkTheme, lightTheme } from "./interfaces/temas/temas.tsx";
import { useRef, useState } from "react";

import { DeepChat } from "deep-chat-react";
import axios from "axios";
import { getDeepChatStyles } from "./interfaces/deepchat/estilos.tsx";

// Definimos un tipo para el ref del componente DeepChat
// Usamos una interfaz más completa basada en la documentación de DeepChat
interface DeepChatInstance {
  getMessages: () => unknown;
  submitUserMessage: (message: string) => void;
  addMessage: (message: unknown) => void;
  updateMessage: (message: unknown) => void;
  // Añadimos más métodos que podría tener el componente DeepChat
  clearMessages: () => void;
  setInputValue: (value: string) => void;
  [key: string]: unknown; // Para permitir otros métodos o propiedades que no conocemos
}

export const App = () => {
  // Usamos un tipo más específico para el ref de DeepChat
  const chatRef = useRef<DeepChatInstance | null>(null);
  const [isDarkTheme, setIsDarkTheme] = useState(true);
  const [theme, setTheme] = useState(darkTheme);
  const [key, setKey] = useState(0); // Agregar un estado para el key
  const [selectedModel, setSelectedModel] = useState(groqModels[0].id); // Modelo seleccionado por defecto

  // Obtener los estilos del DeepChat basados en el tema actual
  const deepChatStyles = getDeepChatStyles(theme);

  // Función para cambiar el tema
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    setTheme(isDarkTheme ? lightTheme : darkTheme);
    setKey(key + 1); // Actualizar el key al cambiar el tema
  };

  // Función reutilizable para hacer solicitudes a la API de Groq usando axios
  const fetchGroqResponse = async (prompt: string) => {
    try {
      const prompting = prompt + ". Contesta siempre en español";
      console.log("Enviando solicitud a Groq API con modelo:", selectedModel);

      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: selectedModel, // Usar el modelo seleccionado
          messages: [
            {
              role: "user",
              content: prompting,
            },
          ],
          temperature: 0.7, // Valor entre 0 y 2, menor valor = respuestas más deterministas
          max_completion_tokens: 2048, // Limitar la longitud de la respuesta
          presence_penalty: 0.1, // Penalizar ligeramente la repetición de temas
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer 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",
          },
        }
      );

      console.log("Respuesta recibida de Groq API");
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error fetching response from Groq:", error);

      // Manejo de errores más detallado
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // El servidor respondió con un código de estado diferente de 2xx
          console.error(
            "Error de API:",
            error.response.status,
            error.response.data
          );
          return `Error del servidor (${error.response.status}): ${
            error.response.data.error?.message || "Error desconocido"
          }`;
        } else if (error.request) {
          // La solicitud se realizó pero no se recibió respuesta
          console.error("No se recibió respuesta del servidor");
          return "Error de conexión: No se recibió respuesta del servidor. Verifica tu conexión a internet.";
        }
      }

      return "Error al obtener respuesta. Por favor, intenta de nuevo.";
    }
  };

  return (
    <div className="App" style={{ backgroundColor: theme.background }}>
      <div className="flex flex-col items-center pb-4 relative">
        <h1
          className="text-6xl font-bold text-center mb-4"
          style={{ color: theme.title.color }}
        >
          PROMPTING
        </h1>
        <div className="absolute right-0 top-0 flex items-center">
          <label className="switch">
            <input
              type="checkbox"
              checked={!isDarkTheme}
              onChange={toggleTheme}
            />
            <span
              className="slider round"
              style={{
                backgroundColor: isDarkTheme ? theme.accent : theme.secondary,
                boxShadow: `0 0 5px ${theme.accent}`,
              }}
            >
              {/* Mostrar ambos íconos permanentemente */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="sun-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                />
              </svg>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="moon-icon"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                />
              </svg>
            </span>
          </label>
        </div>
      </div>

      {/* Model selector positioned above the chat */}
      <div className="w-full flex justify-center mb-4">
        <ModelSelector
          selectedModel={selectedModel}
          onModelChange={setSelectedModel}
          theme={theme}
          isDarkTheme={isDarkTheme}
        />
      </div>

      <div className="chat-container">
        <DeepChat
          key={`${key}-${selectedModel}`}
          // Usamos una función de casting para el ref
          ref={(el) => {
            // Asignamos el elemento al ref
            chatRef.current = el as unknown as DeepChatInstance;
          }}
          style={deepChatStyles.container}
          messageStyles={deepChatStyles.messageStyles}
          textInput={deepChatStyles.textInput}
          submitButtonStyles={deepChatStyles.submitButtonStyles}
          auxiliaryStyle={deepChatStyles.auxiliaryStyle}
          connect={{
            handler: async (body: unknown, signals: unknown) => {
              try {
                // Obtener el último mensaje del usuario
                const lastUserMessage = (
                  body as { messages: Array<{ role: string; text?: string }> }
                ).messages
                  .slice()
                  .reverse()
                  .find((msg) => msg.role === "user");

                if (!lastUserMessage || !lastUserMessage.text) {
                  console.error("No se encontró un mensaje de usuario válido");
                  (
                    signals as {
                      onResponse: (response: { text: string }) => void;
                    }
                  ).onResponse({
                    text: "No se pudo procesar tu mensaje. Por favor, intenta de nuevo.",
                  });
                  return;
                }

                console.log("Mensaje del usuario:", lastUserMessage.text);

                // Usar la función reutilizable para obtener la respuesta
                const responseText = await fetchGroqResponse(
                  lastUserMessage.text
                );

                console.log("Respuesta recibida:", responseText);

                // Usar signals.onResponse para enviar la respuesta a DeepChat
                (
                  signals as {
                    onResponse: (response: { text: string }) => void;
                  }
                ).onResponse({ text: responseText });
              } catch (error) {
                console.error("Error en el handler de connect:", error);
                (
                  signals as {
                    onResponse: (response: { text: string }) => void;
                  }
                ).onResponse({
                  text: "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.",
                });
              }
            },
          }}
        />
      </div>
    </div>
  );
};

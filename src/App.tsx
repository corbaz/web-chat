import { DeepChat } from "deep-chat-react";
import { useRef, useState } from "react";
import axios from "axios";
import "./style.css";
import { colorPalette, lightTheme, darkTheme } from "./interfaces/temas/temas.tsx";
import { getDeepChatStyles } from "./interfaces/deepchat/estilos.tsx";

export const App = () => {
  const chatRef = useRef(null);
  const [isDarkTheme, setIsDarkTheme] = useState(false);
  const [theme, setTheme] = useState(colorPalette);
  
  // Obtener los estilos del DeepChat basados en el tema actual
  const deepChatStyles = getDeepChatStyles(theme);

  // Función para cambiar el tema
  const toggleTheme = () => {
    setIsDarkTheme(!isDarkTheme);
    setTheme(isDarkTheme ? lightTheme : darkTheme);
  };

  // Función reutilizable para hacer solicitudes a la API de Groq usando axios
  const fetchGroqResponse = async (prompt: string) => {
    try {
      const prompting = prompt + ". Contesta siempre en español";
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompting,
            },
          ],
        },
        {
          headers: {
            "Content-Type": "application/json",
            Authorization:
              "Bearer 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",
          },
        }
      );
      return response.data.choices[0].message.content;
    } catch (error) {
      console.error("Error fetching response from Groq:", error);
      return "Error al obtener respuesta. Por favor, intenta de nuevo.";
    }
  };

  return (
    <div className="App" style={{ backgroundColor: theme.background }}>
      <div className="flex flex-col items-center pb-4 relative">
        <h1 className="text-6xl font-bold text-center mb-4" style={{ color: theme.title.color }}>
          PROMPTING
        </h1>
        <div className="absolute right-0 top-0">
          <label className="switch">
            <input type="checkbox" checked={isDarkTheme} onChange={toggleTheme} />
            <span className="slider round" style={{ 
              backgroundColor: isDarkTheme ? theme.accent : theme.secondary,
              boxShadow: `0 0 5px ${theme.accent}`
            }}>
              {isDarkTheme ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="moon-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="sun-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
            </span>
          </label>
        </div>
      </div>
      <DeepChat
        ref={chatRef}
        style={deepChatStyles.container}
        messageStyles={deepChatStyles.messageStyles}
        textInput={deepChatStyles.textInput}
        submitButtonStyles={deepChatStyles.submitButtonStyles}
        auxiliaryStyle={deepChatStyles.auxiliaryStyle}
        connect={{
          handler: async (body: { messages: any[] }, signals: any) => {
            try {
              // Obtener el último mensaje del usuario
              const lastUserMessage = body.messages
                .slice()
                .reverse()
                .find((msg) => msg.role === "user");

              if (!lastUserMessage || !lastUserMessage.text) {
                console.error("No se encontró un mensaje de usuario válido");
                signals.onResponse({
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
              signals.onResponse({ text: responseText });
            } catch (error) {
              console.error("Error en el handler de connect:", error);
              signals.onResponse({
                text: "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo.",
              });
            }
          },
        }}
      />
    </div>
  );
};
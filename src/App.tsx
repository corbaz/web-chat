import { DeepChat } from "deep-chat-react";
import { useRef } from "react";
import axios from "axios";
import "./style.css";

export const App = () => {
  const chatRef = useRef(null);

  // Función reutilizable para hacer solicitudes a la API de Groq usando axios
  const fetchGroqResponse = async (prompt: string) => {
    try {
      //console.log("Enviando solicitud a Groq con prompt:", prompt);
      const response = await axios.post(
        "https://api.groq.com/openai/v1/chat/completions",
        {
          model: "llama-3.3-70b-versatile",
          messages: [
            {
              role: "user",
              content: prompt,
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
    <div className="App">
      <h1 className="text-6xl font-bold underline pb-4">WEB-CHAT</h1>
      <DeepChat
        ref={chatRef}
        style={{
          borderRadius: "10px",
          border: "unset",
          backgroundColor: "#292929",
          width: "600px",
          height: "500px",
        }}
        messageStyles={{
          default: {
            ai: {
              bubble: {
                backgroundColor: "#4a4e59",
                color: "white",
              },
            },
            user: {
              bubble: {
                background:
                  "linear-gradient(180deg, rgba(255,166,0,1) 0%, rgba(225,71,71,1) 100%)",
                color: "white",
              },
            },
          },
          loading: {
            message: {
              styles: {
                bubble: {
                  backgroundColor: "#4a4e59",
                  color: "white",
                },
              },
            },
          },
        }}
        textInput={{
          styles: {
            container: {
              backgroundColor: "#666666",
              border: "unset",
              color: "#e8e8e8",
            },
          },
          placeholder: {
            text: "Prompt:",
            style: {
              color: "#bcbcbc",
            },
          },
        }}
        submitButtonStyles={{
          submit: {
            container: {
              default: {
                bottom: "0.7rem",
              },
            },
            svg: {
              styles: {
                default: {
                  filter:
                    "brightness(0) saturate(100%) invert(38%) sepia(100%) saturate(577%) hue-rotate(343deg) brightness(100%) contrast(103%)",
                },
              },
            },
          },
        }}
        auxiliaryStyle={`
          ::-webkit-scrollbar {
            width: 10px;
            height: 10px;
          }
          ::-webkit-scrollbar-thumb {
            background-color: grey;
            border-radius: 5px;
          }
          ::-webkit-scrollbar-track {
            background-color: unset;
          }
        `}
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
                  text: "No se pudo procesar tu mensaje. Por favor, intenta de nuevo." 
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
                text: "Ocurrió un error al procesar tu solicitud. Por favor, intenta de nuevo." 
              });
            }
          },
        }}
      />
    </div>
  );
};

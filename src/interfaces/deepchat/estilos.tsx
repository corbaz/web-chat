// Importamos la interfaz ColorPalette desde el archivo de temas

import { ColorPalette } from "../temas/temas";

// Interfaz para los estilos del componente DeepChat
export interface DeepChatStyles {
    container: React.CSSProperties;
    messageStyles: Record<string, unknown>;
    textInput: Record<string, unknown>;
    submitButtonStyles: Record<string, unknown>;
    auxiliaryStyle: string;
}

// Función para generar los estilos del DeepChat basados en el tema actual
export const getDeepChatStyles = (theme: ColorPalette): DeepChatStyles => {
    return {
        container: {
            borderRadius: "10px",
            border: theme.chat.border,
            backgroundColor: theme.chat.background,
            width: "100%",
            height: "100%",
            overflow: "hidden",
        },
        messageStyles: {
            default: {
                shared: {},
                ai: {
                    bubble: {
                        backgroundColor: theme.messages.ai.background,
                        color: theme.messages.ai.text,
                        width: "calc(100% - 32px)", // Ancho completo menos el margen
                        marginLeft: "16px",
                        marginRight: "16px",
                        borderRadius: "10px",
                        padding: "16px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    },
                    container: {
                        width: "100%", // Contenedor a ancho completo
                        padding: "0",
                        margin: "8px 0",
                    },
                },
                user: {
                    bubble: {
                        backgroundColor: theme.messages.user.background,
                        color: theme.messages.user.text,
                        borderRadius: "10px",
                        padding: "12px",
                        boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
                    },
                },
            },
            loading: {
                message: {
                    styles: {
                        bubble: {
                            backgroundColor: theme.messages.loading.background,
                            color: theme.messages.loading.text,
                        },
                    },
                },
            },
        },
        textInput: {
            styles: {
                container: {
                    backgroundColor: theme.input.background,
                    border: "unset",
                    color: "white",
                    width: "100%",
                    height: "100%",
                    overflow: "hidden",
                    padding: "16px",
                    margin: "16px",
                },
                hover: {
                    backgroundColor: "cyan",
                },
            },
            placeholder: {
                text: "Prompt:",
                style: {
                    color: theme.input.placeholder,
                    fontWeight: "bold",
                },
            },
        },
        submitButtonStyles: {
            submit: {
                container: {
                    default: {
                        bottom: "-5px",
                        right: "65px",
                        width: "100%",
                        height: "100%",
                    },
                },
                svg: {
                    styles: {
                        default: {
                            filter: theme.button.filter,
                        },
                    },
                },
            },
        },
        auxiliaryStyle: `
      ::-webkit-scrollbar {
        width: 10px;
        height: 10px;
      }
      ::-webkit-scrollbar-thumb {
        background-color: ${theme.scrollbar.thumb};
        border-radius: 5px;
      }
      ::-webkit-scrollbar-track {
        background-color: ${theme.scrollbar.track};
      }

      /* Estilo para que las respuestas del AI ocupen todo el ancho */
      .dc-message-ai {
        width: 100% !important;
        justify-content: flex-start !important;
        padding: 0 !important;
        margin-bottom: 16px !important;
      }

      .dc-message-ai .dc-message-content {
        width: calc(100% - 32px) !important;
        margin-left: 16px !important;
        margin-right: 16px !important;
        max-width: none !important;
        border-radius: 10px !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
      }

      /* Mantener el estilo original para los mensajes del usuario */
      .dc-message-user {
        justify-content: flex-end !important;
        padding: 0 16px !important;
        margin-bottom: 16px !important;
      }

      .dc-message-user .dc-message-content {
        max-width: 80% !important;
        border-radius: 10px !important;
        box-shadow: 0 2px 6px rgba(0,0,0,0.1) !important;
      }

      /* Asegurar que el contenedor de mensajes tenga el padding correcto */
      .dc-messages-container {
        padding: 8px 0 !important;
        overflow-y: auto !important;
      }

      /* Estilo para el input */
      .dc-input-container {
        padding: 0 16px 16px 16px !important;
        background-color: ${theme.chat.background} !important;
        border-top: 1px solid rgba(0,0,0,0.05) !important;
      }

      .dc-text-input {
        border-radius: 10px !important;
        padding: 12px !important;
        font-size: 16px !important;
        background-color: ${theme.input.background} !important;
        color: ${theme.input.text} !important;
      }

      /* Mejorar el estilo del botón de envío */
      .dc-send-button-container {
        margin-right: 8px !important;
      }

      /* Estilo para el texto dentro de los mensajes */
      .dc-message-content p {
        margin: 0 0 8px 0 !important;
      }

      .dc-message-content p:last-child {
        margin-bottom: 0 !important;
      }

      /* Mejoras para dispositivos móviles */
      @media (max-width: 768px) {
        .dc-text-input {
          font-size: 16px !important; /* Evita el zoom automático en iOS */
          -webkit-appearance: none !important; /* Mejora la apariencia en iOS */
        }

        /* Ajustar el tamaño del botón de envío en móviles */
        .dc-send-button-container button {
          padding: 8px !important;
          min-width: 40px !important; /* Asegurar que sea suficientemente grande para tocar */
          min-height: 40px !important;
        }

        /* Asegurar que el input tenga suficiente espacio para escribir */
        .dc-input-container {
          padding: 0 12px 12px 12px !important;
        }

        /* Mejorar la interacción táctil */
        .dc-send-button-container button,
        .dc-text-input {
          touch-action: manipulation !important; /* Previene el zoom al tocar */
        }
      }

      /* Script para cerrar el teclado después de enviar */
      document.addEventListener('DOMContentLoaded', function() {
        // Función para cerrar el teclado
        function closeKeyboard() {
          // Desenfocar cualquier elemento activo para cerrar el teclado
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }

          // Solución específica para iOS
          const tempInput = document.createElement('input');
          tempInput.style.position = 'absolute';
          tempInput.style.opacity = '0';
          tempInput.style.height = '0';
          tempInput.style.fontSize = '16px';
          tempInput.style.webkitAppearance = 'none';
          document.body.appendChild(tempInput);
          tempInput.focus();
          tempInput.blur();
          document.body.removeChild(tempInput);

          // Solución específica para Android
          if (navigator.userAgent.match(/Android/i)) {
            document.documentElement.style.height = '100%';
            setTimeout(() => {
              document.documentElement.style.height = '';
            }, 100);
          }
        }

        // Observar cambios en el DOM para detectar cuando se añade el botón de envío
        const observer = new MutationObserver(function() {
          const sendButton = document.querySelector('.dc-send-button-container button');
          const textInput = document.querySelector('.dc-text-input');

          if (sendButton && !sendButton.hasAttribute('data-keyboard-handler')) {
            sendButton.setAttribute('data-keyboard-handler', 'true');

            // Evento para click normal
            sendButton.addEventListener('click', closeKeyboard);

            // Eventos específicos para móviles
            sendButton.addEventListener('touchstart', function(e) {
              // Prevenir comportamiento predeterminado
              e.preventDefault();
              closeKeyboard();
              // Simular clic después de cerrar el teclado
              setTimeout(() => {
                sendButton.click();
              }, 50);
            });

            observer.disconnect();
          }

          // También configurar el input si existe
          if (textInput && !textInput.hasAttribute('data-keyboard-handler')) {
            textInput.setAttribute('data-keyboard-handler', 'true');

            // Evento para tecla Enter
            textInput.addEventListener('keydown', function(e) {
              if (e.key === 'Enter' && !e.shiftKey) {
                setTimeout(closeKeyboard, 50);
              }
            });
          }
        });

        // Comenzar a observar el documento con la configuración establecida
        observer.observe(document.body, { childList: true, subtree: true });

        // Configurar un observador para cuando se recargue el componente
        setInterval(() => {
          const sendButton = document.querySelector('.dc-send-button-container button');
          if (sendButton && !sendButton.hasAttribute('data-keyboard-handler')) {
            sendButton.setAttribute('data-keyboard-handler', 'true');
            sendButton.addEventListener('click', closeKeyboard);
            sendButton.addEventListener('touchstart', function(e) {
              e.preventDefault();
              closeKeyboard();
              setTimeout(() => {
                sendButton.click();
              }, 50);
            });
          }

          // También verificar el input
          const textInput = document.querySelector('.dc-text-input');
          if (textInput && !textInput.hasAttribute('data-keyboard-handler')) {
            textInput.setAttribute('data-keyboard-handler', 'true');
            textInput.addEventListener('keydown', function(e) {
              if (e.key === 'Enter' && !e.shiftKey) {
                setTimeout(closeKeyboard, 50);
              }
            });
          }
        }, 1000);
      });
    `,
    };
};

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
            width: "100%",
            height: "100%",
          },
        },
        user: {
          bubble: {
            backgroundColor: theme.messages.user.background,
            color: theme.messages.user.text,
            width: "100%",
            height: "100%",
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
          color: theme.input.text,
          width: "100%",
          height: "100%",
          overflow: "hidden",
          padding: "16px",
          margin: "16px",
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
    `,
  };
}
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
                    color: theme.input.text,
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
        auxiliaryStyle: ``,
    };
};

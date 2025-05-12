// Interfaz para los colores de la aplicación
export interface ColorPalette {
    // Colores principales
    primary: string;
    secondary: string;
    accent: string;
    background: string;
    text: string;

    // Colores específicos para componentes
    title: {
        color: string;
    };
    chat: {
        background: string;
        border: string;
    };
    messages: {
        ai: {
            background: string;
            text: string;
        };
        user: {
            background: string;
            text: string;
        };
        loading: {
            background: string;
            text: string;
        };
    };
    input: {
        background: string;
        text: string;
        placeholder: string;
    };
    scrollbar: {
        thumb: string;
        track: string;
    };
    button: {
        background: string;
        text: string;
    };
    selectModel: {
        background: string;
        text: string;
        empresaBackground: string;
        empresaText: string;
        isSelectedBackground: string;
        isSelectedText: string;
        modelBackground: string;
        modelText: string;
        hoverBackground?: string; // Color de fondo al pasar el mouse
        hoverText?: string; // Color de texto al pasar el mouse
    };
}

// Tema claro estilo ChatGPT
export const lightTheme: ColorPalette = {
    // Colores principales basados en ChatGPT tema claro
    primary: "#202123", // Color oscuro para texto principal
    secondary: "#f7f7f8", // Color de fondo secundario
    accent: "#ececf1", // Color de acento para bordes
    background: "#ffffff", // Fondo blanco
    text: "#343541", // Texto principal

    // Colores específicos para componentes
    title: {
        color: "#202123", // Color oscuro para el título
    },
    chat: {
        background: "#ffffff", // Fondo blanco para chat
        border: "1px solid #ececf1", // Borde sutil en tono gris
    },
    messages: {
        user: {
            background: "#f4f4f4", // Fondo blanco para mensajes usuario
            text: "#0d0d0d", // Texto oscuro para contraste
        },
        ai: {
            background: "#ffffff", // Gris muy claro para mensajes AI
            text: "#0d0d0d", // Texto oscuro para contraste
        },
        loading: {
            background: "#f4f4f4", // Gris claro para indicador de carga
            text: "#0d0d0d", // Texto gris oscuro
        },
    },
    input: {
        background: "#f4f4f4", // Fondo blanco para input
        text: "#0d0d0d", // Texto oscuro
        placeholder: "#8e8ea0", // Gris para placeholder
    },
    scrollbar: {
        thumb: "#c5c5d2", // Gris medio para scrollbar
        track: "#f7f7f8", // Gris claro para track
    },
    button: {
        background: "#ececf1", // Gris claro para botones
        text: "#343541", // Texto oscuro para botones
    },
    selectModel: {
        background: "#f4f4f4", // Fondo blanco para el selector de modelos
        text: "#0d0d0d", // Texto oscuro para el selector de modelos
        empresaBackground: "#0d0d0d", // Fondo blanco para el selector de modelos
        empresaText: "#f4f4f4", // Texto oscuro para el selector de modelos
        isSelectedBackground: "#8e8ea0", // Estado de selección
        isSelectedText: "#f4f4f4", // Texto azul para el estado de selección
        modelBackground: "#f4f4f4", // Fondo verde para el modelo
        modelText: "#0d0d0d", // Texto amarillo para el modelo
        hoverBackground: "#343541", // Color de fondo al pasar el mouse
        hoverText: "#f4f4f4", // Color de texto al pasar el mouse
    },
};

// Tema oscuro estilo ChatGPT
export const darkTheme: ColorPalette = {
    selectModel: {
        background: "#2f2f2f", // Fondo gris oscuro para el selector de modelos
        text: "#ffffff", // Texto blanco para el selector de modelos
        empresaBackground: "#2f2f2f", // Fondo gris oscuro para el selector de modelos
        empresaText: "#ffffff", // Texto blanco para el selector de modelos
        isSelectedBackground: "#0d0d0d", // Estado de selección
        isSelectedText: "#f4f4f4", // Texto blanco para el estado de selección
        modelBackground: "#f4f4f4", // Fondo gris claro para el modelo
        modelText: "#0d0d0d", // Texto oscuro para el modelo
        hoverBackground: "#8e8ea0", // Color de fondo al pasar el mouse
        hoverText: "#ffffff", // Color de texto al pasar el mouse
    },
    // Colores principales basados en ChatGPT tema oscuro
    primary: "#ffffff", // Color blanco para texto principal
    secondary: "#343541", // Color de fondo secundario
    accent: "#444654", // Color de acento para bordes
    background: "#171717", // Fondo gris oscuro, más cercano a ChatGPT
    text: "#ffffff", // Texto blanco

    // Colores específicos para componentes
    title: {
        color: "#ffffff", // Color blanco para el título
    },
    chat: {
        background: "red", // Fondo gris oscuro para el chat
        border: "1px solid #2a2b32", // Borde sutil en tono oscuro
    },
    messages: {
        user: {
            background: "#2f2f2f", // Fondo blanco para mensajes usuario
            text: "#ffffff", // Texto oscuro para contraste
        },
        ai: {
            background: "#212121", // Gris muy claro para mensajes AI
            text: "#ffffff", // Texto oscuro para contraste
        },
        loading: {
            background: "#2f2f2f", // Gris oscuro para carga
            text: "#ffffff", // Texto blanco
        },
    },
    input: {
        background: "#2f2f2f", // Fondo gris oscuro para input
        text: "#ffffff", // Texto blanco
        placeholder: "#8e8ea0", // Gris claro para placeholder
    },
    scrollbar: {
        thumb: "#565869", // Gris medio para scrollbar
        track: "#343541", // Gris oscuro para track
    },
    button: {
        background: "#444654", // Gris azulado para botones
        text: "#ffffff", // Texto blanco para botones
    },
};

// Exportar el tema oscuro como predeterminado
export const colorPalette = darkTheme;

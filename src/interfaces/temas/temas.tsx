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
        ai: {
            background: "#f7f7f8", // Gris muy claro para mensajes AI
            text: "#343541", // Texto oscuro para contraste
        },
        user: {
            background: "#ffffff", // Fondo blanco para mensajes usuario
            text: "#343541", // Texto oscuro para contraste
        },
        loading: {
            background: "#f7f7f8", // Gris claro para indicador de carga
            text: "#40414f", // Texto gris oscuro
        },
    },
    input: {
        background: "#ffffff", // Fondo blanco para input
        text: "#343541", // Texto oscuro
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
};

// Tema oscuro estilo ChatGPT
export const darkTheme: ColorPalette = {
    // Colores principales basados en ChatGPT tema oscuro
    primary: "#ffffff", // Color blanco para texto principal
    secondary: "#343541", // Color de fondo secundario
    accent: "#444654", // Color de acento para bordes
    background: "#202123", // Fondo gris oscuro, más cercano a ChatGPT
    text: "#ffffff", // Texto blanco

    // Colores específicos para componentes
    title: {
        color: "#ffffff", // Color blanco para el título
    },
    chat: {
        background: "#202123", // Fondo gris oscuro para el chat
        border: "1px solid #2a2b32", // Borde sutil en tono oscuro
    },
    messages: {
        ai: {
            background: "#444654", // Gris oscuro para mensajes AI
            text: "#ffffff", // Texto blanco
        },
        user: {
            background: "#343541", // Gris azulado para mensajes usuario
            text: "#ffffff", // Texto blanco
        },
        loading: {
            background: "#444654", // Gris oscuro para carga
            text: "#ffffff", // Texto blanco
        },
    },
    input: {
        background: "#343541", // Fondo gris oscuro para input
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

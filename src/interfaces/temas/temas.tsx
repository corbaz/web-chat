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
        filter: string;
    };
}

// Tema claro con colores pastel
export const lightTheme: ColorPalette = {
    // Colores principales
    primary: "#f0c5e8", // Rosa pastel
    secondary: "#b8e1ff", // Azul pastel
    accent: "#ffd6a5", // Naranja pastel
    background: "#f9f9f9", // Fondo claro
    text: "#4a4a4a", // Texto oscuro

    // Colores específicos para componentes
    title: {
        color: "#ffb6c1", // Rosa pastel para el título
    },
    chat: {
        background: "#f0f0f0", // Fondo gris claro para el chat
        border: "unset",
    },
    messages: {
        ai: {
            background: "#d0f0c0", // Verde pastel para mensajes AI
            text: "#4a4a4a", // Texto oscuro
        },
        user: {
            background: "#ffcccb", // Rojo pastel para mensajes usuario
            text: "#4a4a4a", // Texto oscuro
        },
        loading: {
            background: "#fffacd", // Amarillo pastel para carga
            text: "#4a4a4a", // Texto oscuro
        },
    },
    input: {
        background: "#e0f7fa", // Cian pastel para el input
        text: "#4a4a4a", // Texto oscuro
        placeholder: "#757575", // Gris para placeholder
    },
    scrollbar: {
        thumb: "#c9c9c9", // Gris claro para scrollbar
        track: "transparent", // Transparente para track
    },
    button: {
        filter: "brightness(0) saturate(100%) invert(38%) sepia(100%) saturate(577%) hue-rotate(343deg) brightness(100%) contrast(103%)",
    },
};

// Tema oscuro futurista
export const darkTheme: ColorPalette = {
    // Colores principales
    primary: "#6e00ff", // Púrpura neón
    secondary: "#00b8ff", // Azul neón
    accent: "#ff5722", // Naranja futurista
    background: "#121212", // Fondo muy oscuro
    text: "#e0e0e0", // Texto claro

    // Colores específicos para componentes
    title: {
        color: "#ff00ff", // Magenta neón para el título
    },
    chat: {
        background: "#1e1e1e", // Fondo oscuro para el chat
        border: "unset",
    },
    messages: {
        ai: {
            background: "yellow", // Verde oscuro para mensajes AI
            text: "black", // Texto claro
        },
        user: {
            background: "#4a148c", // Púrpura oscuro para mensajes usuario
            text: "#e0e0e0", // Texto claro
        },
        loading: {
            background: "#ff6f00", // Ámbar para carga
            text: "#121212", // Texto oscuro
        },
    },
    input: {
        background: "#263238", // Azul grisáceo oscuro para el input
        text: "white", // Texto claro
        placeholder: "yellow", // Gris para placeholder
    },
    scrollbar: {
        thumb: "#424242", // Gris oscuro para scrollbar
        track: "transparent", // Transparente para track
    },
    button: {
        filter: "brightness(0) saturate(100%) invert(80%) sepia(54%) saturate(5127%) hue-rotate(242deg) brightness(101%) contrast(101%)",
    },
};

// Exportar el tema claro como predeterminado
export const colorPalette = lightTheme;

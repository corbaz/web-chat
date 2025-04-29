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
        background: string;
        text: string;
    };
}

// Tema claro con colores pastel
export const lightTheme: ColorPalette = {
    // Colores principales de la nueva paleta pastel
    primary: "#5885a2", // Azul grisáceo
    secondary: "#b8a0c9", // Lila/púrpura claro
    accent: "#94cfd5", // Turquesa/azul claro
    background: "#f1e5ea", // Rosa muy pálido
    text: "#5b4d6b", // Púrpura grisáceo

    // Colores específicos para componentes
    title: {
        color: "#b8a0c9", // Lila/púrpura claro para el título
    },
    chat: {
        background: "#f1e5ea", // Fondo rosa muy pálido
        border: "1px solid #e7d9e3", // Borde sutil en tono rosa
    },
    messages: {
        ai: {
            background: "#5885a2", // Azul grisáceo para mensajes AI
            text: "#ffffff", // Texto blanco para contraste
        },
        user: {
            background: "#b8a0c9", // Lila/púrpura claro para mensajes usuario
            text: "#ffffff", // Texto blanco para contraste
        },
        loading: {
            background: "#94cfd5", // Turquesa/azul claro para carga
            text: "#5b4d6b", // Texto púrpura grisáceo
        },
    },
    input: {
        background: "#f9f3f7", // Fondo rosa muy pálido
        text: "#5b4d6b", // Texto púrpura grisáceo
        placeholder: "#a390b4", // Púrpura claro para placeholder
    },
    scrollbar: {
        thumb: "#b8a0c9", // Lila/púrpura claro para scrollbar
        track: "#f1e5ea", // Rosa muy pálido para track
    },
    button: {
        filter: "invert(55%) sepia(9%) saturate(1083%) hue-rotate(222deg) brightness(88%) contrast(87%)", // Filtro para botones en tono púrpura
        background: "#b8a0c9", // Lila/púrpura claro para botones
        text: "#ffffff", // Texto blanco para contraste
    },
};

// Tema oscuro con paleta púrpura
export const darkTheme: ColorPalette = {
    // Colores principales de la paleta púrpura
    primary: "#b365d3", // Púrpura brillante
    secondary: "#5885a2", // Azul grisáceo
    accent: "#8060a9", // Púrpura medio
    background: "#2c1b47", // Azul marino oscuro
    text: "#ffffff", // Texto blanco

    // Colores específicos para componentes
    title: {
        color: "#b365d3", // Púrpura brillante para el título
    },
    chat: {
        background: "#2c1b47", // Púrpura muy oscuro para el fondo del chat
        border: "1px solid #3d2963", // Borde sutil en tono púrpura
    },
    messages: {
        ai: {
            background: "#5885a2", // Azul grisáceo para mensajes AI
            text: "#ffffff", // Texto blanco
        },
        user: {
            background: "#8060a9", // Púrpura medio para mensajes usuario
            text: "#ffffff", // Texto blanco
        },
        loading: {
            background: "#493173", // Púrpura oscuro para la carga
            text: "#ffffff", // Texto blanco
        },
    },
    input: {
        background: "#2c1b47", // Púrpura muy oscuro para el input
        text: "#ffffff", // Texto blanco
        placeholder: "#9a85bb", // Púrpura claro para placeholder
    },
    scrollbar: {
        thumb: "#8060a9", // Púrpura medio para scrollbar
        track: "#2c1b47", // Púrpura muy oscuro para track
    },
    button: {
        filter: "invert(67%) sepia(29%) saturate(721%) hue-rotate(242deg) brightness(88%) contrast(85%)", // Filtro para botones en tono púrpura
        background: "#8060a9", // Púrpura medio para botones
        text: "#ffffff", // Texto blanco para botones
    },
};

// Exportar el tema oscuro como predeterminado
export const colorPalette = darkTheme;

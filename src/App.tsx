//import "./style.css";

import { darkTheme, lightTheme } from "./interfaces/temas/temas.tsx";
import { useEffect, useState, useRef } from "react";

// Constante de versión para mostrar junto al título
const APP_VERSION = "v.2.07";

import ModelSelector from "./components/ModelSelector";
import { groqModels } from "./components/models/groqModels";
import ChatInterface, {
    ChatInterfaceRef,
} from "./components/chat/ChatInterface";
import { setupMobileKeyboardHandler } from "./utils/mobileUtils";

export const App = () => {
    const [isDarkTheme, setIsDarkTheme] = useState(true);
    const [theme, setTheme] = useState(darkTheme);
    const [selectedModel, setSelectedModel] = useState(groqModels[0].id); // Modelo seleccionado por defecto
    const chatInterfaceRef = useRef<ChatInterfaceRef>(null);

    // Función para cambiar el tema
    const toggleTheme = () => {
        setIsDarkTheme(!isDarkTheme);
        setTheme(isDarkTheme ? lightTheme : darkTheme);
        // Agregar un pequeño retraso antes de enfocar para asegurar que la UI se actualice
        setTimeout(() => {
            chatInterfaceRef.current?.focusTextarea();
        }, 100);
    };

    // Función para cambiar el modelo y luego enfocar el textarea
    const handleModelChange = (modelId: string) => {
        setSelectedModel(modelId);
        // Agregamos un pequeño retraso antes de enfocar para asegurar que la UI se actualice
        setTimeout(() => {
            chatInterfaceRef.current?.focusTextarea();
        }, 100);
    };

    useEffect(() => {
        // Configurar el manejador del teclado para dispositivos móviles
        setupMobileKeyboardHandler();

        // Inicializar el tema
        setTheme(isDarkTheme ? darkTheme : lightTheme);
    }, [isDarkTheme]);

    // Nuevo efecto para enfocar el textarea al cargar la app
    useEffect(() => {
        // Pequeño timeout para asegurar que los componentes estén completamente cargados
        const timer = setTimeout(() => {
            chatInterfaceRef.current?.focusTextarea();
        }, 300);

        return () => clearTimeout(timer);
    }, []); // Se ejecuta solo una vez al montar el componente

    return (
        <div
            className="App flex flex-col h-screen w-full overflow-hidden"
            style={{
                backgroundColor: theme.background,
                maxWidth: "100vw",
            }}
        >
            {/* Cabecera fija */}
            <header
                className="fixed top-0 left-0 right-0 z-10 px-4 py-3 shadow-md"
                style={{
                    backgroundColor: theme.background,
                }}
            >
                <div className="flex flex-col items-center">
                    <div className="flex items-end mb-2">
                        <h1
                            className="text-3xl md:text-5xl font-bold text-center"
                            style={{ color: theme.title.color }}
                        >
                            PROMPTING
                        </h1>
                        <span
                            className="text-sm ml-2 mb-1"
                            style={{ color: theme.title.color }}
                        >
                            {APP_VERSION}
                        </span>
                    </div>

                    {/* Selector de modelo */}
                    <div className="w-full flex justify-center">
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={handleModelChange}
                            theme={theme}
                            isDarkTheme={isDarkTheme}
                        />
                    </div>
                </div>
            </header>

            {/* Contenido principal (mensajes) con scroll */}
            <main className="flex-grow overflow-hidden pt-32 pb-40">
                <ChatInterface
                    ref={chatInterfaceRef}
                    theme={theme}
                    isDarkTheme={isDarkTheme}
                    selectedModel={selectedModel}
                    toggleTheme={toggleTheme}
                />
            </main>
        </div>
    );
};

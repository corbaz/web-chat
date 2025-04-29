//import "./style.css";

import { darkTheme, lightTheme } from "./interfaces/temas/temas.tsx";
import { useEffect, useState, useRef } from "react";

// Constante de versión para mostrar junto al título
const APP_VERSION = "v.2.04";

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

    return (
        <div className="App" style={{ backgroundColor: theme.background }}>
            <div className="flex flex-col items-center pt-10">
                <div className="flex items-end">
                    <h1
                        className="text-6xl font-bold text-center"
                        style={{ color: theme.title.color }}
                    >
                        PROMPTING
                    </h1>
                    <span
                        className="text-sm ml-2 mb-3"
                        style={{ color: theme.title.color }}
                    >
                        {APP_VERSION}
                    </span>
                </div>
                <div className="absolute right-5 top-5 flex items-center">
                    <label className="switch">
                        <input
                            type="checkbox"
                            checked={!isDarkTheme}
                            onChange={toggleTheme}
                        />
                        <span
                            className="slider round"
                            style={{
                                backgroundColor: isDarkTheme
                                    ? theme.accent
                                    : theme.secondary,
                                boxShadow: `0 0 5px ${theme.accent}`,
                            }}
                        >
                            {/* Mostrar ambos íconos permanentemente */}
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="sun-icon"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                                />
                            </svg>
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className="moon-icon"
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 9.003 0 008.354-5.646z"
                                />
                            </svg>
                        </span>
                    </label>
                </div>
            </div>

            {/* Model selector positioned above the chat */}
            <div className="w-full flex justify-center mb-4">
                <ModelSelector
                    selectedModel={selectedModel}
                    onModelChange={handleModelChange}
                    theme={theme}
                    isDarkTheme={isDarkTheme}
                />
            </div>

            <div className="flex justify-center px-4 pb-6">
                <ChatInterface
                    ref={chatInterfaceRef}
                    theme={theme}
                    isDarkTheme={isDarkTheme}
                    selectedModel={selectedModel}
                />
            </div>
        </div>
    );
};

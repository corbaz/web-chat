import React from "react";
import ModelSelector from "./ModelSelector";
import { ColorPalette } from "../interfaces/temas/temas";

interface HeaderProps {
    title: string;
    version: string;
    selectedModel: string;
    onModelChange: (modelId: string) => void;
    theme: ColorPalette;
    isDarkTheme: boolean;
    onToggleLeftMenu: () => void;
    onToggleRightMenu: () => void;
}

const Header: React.FC<HeaderProps> = ({
    title,
    version,
    selectedModel,
    onModelChange,
    theme,
    isDarkTheme,
    onToggleLeftMenu,
    onToggleRightMenu,
}) => {
    return (
        <header
            className="fixed top-0 left-0 right-0 z-50 w-full py-2 px-4"
            style={{
                backgroundColor: theme.background,
                borderBottom: `1px solid ${theme.accent}`,
            }}
            role="banner"
            aria-label="Encabezado de la aplicación"
        >
            <div className="flex items-center justify-between">
                {/* Menú hamburguesa izquierdo */}
                <button
                    className="text-base touch-manipulation min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors duration-200 hover:bg-opacity-20 hover:bg-white flex items-center justify-center"
                    onClick={onToggleLeftMenu}
                    aria-label="Abrir menú de historial"
                    style={{ color: theme.title.color }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>

                {/* Título y versión */}
                <div className="flex flex-col items-center mx-4">
                    <div className="flex items-end">
                        <h1
                            className="text-2xl sm:text-3xl md:text-4xl font-bold text-center"
                            style={{ color: theme.title.color }}
                        >
                            {title}
                        </h1>
                        <span
                            className="text-sm ml-2 mb-1"
                            style={{ color: theme.title.color }}
                        >
                            {version}
                        </span>
                    </div>

                    {/* Selector de modelo */}
                    <div className="w-full mt-1">
                        <ModelSelector
                            selectedModel={selectedModel}
                            onModelChange={onModelChange}
                            theme={theme}
                            isDarkTheme={isDarkTheme}
                        />
                    </div>
                </div>

                {/* Menú hamburguesa derecho */}
                <button
                    className="text-base touch-manipulation min-w-[44px] min-h-[44px] p-2 rounded-lg transition-colors duration-200 hover:bg-opacity-20 hover:bg-white flex items-center justify-center"
                    onClick={onToggleRightMenu}
                    aria-label="Abrir menú de configuración"
                    style={{ color: theme.title.color }}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="3" y1="12" x2="21" y2="12"></line>
                        <line x1="3" y1="6" x2="21" y2="6"></line>
                        <line x1="3" y1="18" x2="21" y2="18"></line>
                    </svg>
                </button>
            </div>
        </header>
    );
};

export default Header;

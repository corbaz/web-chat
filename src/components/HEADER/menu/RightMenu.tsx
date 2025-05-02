import React from "react";
import { ColorPalette } from "../../interfaces/temas/temas";
import { groqModels } from "../models/groqModels";

interface RightMenuProps {
    isOpen: boolean;
    onClose: () => void;
    theme: ColorPalette;
    isDarkTheme: boolean;
    toggleTheme: () => void;
    selectedModel: string;
    onModelChange: (modelId: string) => void;
}

const RightMenu: React.FC<RightMenuProps> = ({
    isOpen,
    onClose,
    theme,
    isDarkTheme,
    toggleTheme,
    selectedModel,
    onModelChange,
}) => {
    // Si no está abierto, no renderizar nada
    if (!isOpen) return null;

    return (
        <>
            {/* Overlay - ocupa toda la pantalla */}
            <div
                className="fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity duration-300"
                style={{
                    opacity: isOpen ? 1 : 0,
                }}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Menú lateral derecho */}
            <div
                className={`fixed top-0 right-0 h-full w-4/5 sm:w-1/3 md:w-1/4 lg:w-1/5 z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? "translate-x-0" : "translate-x-full"
                }`}
                style={{
                    backgroundColor: isDarkTheme
                        ? theme.background
                        : theme.secondary,
                    borderLeft: `1px solid ${theme.accent}`,
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Configuración de la aplicación"
            >
                <div className="flex flex-col h-full">
                    {/* Encabezado del menú */}
                    <div
                        className="p-4 flex justify-between items-center border-b"
                        style={{ borderColor: theme.accent }}
                    >
                        <h2
                            className="text-lg font-semibold"
                            style={{ color: theme.title.color }}
                        >
                            Configuración
                        </h2>
                        <button
                            onClick={onClose}
                            className="p-1 rounded-full hover:bg-opacity-20 hover:bg-gray-500 transition-colors"
                            aria-label="Cerrar menú"
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
                                style={{ color: theme.title.color }}
                            >
                                <line x1="18" y1="6" x2="6" y2="18"></line>
                                <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                        </button>
                    </div>

                    {/* Contenido del menú */}
                    <div className="flex-grow overflow-y-auto p-4">
                        {/* Sección de tema */}
                        <div className="mb-6">
                            <h3
                                className="text-md font-semibold mb-2"
                                style={{ color: theme.title.color }}
                            >
                                Tema
                            </h3>
                            <div className="flex items-center justify-between">
                                <span
                                    style={{
                                        color: isDarkTheme
                                            ? theme.text
                                            : theme.primary,
                                    }}
                                >
                                    {isDarkTheme ? "Tema Oscuro" : "Tema Claro"}
                                </span>
                                <div
                                    className="relative inline-block w-[56px] h-[28px]"
                                    title="Cambiar tema"
                                >
                                    <input
                                        type="checkbox"
                                        className="opacity-0 w-0 h-0"
                                        checked={!isDarkTheme}
                                        onChange={toggleTheme}
                                        aria-label="Cambiar entre tema claro y oscuro"
                                    />
                                    <span
                                        className="absolute cursor-pointer top-0 left-0 right-0 bottom-0 rounded-full flex items-center transition-all duration-300"
                                        style={{
                                            backgroundColor: isDarkTheme
                                                ? theme.accent
                                                : theme.secondary,
                                            boxShadow: `0 0 5px ${theme.accent}`,
                                        }}
                                    >
                                        {/* Círculo del switch */}
                                        <span
                                            className={`absolute h-5 w-5 left-1 bottom-1 bg-black rounded-full z-10 transition-transform duration-300 ${
                                                !isDarkTheme
                                                    ? "transform translate-x-7"
                                                    : ""
                                            }`}
                                        ></span>

                                        {/* Iconos de sol/luna */}
                                        {isDarkTheme ? (
                                            <span className="absolute left-1.5 top-1/2 transform -translate-y-1/2 text-yellow-300">
                                                🌙
                                            </span>
                                        ) : (
                                            <span className="absolute right-1.5 top-1/2 transform -translate-y-1/2 text-yellow-500">
                                                ☀️
                                            </span>
                                        )}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Sección de modelos */}
                        <div className="mb-6">
                            <h3
                                className="text-md font-semibold mb-2"
                                style={{ color: theme.title.color }}
                            >
                                Modelo de IA
                            </h3>
                            <div className="space-y-2">
                                {groqModels.map((model) => (
                                    <div
                                        key={model.id}
                                        className="flex items-center"
                                    >
                                        <input
                                            type="radio"
                                            id={`model-${model.id}`}
                                            name="model"
                                            className="mr-2"
                                            checked={selectedModel === model.id}
                                            onChange={() =>
                                                onModelChange(model.id)
                                            }
                                        />
                                        <label
                                            htmlFor={`model-${model.id}`}
                                            style={{
                                                color: isDarkTheme
                                                    ? theme.text
                                                    : theme.primary,
                                            }}
                                            className="flex-1"
                                        >
                                            {model.name}
                                            <div className="text-xs text-gray-400">
                                                {model.developer}
                                            </div>
                                        </label>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Sección de información */}
                        <div className="mb-6">
                            <h3
                                className="text-md font-semibold mb-2"
                                style={{ color: theme.title.color }}
                            >
                                Acerca de
                            </h3>
                            <p
                                className="text-sm"
                                style={{
                                    color: isDarkTheme
                                        ? "rgba(255,255,255,0.7)"
                                        : "rgba(0,0,0,0.7)",
                                }}
                            >
                                PROMPTING es una herramienta que te permite
                                interactuar con modelos de lenguaje de última
                                generación.
                            </p>
                            <p
                                className="text-sm mt-2"
                                style={{
                                    color: isDarkTheme
                                        ? "rgba(255,255,255,0.7)"
                                        : "rgba(0,0,0,0.7)",
                                }}
                            >
                                Desarrollado con Groq para obtener respuestas
                                ultrarrápidas.
                            </p>
                        </div>
                    </div>

                    {/* Pie del menú con versión */}
                    <div
                        className="p-4 border-t text-center text-sm"
                        style={{
                            borderColor: theme.accent,
                            color: isDarkTheme
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.5)",
                        }}
                    >
                        Versión v.2.09
                    </div>
                </div>
            </div>
        </>
    );
};

export default RightMenu;

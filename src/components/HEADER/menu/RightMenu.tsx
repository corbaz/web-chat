import React from "react";
import { ColorPalette } from "../../../interfaces/temas/temas.tsx";
import { groqModels } from "../models/groqModels";
import LunaIcon from "../../../assets/luna.svg";

import PieBrand from "./PieBrand.tsx";

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
                className="fixed inset-0 z-40 transition-opacity duration-300"
                style={{
                    opacity: isOpen ? 1 : 0,
                    pointerEvents: isOpen ? "auto" : "none",
                }}
                onClick={onClose}
                aria-hidden="true"
            />

            {/* Menú lateral derecho */}
            <div
                className={`fixed top-0 right-0 h-full w-5/5 sm:w-1/3 md:w-1/4 lg:w-1/5 z-1050 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? "translate-x-0" : "translate-x-full"
                }`}
                style={{
                    backgroundColor: theme.background,
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
                            title="Cerrar Menú"
                            aria-label="Cerrar menú"
                            className="p-1 rounded-lg hover:opacity-60 transition-opacity duration-150"
                            style={{
                                backgroundColor: theme.button.background,
                            }}
                        >
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="w-6 h-6"
                                style={{
                                    color: theme.title.color,
                                }}
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
                                <button
                                    onClick={toggleTheme}
                                    className="relative inline-block w-[56px] h-[28px] overflow-hidden rounded-full"
                                    title="Cambiar Tema"
                                    aria-label="Cambiar entre tema claro y oscuro"
                                >
                                    <div
                                        className="absolute cursor-pointer inset-0 rounded-full transition-all duration-300"
                                        style={{
                                            backgroundColor: isDarkTheme
                                                ? theme.accent
                                                : theme.secondary,
                                            boxShadow: `0 0 5px ${theme.accent}`,
                                        }}
                                    >
                                        {/* Círculo del switch */}
                                        <span
                                            className="absolute h-5 w-5 bg-white rounded-full z-10 transition-transform duration-300 transform"
                                            style={{
                                                top: "4px",
                                                left: "4px",
                                                transform: isDarkTheme
                                                    ? "translateX(24px)"
                                                    : "translateX(0)",
                                            }}
                                        />

                                        {/* Icono de sol (visible en tema claro) */}
                                        <svg
                                            xmlns="http://www.w3.org/2000/svg"
                                            className="absolute h-3.5 w-3.5 right-2 text-yellow-400 z-[2]"
                                            style={{
                                                top: "7px",
                                                opacity: isDarkTheme ? 0 : 1,
                                            }}
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

                                        {/* Icono de luna (visible en tema oscuro) */}
                                        <img
                                            src={LunaIcon}
                                            alt="Tema oscuro"
                                            className="absolute h-3.5 w-3.5 left-2 z-[2] text-yellow-400"
                                            style={{
                                                top: "7px",
                                                opacity: isDarkTheme ? 1 : 0,
                                            }}
                                        />
                                    </div>
                                </button>
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
                                            style={{
                                                accentColor: isDarkTheme
                                                    ? theme.secondary
                                                    : theme.primary,
                                            }}
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
                                            <div className="text-xs text-white">
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
                                    color: theme.text,
                                }}
                            >
                                PROMPTING es una herramienta que te permite
                                interactuar con modelos de lenguaje de última
                                generación.
                            </p>
                            <p
                                className="text-sm mt-2"
                                style={{
                                    color: theme.text,
                                }}
                            >
                                Desarrollado con Groq para obtener respuestas
                                ultrarrápidas.
                            </p>
                        </div>
                    </div>

                    {/* Pie del menú con versión */}
                    <PieBrand theme={theme} isDarkTheme={isDarkTheme} />
                </div>
            </div>
        </>
    );
};

export default RightMenu;

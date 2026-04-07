import React from "react";
import { ColorPalette } from "../../../interfaces/temas/temas.tsx";
import { groqModels } from "../models/groqModels";
import { routellmModels } from "../models/routellmModels";
import { openaiModels } from "../models/openaiModels";
import { anthropicModels } from "../models/anthropicModels";
import LunaIcon from "../../../assets/luna.svg";
import PieBrand from "./PieBrand.tsx";
import ApiKeyInput from "./ApiKeyInput.tsx";

interface RightMenuProps {
  isOpen: boolean;
  onClose: () => void;
  theme: ColorPalette;
  isDarkTheme: boolean;
  toggleTheme: () => void;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  selectedProvider?: string;
}

const RightMenu: React.FC<RightMenuProps> = ({
  isOpen,
  onClose,
  theme,
  isDarkTheme,
  toggleTheme,
  selectedModel,
  onModelChange,
  selectedProvider,
}) => {
  if (!isOpen) return null;

  const allModels = [
    ...groqModels,
    ...routellmModels,
    ...openaiModels,
    ...anthropicModels,
  ];
  const filteredModels = selectedProvider
    ? allModels.filter((m) => m.provider === selectedProvider)
    : allModels;

  const sectionHeadingStyle: React.CSSProperties = {
    color: theme.accent,
    fontSize: "0.7rem",
    fontWeight: 700,
    letterSpacing: "0.08em",
    textTransform: "uppercase" as const,
    marginBottom: "0.75rem",
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-60 transition-opacity duration-300"
        style={{
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
        }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-1/3 md:w-1/4 lg:w-1/5 z-1050 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
        style={{
          backgroundColor: theme.background,
          boxShadow: `-8px 0 32px ${
            isDarkTheme ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.18)"
          }`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Configuración de la aplicación"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className="px-4 py-4 flex justify-between items-center"
            style={{
              borderBottom: `1px solid ${
                isDarkTheme ? "rgba(124,133,245,0.12)" : "rgba(91,110,245,0.12)"
              }`,
            }}
          >
            <h2
              className="text-base font-bold tracking-wide"
              style={{ color: theme.title.color }}
            >
              Configuración
            </h2>
            <button
              type="button"
              onClick={onClose}
              title="Cerrar Menú"
              aria-label="Cerrar menú"
              className="nm-press p-2 rounded-xl"
              style={{
                backgroundColor: theme.background,
                boxShadow: theme.shadow.sm,
                color: theme.title.color,
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
                className="w-5 h-5"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* Scrollable content */}
          <div className="grow overflow-y-auto px-4 py-4 space-y-6">
            {/* ── Tema ─────────────────────────────────────────────────────── */}
            <div>
              <p style={sectionHeadingStyle}>Apariencia</p>
              <div className="flex items-center justify-between">
                <span
                  className="text-sm font-medium"
                  style={{ color: theme.text }}
                >
                  {isDarkTheme ? "Tema Oscuro" : "Tema Claro"}
                </span>

                {/* Neumorphic toggle switch */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="nm-press relative inline-flex items-center w-16 h-8 rounded-full cursor-pointer"
                  title="Cambiar Tema"
                  aria-label="Cambiar entre tema claro y oscuro"
                  style={{
                    backgroundColor: theme.background,
                    boxShadow: theme.shadow.inset,
                  }}
                >
                  {/* Knob — neumorphic raised circle */}
                  <span
                    className="absolute flex items-center justify-center h-6 w-6 rounded-full transition-transform duration-300"
                    style={{
                      left: "4px",
                      transform: isDarkTheme
                        ? "translateX(30px)"
                        : "translateX(0)",
                      backgroundColor: theme.background,
                      boxShadow: theme.shadow.sm,
                    }}
                  >
                    {/* Sun icon (light theme) */}
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-3.5 w-3.5 transition-opacity duration-300"
                      style={{
                        opacity: isDarkTheme ? 0 : 1,
                        position: "absolute",
                        color: theme.accent,
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
                    {/* Moon icon (dark theme) */}
                    <img
                      src={LunaIcon}
                      alt="Tema oscuro"
                      className="h-3.5 w-3.5 transition-opacity duration-300"
                      style={{
                        opacity: isDarkTheme ? 1 : 0,
                        position: "absolute",
                        filter: "brightness(0) invert(1)",
                      }}
                    />
                  </span>

                  {/* Accent indicator dot */}
                  <span
                    className="absolute rounded-full transition-opacity duration-300"
                    style={{
                      width: "4px",
                      height: "4px",
                      backgroundColor: theme.accent,
                      opacity: 0.6,
                      left: isDarkTheme ? "10px" : "auto",
                      right: isDarkTheme ? "auto" : "10px",
                    }}
                  />
                </button>
              </div>
            </div>

            {/* ── Modelo de IA ─────────────────────────────────────────────── */}
            <div>
              <p style={sectionHeadingStyle}>Modelo de IA</p>
              <div className="space-y-1.5">
                {filteredModels.map((model) => {
                  const isSelected = selectedModel === model.id;
                  return (
                    <label
                      key={model.id}
                      className="flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer nm-press"
                      style={{
                        backgroundColor: theme.background,
                        boxShadow: isSelected
                          ? theme.shadow.inset
                          : theme.shadow.sm,
                        borderLeft: isSelected
                          ? `3px solid ${theme.accent}`
                          : "3px solid transparent",
                      }}
                    >
                      <input
                        type="radio"
                        name="model"
                        className="sr-only"
                        checked={isSelected}
                        onChange={() => onModelChange(model.id)}
                      />
                      {/* Custom radio dot */}
                      <span
                        className="w-4 h-4 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: theme.background,
                          boxShadow: theme.shadow.sm,
                        }}
                      >
                        {isSelected && (
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: theme.accent }}
                          />
                        )}
                      </span>
                      <div className="min-w-0">
                        <div
                          className="text-sm font-medium truncate"
                          style={{
                            color: isSelected ? theme.accent : theme.text,
                          }}
                        >
                          {model.name}
                        </div>
                        <div
                          className="text-xs"
                          style={{ color: theme.textMuted }}
                        >
                          {model.developer}
                        </div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* ── API Key ───────────────────────────────────────────────────── */}
            <ApiKeyInput
              theme={theme}
              isDarkTheme={isDarkTheme}
              selectedProvider={selectedProvider}
            />

            {/* ── Acerca de ─────────────────────────────────────────────────── */}
            <div>
              <p style={sectionHeadingStyle}>Acerca de</p>
              <p
                className="text-sm leading-relaxed"
                style={{ color: theme.textMuted }}
              >
                PROMPTING es una herramienta para interactuar con modelos de
                lenguaje de última generación.
              </p>
              <p
                className="text-sm leading-relaxed mt-2"
                style={{ color: theme.textMuted }}
              >
                Desarrollado con Groq para respuestas ultrarrápidas.
              </p>
            </div>
          </div>

          <PieBrand theme={theme} isDarkTheme={isDarkTheme} />
        </div>
      </div>
    </>
  );
};

export default RightMenu;

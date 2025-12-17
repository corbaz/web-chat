import React, { useState } from "react";
import ModelSelector from "./ModelSelector";
import ProviderSelector from "./ProviderSelector";
import Title from "./menu/Title";
import { ColorPalette } from "../../interfaces/temas/temas";
import MenuButton from "./menu/MenuButton";

interface HeaderProps {
  title: string;
  version: string;
  selectedModel: string;
  onModelChange: (modelId: string) => void;
  theme: ColorPalette;
  isDarkTheme: boolean;
  onToggleLeftMenu: () => void;
  onToggleRightMenu: () => void;
  chatId?: string;
  onUpdateChatTitle?: (chatId: string, newTitle: string) => void;
  editable?: boolean;
  selectedProvider?: string;
  onProviderChange?: (providerId: string) => void;
}

const Header: React.FC<HeaderProps> = ({
  title,
  version,
  selectedModel,
  onModelChange,
  theme,
  onToggleLeftMenu,
  onToggleRightMenu,
  chatId,
  onUpdateChatTitle,
  editable = false,
  selectedProvider: externalProvider,
  onProviderChange: externalOnProviderChange,
}) => {
  const [internalProvider, setInternalProvider] = useState<string>(() => {
    // Inicializar con el primer proveedor que tenga API key
    if (!externalProvider) {
      const providers = ["groq", "routellm", "openai", "anthropic"];
      for (const provider of providers) {
        const apiKey = localStorage.getItem(`${provider}ApiKey`);
        if (apiKey && apiKey.trim() !== "") {
          return provider;
        }
      }
    }
    return "groq";
  });

  // Usar el proveedor externo si está disponible, sino el interno
  const selectedProvider = externalProvider || internalProvider;

  const handleProviderChange = (providerId: string) => {
    setInternalProvider(providerId);
    if (externalOnProviderChange) {
      externalOnProviderChange(providerId);
    }
  };

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
      <div className="flex items-center justify-between gap-2">
        {/* Menú hamburguesa izquierdo historial */}
        <MenuButton
          onClick={onToggleLeftMenu}
          ariaLabel="Abrir menú de historial"
          theme={theme}
        />

        {/* Título y selectores */}
        <div className="flex flex-col items-center mx-2 sm:mx-4 flex-1 min-w-0">
          {/* Componente de título y versión */}
          <Title
            title={title}
            version={version}
            theme={theme}
            chatId={chatId}
            onUpdateChatTitle={onUpdateChatTitle}
            editable={editable}
          />

          {/* Selectores de modelo y proveedor */}
          <div className="flex gap-2 w-full mt-1 flex-col sm:flex-row sm:items-center sm:justify-center">
            {/* Selector de modelo */}
            <div className="w-full sm:w-auto sm:max-w-[280px]">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                theme={theme}
                providerFilter={selectedProvider}
              />
            </div>
            {/* Selector de proveedor */}
            <div className="w-full sm:w-auto sm:max-w-[180px]">
              <ProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={handleProviderChange}
                theme={theme}
              />
            </div>
          </div>
        </div>

        {/* Menú hamburguesa derecho configuración */}
        <MenuButton
          onClick={onToggleRightMenu}
          ariaLabel="Abrir menú de configuración"
          theme={theme}
        />
      </div>
    </header>
  );
};

export default Header;

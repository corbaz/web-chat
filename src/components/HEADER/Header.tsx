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
    if (!externalProvider) {
      const providers = ["groq", "routellm", "openai", "anthropic"];
      for (const provider of providers) {
        const apiKey = localStorage.getItem(`${provider}ApiKey`);
        if (apiKey && apiKey.trim() !== "") return provider;
      }
    }
    return "groq";
  });

  const selectedProvider = externalProvider || internalProvider;

  const handleProviderChange = (providerId: string) => {
    setInternalProvider(providerId);
    if (externalOnProviderChange) externalOnProviderChange(providerId);
  };

  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 w-full px-4 py-3"
      style={{
        backgroundColor: theme.background,
        boxShadow: `0 4px 16px ${
          theme.background === "#1e2235"
            ? "rgba(0,0,0,0.45)"
            : "rgba(0,0,0,0.12)"
        }, ${theme.shadow.sm}`,
      }}
      role="banner"
      aria-label="Encabezado de la aplicación"
    >
      <div className="flex items-center justify-between gap-3">
        {/* Menú hamburguesa — historial */}
        <MenuButton
          onClick={onToggleLeftMenu}
          ariaLabel="Abrir menú de historial"
          theme={theme}
        />

        {/* Título + selectores */}
        <div className="flex flex-col items-center flex-1 min-w-0 gap-1.5">
          <Title
            title={title}
            version={version}
            theme={theme}
            chatId={chatId}
            onUpdateChatTitle={onUpdateChatTitle}
            editable={editable}
          />

          <div className="flex gap-4 w-full flex-col items-center sm:flex-row sm:justify-center">
            <div className="w-auto">
              <ModelSelector
                selectedModel={selectedModel}
                onModelChange={onModelChange}
                theme={theme}
                providerFilter={selectedProvider}
              />
            </div>
            <div className="w-auto">
              <ProviderSelector
                selectedProvider={selectedProvider}
                onProviderChange={handleProviderChange}
                theme={theme}
              />
            </div>
          </div>
        </div>

        {/* Menú hamburguesa — configuración */}
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

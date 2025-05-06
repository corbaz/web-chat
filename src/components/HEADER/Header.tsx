import React from "react";
import ModelSelector from "./ModelSelector";
import Title from "./Title";
import MenuButton from "./menu/MenuButton";
import { ColorPalette } from "../../interfaces/temas/temas";

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
    chatId,
    onUpdateChatTitle,
    editable = false,
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
                <MenuButton
                    onClick={onToggleLeftMenu}
                    ariaLabel="Abrir menú de historial"
                    theme={theme}
                />

                {/* Título y selector de modelos */}
                <div className="flex flex-col items-center mx-4">
                    {/* Componente de título y versión */}
                    <Title
                        title={title}
                        version={version}
                        theme={theme}
                        chatId={chatId}
                        onUpdateChatTitle={onUpdateChatTitle}
                        editable={editable}
                    />

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

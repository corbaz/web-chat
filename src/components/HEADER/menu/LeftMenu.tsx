import React from "react";
import { ColorPalette } from "../../../interfaces/temas/temas.tsx";

interface LeftMenuProps {
    isOpen: boolean;
    onClose: () => void;
    theme: ColorPalette;
    isDarkTheme: boolean;
    chatHistory: { id: string; title: string; date: Date }[]; // Lista de conversaciones guardadas
    onSelectChat: (chatId: string) => void;
    onNewChat: () => void;
    currentChatId?: string;
}

const LeftMenu: React.FC<LeftMenuProps> = ({
    isOpen,
    onClose,
    theme,
    isDarkTheme,
    chatHistory,
    onSelectChat,
    onNewChat,
    currentChatId,
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

            {/* Menú lateral izquierdo */}
            <div
                className={`fixed top-0 left-0 h-full w-4/5 sm:w-1/3 md:w-1/4 lg:w-1/5 z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                style={{
                    backgroundColor: isDarkTheme
                        ? theme.background
                        : theme.secondary,
                    borderRight: `1px solid ${theme.accent}`,
                }}
                role="dialog"
                aria-modal="true"
                aria-label="Historial de conversaciones"
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
                            Historial
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

                    {/* Botón de nueva conversación */}
                    <button
                        className="m-4 p-2 rounded-lg flex items-center justify-center"
                        style={{
                            backgroundColor: theme.button.background,
                            color: theme.button.text,
                        }}
                        onClick={onNewChat}
                    >
                        <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="18"
                            height="18"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            className="mr-2"
                        >
                            <line x1="12" y1="5" x2="12" y2="19"></line>
                            <line x1="5" y1="12" x2="19" y2="12"></line>
                        </svg>
                        Nueva conversación
                    </button>

                    {/* Lista de conversaciones */}
                    <div className="flex-grow overflow-y-auto p-2">
                        {chatHistory.length === 0 ? (
                            <p className="text-center p-4 text-gray-500">
                                No hay conversaciones guardadas
                            </p>
                        ) : (
                            <ul className="space-y-1">
                                {chatHistory.map((chat) => (
                                    <li key={chat.id}>
                                        <button
                                            className="w-full text-left p-3 rounded-lg transition-colors flex items-center"
                                            style={{
                                                backgroundColor:
                                                    currentChatId === chat.id
                                                        ? isDarkTheme
                                                            ? "rgba(255, 255, 255, 0.1)"
                                                            : "rgba(0, 0, 0, 0.1)"
                                                        : "transparent",
                                                color: isDarkTheme
                                                    ? theme.text
                                                    : theme.primary,
                                            }}
                                            onClick={() =>
                                                onSelectChat(chat.id)
                                            }
                                        >
                                            <svg
                                                xmlns="http://www.w3.org/2000/svg"
                                                width="18"
                                                height="18"
                                                viewBox="0 0 24 24"
                                                fill="none"
                                                stroke="currentColor"
                                                strokeWidth="2"
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                className="mr-2"
                                            >
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                            <div className="flex-1 truncate">
                                                {chat.title}
                                                <div className="text-xs text-gray-400">
                                                    {chat.date.toLocaleDateString()}
                                                </div>
                                            </div>
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Pie del menú con información de versión */}
                    <div
                        className="p-4 border-t text-center text-sm"
                        style={{
                            borderColor: theme.accent,
                            color: isDarkTheme
                                ? "rgba(255,255,255,0.5)"
                                : "rgba(0,0,0,0.5)",
                        }}
                    >
                        PROMPTING © {new Date().getFullYear()}
                    </div>
                </div>
            </div>
        </>
    );
};

export default LeftMenu;

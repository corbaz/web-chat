import React, { useState } from "react";
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
    onUpdateChatTitle?: (chatId: string, newTitle: string) => void; // Nueva prop para actualizar el título
    onDeleteChat?: (chatId: string) => void; // Nueva prop para eliminar el chat
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
    onUpdateChatTitle,
    onDeleteChat,
}) => {
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>("");

    const handleEditClick = (chat: { id: string; title: string }) => {
        setEditingId(chat.id);
        setEditValue(chat.title);
    };
    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
    };
    const handleEditBlur = (chat: { id: string }) => {
        if (editValue.trim()) {
            // Actualizar el nombre en localStorage
            const chatHistoryRaw = localStorage.getItem("chat-history");
            let chatHistoryArr = chatHistoryRaw
                ? JSON.parse(chatHistoryRaw)
                : [];
            chatHistoryArr = chatHistoryArr.map(
                (c: {
                    id: string;
                    title: string;
                    date: Date;
                    model?: string;
                }) => (c.id === chat.id ? { ...c, title: editValue } : c)
            );
            localStorage.setItem(
                "chat-history",
                JSON.stringify(chatHistoryArr)
            );

            // Actualizar el estado en el componente padre en lugar de recargar la página
            if (onUpdateChatTitle) {
                onUpdateChatTitle(chat.id, editValue);
            }
        }
        setEditingId(null);
    };

    const handleDeleteChat = (chatId: string) => {
        // Eliminar el chat de localStorage
        const chatHistoryRaw = localStorage.getItem("chat-history");
        let chatHistoryArr = chatHistoryRaw ? JSON.parse(chatHistoryRaw) : [];
        chatHistoryArr = chatHistoryArr.filter(
            (c: { id: string; title: string; date: Date; model?: string }) =>
                c.id !== chatId
        );
        localStorage.setItem("chat-history", JSON.stringify(chatHistoryArr));

        // Llamar a la función de eliminación en el componente padre
        if (onDeleteChat) {
            onDeleteChat(chatId);
        }
    };

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

            {/* Menú lateral izquierdo */}
            <div
                className={`fixed top-0 left-0 h-full w-4/5 sm:w-1/3 md:w-1/4 lg:w-1/5 z-50 transform transition-transform duration-300 ease-in-out ${
                    isOpen ? "translate-x-0" : "-translate-x-full"
                }`}
                style={{
                    backgroundColor: theme.background,
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
                        onClick={(e) => {
                            e.stopPropagation(); // Evitar que el evento burbujee
                            onNewChat(); // Llamar a la función de nueva conversación
                            onClose(); // Cerrar el menú después de crear
                        }}
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
                        Nuevo Chat
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
                                            onClick={() => {
                                                onSelectChat(chat.id);
                                                onClose(); // Cerrar el menú después de seleccionar el chat
                                            }}
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
                                            <div className="flex-1 truncate flex items-center gap-2">
                                                {editingId === chat.id ? (
                                                    <input
                                                        className="bg-transparent border-b border-gray-400 text-sm text-white px-1 w-32"
                                                        value={editValue}
                                                        onChange={
                                                            handleEditChange
                                                        }
                                                        onBlur={() =>
                                                            handleEditBlur(chat)
                                                        }
                                                        autoFocus
                                                        onKeyDown={(e) => {
                                                            // Evitar que la barra espaciadora haga perder el foco
                                                            e.stopPropagation();
                                                            // Confirmar con Enter
                                                            if (
                                                                e.key ===
                                                                "Enter"
                                                            ) {
                                                                handleEditBlur(
                                                                    chat
                                                                );
                                                            }
                                                            // Cancelar con Escape
                                                            if (
                                                                e.key ===
                                                                "Escape"
                                                            ) {
                                                                setEditingId(
                                                                    null
                                                                );
                                                            }
                                                        }}
                                                    />
                                                ) : (
                                                    <div className="flex flex-col w-full">
                                                        <div className="flex items-center">
                                                            {/* Botón de editar (lápiz) a la izquierda */}
                                                            <button
                                                                className="mr-2 p-1 hover:bg-gray-200 rounded flex-shrink-0"
                                                                title="Editar nombre"
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleEditClick(
                                                                        chat
                                                                    );
                                                                }}
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="14"
                                                                    height="14"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth="2"
                                                                        d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-2.828 0L9 13zm-6 6h6"
                                                                    />
                                                                </svg>
                                                            </button>

                                                            {/* Título del chat */}
                                                            <span className="flex-grow truncate">
                                                                {chat.title}
                                                            </span>

                                                            {/* Botón de eliminar (papelera) a la derecha */}
                                                            <button
                                                                className="ml-2 p-1 hover:bg-gray-200 rounded flex-shrink-0"
                                                                title="Eliminar chat"
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    if (
                                                                        window.confirm(
                                                                            "¿Estás seguro de que quieres eliminar esta conversación?"
                                                                        )
                                                                    ) {
                                                                        handleDeleteChat(
                                                                            chat.id
                                                                        );
                                                                    }
                                                                }}
                                                            >
                                                                <svg
                                                                    xmlns="http://www.w3.org/2000/svg"
                                                                    width="14"
                                                                    height="14"
                                                                    fill="none"
                                                                    viewBox="0 0 24 24"
                                                                    stroke="currentColor"
                                                                >
                                                                    <path
                                                                        strokeLinecap="round"
                                                                        strokeLinejoin="round"
                                                                        strokeWidth="2"
                                                                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                                                                    />
                                                                </svg>
                                                            </button>
                                                        </div>

                                                        {/* Fecha y hora debajo del título */}
                                                        <span className="text-xs text-white mt-1">
                                                            {(() => {
                                                                const d =
                                                                    new Date(
                                                                        chat.date
                                                                    );
                                                                return `${d.toLocaleDateString()} ${d.toLocaleTimeString(
                                                                    [],
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        second: "2-digit",
                                                                    }
                                                                )}`;
                                                            })()}
                                                        </span>
                                                    </div>
                                                )}
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

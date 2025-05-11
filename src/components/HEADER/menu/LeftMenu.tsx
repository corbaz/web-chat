import React, { useState } from "react";
import { ColorPalette } from "../../../interfaces/temas/temas.tsx";
import Swal from "sweetalert2";
import { createTitleEditHandlers } from "../../../utils/titleUtils";
import PenIcon from "../../../assets/pen.svg";
import TrashIcon from "../../../assets/trash.svg";
import PieBrand from "./PieBrand.tsx";

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

    const { handleEditKeyDown, truncateTitle } = createTitleEditHandlers({
        maxLength: 40, // Truncamiento en menú lateral a 40 caracteres
        onUpdateTitle: (chatId: string, newTitle: string) => {
            if (onUpdateChatTitle) {
                onUpdateChatTitle(chatId, newTitle);
            }
        },
    });

    const handleEditClick = (chat: { id: string; title: string }) => {
        setEditingId(chat.id);
        setEditValue(chat.title);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setEditValue(e.target.value);
    };

    const handleEditBlur = (chat: { id: string; title: string }) => {
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

    const handleKeyDownInLeftMenu = (
        e: React.KeyboardEvent<HTMLInputElement>,
        chat: { id: string; title: string }
    ) => {
        handleEditKeyDown(e, chat.id, editValue, () => {
            setEditingId(null);
            if (e.key === "Escape") {
                setEditValue(chat.title); // Restaurar el valor original solo si es Escape
            }
        });
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

    const showDeleteConfirmation = async (
        chatId: string,
        chatTitle: string
    ) => {
        const result = await Swal.fire({
            title: "¿Eliminar este Chat?",
            text: `¿Estás seguro de que quieres eliminar "${chatTitle}"?`,
            icon: "question",
            iconColor: theme.primary,
            showCancelButton: true,
            confirmButtonText: "Sí, eliminar",
            confirmButtonColor: isDarkTheme ? theme.secondary : theme.primary,
            cancelButtonText: "Cancelar",
            cancelButtonColor: isDarkTheme ? theme.secondary : theme.primary,
            backdrop: true,
            background: theme.background,
            color: theme.text,
        });

        if (result.isConfirmed) {
            handleDeleteChat(chatId);

            // Mostrar mensaje de éxito
            Swal.fire({
                title: "¡Eliminado!",
                text: "El Chat ha sido eliminado.",
                icon: "success",
                iconColor: theme.primary,
                timer: 1500,
                confirmButtonColor: isDarkTheme
                    ? theme.secondary
                    : theme.primary,
                background: theme.background,
                color: theme.text,
            });
        }
    };

    const handleNewChat = async (e: React.MouseEvent) => {
        e.stopPropagation(); // Evitar que el evento burbujee

        // Mostrar confirmación antes de crear un nuevo chat
        const result = await Swal.fire({
            title: "Nuevo Chat",
            text: "¿Desea continuar con la creación del Chat?",
            icon: "question",
            iconColor: theme.primary,
            showCancelButton: true,
            confirmButtonText: "Sí, continuar",
            confirmButtonColor: isDarkTheme ? theme.secondary : theme.primary,
            cancelButtonText: "Cancelar",
            cancelButtonColor: isDarkTheme ? theme.secondary : theme.primary,
            backdrop: true,
            background: theme.background,
            color: theme.text,
        });

        if (result.isConfirmed) {
            onNewChat(); // Llamar a la función de nueva conversación solo si confirma
            onClose(); // Cerrar el menú después de crear
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
                className={`fixed top-0 left-0 h-full w-4/5 sm:w-1/3 md:w-1/4 lg:w-1/5 z-1050 transform transition-transform duration-300 ease-in-out ${
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
                            title="Cerrar Menú"
                            aria-label="Cerrar menú"
                            className="p-1 rounded-lg hover:opacity-50 transition-opacity duration-150"
                            style={{
                                backgroundColor: theme.button.background,
                            }}
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
                                style={{
                                    color: theme.title.color,
                                }}
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
                        onClick={handleNewChat}
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
                                        {editingId === chat.id ? (
                                            <div className="w-full p-2 flex items-center">
                                                <input
                                                    value={editValue}
                                                    onChange={handleEditChange}
                                                    onBlur={() =>
                                                        handleEditBlur(chat)
                                                    }
                                                    className="w-full bg-transparent border-b border-white text-white outline-none"
                                                    autoFocus
                                                    onFocus={(e) => {
                                                        e.target.select();
                                                    }}
                                                    onKeyDown={(e) =>
                                                        handleKeyDownInLeftMenu(
                                                            e,
                                                            chat
                                                        )
                                                    }
                                                    maxLength={100} // máximo de caracteres permitidos
                                                />
                                            </div>
                                        ) : (
                                            <div
                                                className="w-full text-left p-3 rounded-lg transition-colors flex items-center cursor-pointer"
                                                style={{
                                                    backgroundColor:
                                                        currentChatId ===
                                                        chat.id
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
                                                {/* Contenedor para el título y los botones */}
                                                <div className="flex flex-col w-full">
                                                    {/* Primera fila: título y botones */}
                                                    <div className="flex items-center justify-between w-full">
                                                        {/* Grupo izquierdo: botón editar y título */}
                                                        <div className="flex items-center flex-grow overflow-hidden">
                                                            {/* Botón de editar (lápiz) */}
                                                            <button
                                                                title="Editar nombre del Chat"
                                                                aria-label="Editar nombre del Chat"
                                                                className="mr-2 p-2 rounded-lg hover:opacity-60 transition-opacity duration-150"
                                                                style={{
                                                                    backgroundColor:
                                                                        theme
                                                                            .button
                                                                            .background,
                                                                }}
                                                                onClick={(
                                                                    e
                                                                ) => {
                                                                    e.stopPropagation();
                                                                    handleEditClick(
                                                                        chat
                                                                    );
                                                                }}
                                                            >
                                                                <img
                                                                    src={
                                                                        PenIcon
                                                                    }
                                                                    alt="Pen Icon"
                                                                    className="w-4 h-4 md:w-5 md:h-5"
                                                                    style={{
                                                                        width: "15px",
                                                                        height: "15px",
                                                                        filter: isDarkTheme
                                                                            ? "brightness(0) invert(1)"
                                                                            : "brightness(1) invert(0)",
                                                                    }}
                                                                />
                                                            </button>

                                                            {/* Título del chat - con más espacio para mostrar más caracteres */}
                                                            <span className="truncate max-w-[200px]">
                                                                {truncateTitle(
                                                                    chat.title
                                                                )}
                                                            </span>
                                                        </div>

                                                        {/* Botón de eliminar (papelera) alineado a la derecha */}
                                                        <button
                                                            title="Eliminar Chat"
                                                            aria-label="Eliminar Chat"
                                                            className="p-2 rounded-lg hover:opacity-60 transition-opacity duration-150"
                                                            style={{
                                                                backgroundColor:
                                                                    theme.button
                                                                        .background,
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                showDeleteConfirmation(
                                                                    chat.id,
                                                                    chat.title
                                                                );
                                                            }}
                                                        >
                                                            <img
                                                                src={TrashIcon}
                                                                alt="Trash Icon"
                                                                className="w-4 h-4 md:w-5 md:h-5"
                                                                style={{
                                                                    width: "15px",
                                                                    height: "15px",
                                                                    filter: isDarkTheme
                                                                        ? "brightness(0) invert(1)"
                                                                        : "brightness(1) invert(0)",
                                                                }}
                                                            />
                                                        </button>
                                                    </div>

                                                    {/* Fecha y hora debajo del título */}
                                                        <span className="text-xs mt-1"
                                                            style={{
                                                                color: theme.text,
                                                            }}>
                                                        {(() => {
                                                            const d = new Date(
                                                                chat.date
                                                            );

                                                            // Array de días en español
                                                            const dias = [
                                                                "Domingo",
                                                                "Lunes",
                                                                "Martes",
                                                                "Miércoles",
                                                                "Jueves",
                                                                "Viernes",
                                                                "Sábado",
                                                            ];

                                                            const diaNombre =
                                                                dias[
                                                                    d.getDay()
                                                                ];
                                                            const fecha =
                                                                d.toLocaleDateString(
                                                                    "es-AR",
                                                                    {
                                                                        day: "2-digit",
                                                                        month: "2-digit",
                                                                        year: "numeric",
                                                                    }
                                                                );
                                                            const hora =
                                                                d.toLocaleTimeString(
                                                                    "es-AR",
                                                                    {
                                                                        hour: "2-digit",
                                                                        minute: "2-digit",
                                                                        hour12: false,
                                                                    }
                                                                );

                                                            return `${diaNombre} ${fecha} - ${hora}`;
                                                        })()}
                                                    </span>
                                                </div>
                                            </div>
                                        )}
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>

                    {/* Pie del menú con versión */}
                    <PieBrand theme={theme} isDarkTheme={isDarkTheme} />
                </div>
            </div>
        </>
    );
};

export default LeftMenu;

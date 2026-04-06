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
  chatHistory: { id: string; title: string; date: Date }[];
  onSelectChat: (chatId: string) => void;
  onNewChat: () => void;
  currentChatId?: string;
  onUpdateChatTitle?: (chatId: string, newTitle: string) => void;
  onDeleteChat?: (chatId: string) => void;
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
    maxLength: 40,
    onUpdateTitle: (chatId: string, newTitle: string) => {
      if (onUpdateChatTitle) onUpdateChatTitle(chatId, newTitle);
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
      const raw = localStorage.getItem("chat-history");
      let arr = raw ? JSON.parse(raw) : [];
      arr = arr.map((c: { id: string; title: string; date: Date; model?: string }) =>
        c.id === chat.id ? { ...c, title: editValue } : c,
      );
      localStorage.setItem("chat-history", JSON.stringify(arr));
      if (onUpdateChatTitle) onUpdateChatTitle(chat.id, editValue);
    }
    setEditingId(null);
  };

  const handleKeyDownInLeftMenu = (
    e: React.KeyboardEvent<HTMLInputElement>,
    chat: { id: string; title: string },
  ) => {
    handleEditKeyDown(e, chat.id, editValue, () => {
      setEditingId(null);
      if (e.key === "Escape") setEditValue(chat.title);
    });
  };

  const handleDeleteChat = (chatId: string) => {
    const raw = localStorage.getItem("chat-history");
    let arr = raw ? JSON.parse(raw) : [];
    arr = arr.filter(
      (c: { id: string }) => c.id !== chatId,
    );
    localStorage.setItem("chat-history", JSON.stringify(arr));
    if (onDeleteChat) onDeleteChat(chatId);
  };

  const showDeleteConfirmation = async (chatId: string, chatTitle: string) => {
    const result = await Swal.fire({
      title: "¿Eliminar este Chat?",
      text: `¿Estás seguro de que quieres eliminar "${chatTitle}"?`,
      icon: "question",
      iconColor: theme.accent,
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      confirmButtonColor: theme.accent,
      cancelButtonText: "Cancelar",
      cancelButtonColor: isDarkTheme ? theme.surface : theme.secondary,
      background: theme.background,
      color: theme.text,
    });
    if (result.isConfirmed) {
      handleDeleteChat(chatId);
      Swal.fire({
        title: "¡Eliminado!",
        text: "El Chat ha sido eliminado.",
        icon: "success",
        iconColor: theme.accent,
        timer: 1500,
        confirmButtonColor: theme.accent,
        background: theme.background,
        color: theme.text,
      });
    }
  };

  const handleNewChat = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const result = await Swal.fire({
      title: "Nuevo Chat",
      text: "¿Desea continuar con la creación del Chat?",
      icon: "question",
      iconColor: theme.accent,
      showCancelButton: true,
      confirmButtonText: "Sí, continuar",
      confirmButtonColor: theme.accent,
      cancelButtonText: "Cancelar",
      cancelButtonColor: isDarkTheme ? theme.surface : theme.secondary,
      background: theme.background,
      color: theme.text,
    });
    if (result.isConfirmed) {
      onNewChat();
      onClose();
    }
  };

  if (!isOpen) return null;

  // Neumorphic sidebar item styles
  const itemActiveStyle: React.CSSProperties = {
    backgroundColor: theme.background,
    color: theme.accent,
    boxShadow: theme.shadow.inset,
    borderLeft: `3px solid ${theme.accent}`,
    borderRadius: "12px",
  };

  const itemStyle: React.CSSProperties = {
    backgroundColor: theme.background,
    color: theme.text,
    boxShadow: theme.shadow.sm,
    borderLeft: `3px solid transparent`,
    borderRadius: "12px",
  };

  const iconBtnStyle: React.CSSProperties = {
    backgroundColor: theme.background,
    boxShadow: theme.shadow.sm,
    borderRadius: "8px",
    padding: "5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  };

  return (
    <>
      {/* Overlay */}
      <div
        className="fixed inset-0 z-60 transition-opacity duration-300"
        style={{ opacity: isOpen ? 1 : 0, pointerEvents: isOpen ? "auto" : "none" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Sidebar panel */}
      <div
        className={`fixed top-0 left-0 h-full w-full sm:w-1/3 md:w-1/4 lg:w-1/5 z-1050 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
        style={{
          backgroundColor: theme.background,
          boxShadow: `8px 0 32px ${
            isDarkTheme ? "rgba(0,0,0,0.6)" : "rgba(0,0,0,0.18)"
          }`,
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Historial de conversaciones"
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div
            className="px-4 py-4 flex justify-between items-center"
            style={{
              borderBottom: `1px solid ${
                isDarkTheme
                  ? "rgba(124,133,245,0.12)"
                  : "rgba(91,110,245,0.12)"
              }`,
            }}
          >
            <h2
              className="text-base font-bold tracking-wide"
              style={{ color: theme.title.color }}
            >
              Historial
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
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"
                fill="none" stroke="currentColor" strokeWidth="2"
                strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                <line x1="18" y1="6" x2="6"  y2="18" />
                <line x1="6"  y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>

          {/* New chat button */}
          <div className="px-4 pt-4 pb-2">
            <button
              type="button"
              className="w-full py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold nm-press"
              style={{
                backgroundColor: theme.background,
                color: theme.accent,
                boxShadow: theme.shadow.outer,
              }}
              onClick={handleNewChat}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16"
                viewBox="0 0 24 24" fill="none" stroke="currentColor"
                strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5"  y1="12" x2="19" y2="12" />
              </svg>
              Nuevo Chat
            </button>
          </div>

          {/* Chat list */}
          <div className="grow overflow-y-auto px-3 py-2 space-y-1.5">
            {chatHistory.length === 0 ? (
              <p
                className="text-center p-4 text-sm"
                style={{ color: theme.textMuted }}
              >
                No hay conversaciones guardadas
              </p>
            ) : (
              chatHistory.map((chat) => (
                <div key={chat.id}>
                  {editingId === chat.id ? (
                    <div className="w-full p-2">
                      <input
                        value={editValue}
                        onChange={handleEditChange}
                        onBlur={() => handleEditBlur(chat)}
                        className="w-full bg-transparent border-b-2 outline-none px-1 py-1 text-sm"
                        style={{ borderColor: theme.accent, color: theme.text }}
                        autoFocus
                        onFocus={(e) => e.target.select()}
                        onKeyDown={(e) => handleKeyDownInLeftMenu(e, chat)}
                        maxLength={100}
                        aria-label="Editar título del chat"
                        title="Editar título del chat"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full p-2.5 cursor-pointer"
                      style={currentChatId === chat.id ? itemActiveStyle : itemStyle}
                      onClick={() => { onSelectChat(chat.id); onClose(); }}
                    >
                      <div className="flex items-center justify-between gap-1">
                        {/* Title */}
                        <span
                          className="truncate text-sm font-medium flex-1 min-w-0"
                          style={{
                            color: currentChatId === chat.id
                              ? theme.accent
                              : theme.text,
                          }}
                        >
                          {truncateTitle(chat.title)}
                        </span>

                        {/* Edit button */}
                        <button
                          type="button"
                          title="Editar nombre"
                          aria-label="Editar nombre del Chat"
                          className="nm-press"
                          style={iconBtnStyle}
                          onClick={(e) => { e.stopPropagation(); handleEditClick(chat); }}
                        >
                          <img
                            src={PenIcon}
                            alt="Editar"
                            style={{
                              width: "13px",
                              height: "13px",
                              filter: isDarkTheme
                                ? "brightness(0) invert(1)"
                                : "brightness(0.4)",
                            }}
                          />
                        </button>

                        {/* Delete button */}
                        <button
                          type="button"
                          title="Eliminar Chat"
                          aria-label="Eliminar Chat"
                          className="nm-press"
                          style={iconBtnStyle}
                          onClick={(e) => { e.stopPropagation(); showDeleteConfirmation(chat.id, chat.title); }}
                        >
                          <img
                            src={TrashIcon}
                            alt="Eliminar"
                            style={{
                              width: "13px",
                              height: "13px",
                              filter: isDarkTheme
                                ? "brightness(0) invert(1)"
                                : "brightness(0.4)",
                            }}
                          />
                        </button>
                      </div>

                      {/* Date */}
                      <span
                        className="text-xs mt-1 block"
                        style={{ color: theme.textMuted }}
                      >
                        {(() => {
                          const d = new Date(chat.date);
                          const dias = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
                          const fecha = d.toLocaleDateString("es-AR", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                          });
                          const hora = d.toLocaleTimeString("es-AR", {
                            hour: "2-digit", minute: "2-digit", hour12: false,
                          });
                          return `${dias[d.getDay()]} ${fecha} · ${hora}`;
                        })()}
                      </span>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

          <PieBrand theme={theme} isDarkTheme={isDarkTheme} />
        </div>
      </div>
    </>
  );
};

export default LeftMenu;

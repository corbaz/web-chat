// Utilidades para la edición de títulos de chat
import { KeyboardEvent } from "react";

interface EditTitleUtilsConfig {
  maxLength?: number; // Longitud máxima para truncar la visualización
  onUpdateTitle: (chatId: string, newTitle: string) => void;
}

export const createTitleEditHandlers = (config: EditTitleUtilsConfig) => {
  const { maxLength = 25, onUpdateTitle } = config;

  // Función para truncar el título para visualización
  const truncateTitle = (title: string, customLength?: number): string => {
    const len = customLength || maxLength;
    return title.length > len ? title.substring(0, len) + "..." : title;
  };

  // Maneja el evento cuando se presiona una tecla durante la edición
  const handleEditKeyDown = (
    e: KeyboardEvent<HTMLInputElement>,
    chatId: string,
    editValue: string,
    onFinishEdit: () => void,
  ) => {
    // Evitar que la barra espaciadora haga perder el foco
    e.stopPropagation();

    if (e.key === "Enter" || e.key === "Escape") {
      // Evitar comportamiento predeterminado
      e.preventDefault();

      if (e.key === "Enter" && editValue.trim()) {
        // Actualizar el título y cerrar la edición
        onUpdateTitle(chatId, editValue);

        // Actualizar en localStorage también
        const chatHistoryRaw = localStorage.getItem("chat-history");
        let chatHistoryArr = chatHistoryRaw ? JSON.parse(chatHistoryRaw) : [];
        chatHistoryArr = chatHistoryArr.map(
          (c: { id: string; title: string; date: Date; model?: string }) =>
            c.id === chatId ? { ...c, title: editValue } : c,
        );
        localStorage.setItem("chat-history", JSON.stringify(chatHistoryArr));
      }

      // Cerrar la edición tanto para Enter como para Escape
      onFinishEdit();
    }
  };

  return {
    truncateTitle,
    handleEditKeyDown,
  };
};

// Constantes para los límites de caracteres en diferentes componentes
export const TITLE_LIMITS = {
  TOOLBAR: 20, // Límite para barra de herramientas
  SIDEBAR: 40, // Límite para el menú lateral
  DEFAULT: 25, // Límite predeterminado
};

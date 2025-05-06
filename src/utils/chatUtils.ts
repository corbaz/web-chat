/**
 * Utilidades para gestionar la edición de chats
 */

/**
 * Actualiza el título de un chat en localStorage y devuelve el historial actualizado
 * @param chatId ID del chat a actualizar
 * @param newTitle Nuevo título para el chat
 * @returns Array actualizado del historial de chats
 */
export const updateChatTitle = (chatId: string, newTitle: string) => {
    const chatHistoryRaw = localStorage.getItem("chat-history");
    let chatHistoryArr = chatHistoryRaw ? JSON.parse(chatHistoryRaw) : [];

    chatHistoryArr = chatHistoryArr.map(
        (c: { id: string; title: string; date: Date; model?: string }) =>
            c.id === chatId ? { ...c, title: newTitle } : c
    );

    localStorage.setItem("chat-history", JSON.stringify(chatHistoryArr));

    return chatHistoryArr;
};

/**
 * Trunca un texto para mostrar con puntos suspensivos si excede la longitud máxima
 * @param text Texto a truncar
 * @param maxLength Longitud máxima antes de truncar
 * @returns Texto truncado con puntos suspensivos o el texto original
 */
export const truncateText = (text: string, maxLength: number): string => {
    return text.length > maxLength
        ? text.substring(0, maxLength) + "..."
        : text;
};

/**
 * Maneja eventos de teclado durante la edición de un título de chat
 * @param e Evento de teclado
 * @param chat Objeto del chat que se está editando
 * @param editValue Valor actual del campo de edición
 * @param onUpdateTitle Función para actualizar el título (Opcional)
 * @param onCancel Función que se ejecuta al cancelar la edición
 * @param onSave Función que se ejecuta al guardar la edición
 */
export const handleTitleEditKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    chat: { id: string; title: string },
    editValue: string,
    onUpdateTitle?: (chatId: string, newTitle: string) => void,
    onCancel?: () => void,
    onSave?: () => void
) => {
    // Evitar que la barra espaciadora haga perder el foco
    e.stopPropagation();

    if (e.key === "Enter" || e.key === "Escape") {
        // Evitar comportamiento predeterminado
        e.preventDefault();

        if (e.key === "Enter" && editValue.trim()) {
            // Actualizar en localStorage
            updateChatTitle(chat.id, editValue);

            // Llamar a la función de actualización del componente padre si existe
            if (onUpdateTitle) {
                onUpdateTitle(chat.id, editValue);
            }

            // Ejecutar callback de guardado si existe
            if (onSave) {
                onSave();
            }
        } else if (e.key === "Escape" && onCancel) {
            // Ejecutar callback de cancelación
            onCancel();
        }
    }
};

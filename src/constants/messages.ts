/**
 * Constantes de mensajes para la aplicación
 * Este archivo centraliza mensajes reutilizables para mantener consistencia
 * y facilitar cambios futuros.
 */

/**
 * Mensaje de bienvenida que se muestra cuando se inicia un nuevo chat
 */
export const WELCOME_MESSAGE =
    "¡Hola! Soy tu asistente virtual. ¿En qué puedo ayudarte hoyyy?";

/**
 * Crea un objeto de mensaje de bienvenida estándar
 * @param modelName Opcional: nombre del modelo a utilizar
 * @returns Objeto de mensaje de bienvenida formateado
 */
export const createWelcomeMessage = (modelName?: string) => {
    const welcomeMessage = {
        id: "intro-message",
        role: "assistant" as const,
        content: WELCOME_MESSAGE,
        timestamp: Date.now(),
    };

    // Si se proporciona un nombre de modelo, lo incluimos en el objeto
    if (modelName) {
        return {
            ...welcomeMessage,
            modelName,
        };
    }

    return welcomeMessage;
};

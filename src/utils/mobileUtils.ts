/**
 * Utilidades para mejorar la experiencia en dispositivos móviles
 */

/**
 * Detecta si el usuario está navegando desde un dispositivo móvil
 * @returns {boolean} true si es un dispositivo móvil, false si es desktop
 */
export const isMobile = (): boolean => {
    // Detectar si es un dispositivo móvil por el user agent
    const userAgent = typeof window !== "undefined" ? navigator.userAgent : "";

    const mobile = Boolean(
        userAgent.match(
            /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i
        )
    );

    // También verificamos el ancho de la pantalla como método alternativo
    const isSmallScreen =
        typeof window !== "undefined" && window.innerWidth <= 768;

    return mobile || isSmallScreen;
};

/**
 * Configura los eventos necesarios para cerrar el teclado virtual en dispositivos móviles
 */
export const setupMobileKeyboardHandler = (): void => {
    // La nueva implementación personalizada maneja el teclado móvil en sus propios componentes

    // Añadir un event listener global para cerrar el teclado cuando se presiona Enter
    document.addEventListener("keydown", (e: KeyboardEvent) => {
        if (
            e.key === "Enter" &&
            !e.shiftKey &&
            document.activeElement instanceof HTMLElement
        ) {
            // Desenfocar el elemento después de un pequeño retraso para permitir que el mensaje se envíe
            setTimeout(() => {
                const activeElement = document.activeElement as HTMLElement;
                activeElement?.blur();
            }, 100);
        }
    });
};

/**
 * Cierra el teclado virtual desenfocando el elemento activo
 */
export const closeKeyboard = (): void => {
    // Desenfocar cualquier elemento activo para cerrar el teclado
    if (document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
    }

    // Solución adicional para iOS
    // Crear un input temporal, enfocarlo y desenfocarlo inmediatamente
    const tempInput = document.createElement("input");

    // Aplicar clases de Tailwind como atributos en lugar de estilos inline
    tempInput.className = "fixed w-0 h-0 opacity-0 text-base"; // Equivalente a hide-keyboard con font-size 16px

    document.body.appendChild(tempInput);
    tempInput.focus();
    tempInput.blur();

    // Eliminar el input temporal después de un breve retraso
    setTimeout(() => {
        document.body.removeChild(tempInput);
    }, 100);

    // Solución específica para Android
    if (window.navigator.userAgent.match(/Android/i)) {
        if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
        }
        document.documentElement.style.height = "100%";
        setTimeout(() => {
            document.documentElement.style.height = "";
        }, 100);
    }
};

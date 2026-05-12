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
      /Android|BlackBerry|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i,
    ),
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


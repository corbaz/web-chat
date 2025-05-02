/**
 * Constantes para dimensiones de layout de la aplicación
 * Estas constantes se utilizan tanto en el código TypeScript como en el CSS
 */

// Alturas para dispositivos móviles
export const HEADER_HEIGHT_MOBILE = 80;
export const FOOTER_HEIGHT_MOBILE = 120;

// Alturas para dispositivos desktop
export const HEADER_HEIGHT_DESKTOP = 100;
export const FOOTER_HEIGHT_DESKTOP = 144;

// Breakpoint para cambiar entre dimensiones móvil y desktop
export const DESKTOP_BREAKPOINT = 768;

// Función para generar CSS con las variables
export const generateLayoutCSS = (): string => {
    return `
  /* Variables para alturas responsive - Generadas desde layoutConstants.ts */
  :root {
    --header-height: ${HEADER_HEIGHT_MOBILE}px; /* Altura por defecto para móvil */
    --footer-height: ${FOOTER_HEIGHT_MOBILE}px; /* Altura por defecto para móvil */
  }

  /* En pantallas medianas y grandes (md y superiores) */
  @media (min-width: ${DESKTOP_BREAKPOINT}px) {
    :root {
      --header-height: ${HEADER_HEIGHT_DESKTOP}px; /* Altura para escritorio */
      --footer-height: ${FOOTER_HEIGHT_DESKTOP}px; /* Altura para escritorio */
    }
  }
  `;
};

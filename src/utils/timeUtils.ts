/**
 * Utilidades para el manejo y formateo de tiempos
 */

/**
 * Formatea milisegundos a una cadena legible
 * @param milliseconds Tiempo en milisegundos
 * @returns Tiempo formateado (ej: "250ms" o "2.5s")
 */
export const formatResponseTime = (milliseconds: number): string => {
  if (milliseconds < 1000) {
    return `${milliseconds}ms`;
  } else {
    const seconds = (milliseconds / 1000).toFixed(2);
    return `${seconds}s`;
  }
};


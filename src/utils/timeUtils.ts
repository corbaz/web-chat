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

/**
 * Formatea una fecha timestamp a un formato legible
 * @param timestamp Timestamp en milisegundos
 * @returns Fecha formateada (ejemplo: "15:30" o "Ayer 15:30")
 */
export const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp);
    const now = new Date();

    const isToday = date.toDateString() === now.toDateString();
    const isYesterday =
        new Date(now.setDate(now.getDate() - 1)).toDateString() ===
        date.toDateString();

    const hours = date.getHours().toString().padStart(2, "0");
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const timeString = `${hours}:${minutes}`;

    if (isToday) {
        return timeString;
    } else if (isYesterday) {
        return `Ayer ${timeString}`;
    } else {
        const day = date.getDate().toString().padStart(2, "0");
        const month = (date.getMonth() + 1).toString().padStart(2, "0");
        return `${day}/${month} ${timeString}`;
    }
};

import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// https://vite.dev/config/
export default defineConfig({
    // Configura base como './' para generar rutas relativas en lugar de absolutas
    base: "./",
    plugins: [react(), tailwindcss()],
    build: {
        // Límite de advertencia de tamaño de chunk a 500kB
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                // Configuración de chunks manuales para optimizar el tamaño
                manualChunks: {
                    // Chunk para React y React DOM
                    vendor: ["react", "react-dom"],
                    // Chunk para la librería de chat
                    chat: ["deep-chat-react"],
                    // Chunk para utilidades como axios
                    utils: ["axios"],
                },
                // Optimizar los nombres de los chunks
                chunkFileNames: "assets/[name]-[hash].js",
                // Optimizar los nombres de los archivos de salida
                entryFileNames: "assets/[name]-[hash].js",
                // Optimizar los nombres de los archivos de assets
                assetFileNames: "assets/[name]-[hash].[ext]",
            },
        },
    },
});

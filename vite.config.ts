import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

// https://vite.dev/config/
export default defineConfig({
    // Configura base como './' para generar rutas relativas en lugar de absolutas
    base: './',
    plugins: [react(), tailwindcss()],
    build: {
        // Directorio de salida para GitHub Pages
        outDir: 'docs',
        // Límite de advertencia de tamaño de chunk a 500kB
        chunkSizeWarningLimit: 500,
        rollupOptions: {
            output: {
                // Configuración de chunks manuales para optimizar el tamaño
                manualChunks: (id: string) => {
                    if (id.includes('react') || id.includes('react-dom')) return 'vendor';
                    if (id.includes('axios')) return 'utils';
                    if (id.includes('react-markdown') || id.includes('remark-gfm')) return 'markdown';
                },
                // Optimizar los nombres de los chunks
                chunkFileNames: 'assets/[name]-[hash].js',
                // Optimizar los nombres de los archivos de salida
                entryFileNames: 'assets/[name]-[hash].js',
                // Optimizar los nombres de los archivos de assets
                assetFileNames: 'assets/[name]-[hash].[ext]',
            },
        },
    },
});

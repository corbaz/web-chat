import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import basicSsl from '@vitejs/plugin-basic-ssl';

const getBuenosAiresVersion = (): string => {
    const date = new Date();
    // Ajustar a GMT-3 (Buenos Aires)
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    const baDate = new Date(utc + (3600000 * -3));
    
    const yy = String(baDate.getFullYear()).slice(-2);
    const mm = String(baDate.getMonth() + 1).padStart(2, '0');
    const dd = String(baDate.getDate()).padStart(2, '0');
    const hh = String(baDate.getHours()).padStart(2, '0');
    const min = String(baDate.getMinutes()).padStart(2, '0');
    
    return `v.${yy}.${mm}${dd} build ${hh}${min}`;
};

// https://vite.dev/config/
export default defineConfig({
    // Configura base como './' para generar rutas relativas en lugar de absolutas
    base: './',
    plugins: [react(), tailwindcss(), basicSsl()],
    define: {
        __APP_VERSION__: JSON.stringify(getBuenosAiresVersion()),
    },
    server: {
        host: '0.0.0.0',
        port: 5173,
        strictPort: true,
        hmr: {
            protocol: 'wss',
            clientPort: 5173,
        },
        proxy: {
            '/opencode-go-api': {
                target: 'https://opencode.ai',
                changeOrigin: true,
                rewrite: (path) => path.replace(/^\/opencode-go-api/, ''),
            }
        }
    },
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

import { defineConfig, type Plugin } from 'vite';
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

// Mismo endpoint que api/frame-check.ts (Vercel) para `bun run dev`: el
// chat pregunta si una página se puede mostrar en su modal (ver
// src/utils/frameCheck.ts). Se carga con ssrLoadModule para no mezclar los
// tipos del navegador en el tsconfig de Node.
const frameCheckDevEndpoint = (): Plugin => ({
    name: 'frame-check-dev-endpoint',
    configureServer(server) {
        server.middlewares.use('/api/frame-check', async (req, res) => {
            const target = new URL(req.url ?? '', 'http://localhost').searchParams.get('url') ?? '';
            const { checkFrameable } = await server.ssrLoadModule('/src/utils/frameCheck.ts');
            const framable = await checkFrameable(target);
            res.setHeader('content-type', 'application/json');
            res.end(JSON.stringify({ framable }));
        });
    },
});

// https://vite.dev/config/
export default defineConfig({
    // Configura base como './' para generar rutas relativas en lugar de absolutas
    base: './',
    plugins: [react(), tailwindcss(), basicSsl(), frameCheckDevEndpoint()],
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
        // Directorio de salida (ignorado en git; Vercel arma el build solo)
        outDir: 'dist',
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

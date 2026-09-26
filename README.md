# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md) uses [Babel](https://babeljs.io/) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default tseslint.config({
  extends: [
    // Remove ...tseslint.configs.recommended and replace with this
    ...tseslint.configs.recommendedTypeChecked,
    // Alternatively, use this for stricter rules
    ...tseslint.configs.strictTypeChecked,
    // Optionally, add this for stylistic rules
    ...tseslint.configs.stylisticTypeChecked,
  ],
  languageOptions: {
    // other options...
    parserOptions: {
      project: ['./tsconfig.node.json', './tsconfig.app.json'],
      tsconfigRootDir: import.meta.dirname,
    },
  },
})
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default tseslint.config({
  plugins: {
    // Add the react-x and react-dom plugins
    'react-x': reactX,
    'react-dom': reactDom,
  },
  rules: {
    // other rules...
    // Enable its recommended typescript rules
    ...reactX.configs['recommended-typescript'].rules,
    ...reactDom.configs.recommended.rules,
  },
})
```
# Web-Chat con Vite, React y Tailwind

```cmd
bun create vite@latest web-chat
```

## Configuración

```json
# package.json
{
    "name": "web-chat",
    "private": true,
    "version": "v.2.7",
    "type": "module",
    "scripts": {
        "bun-install": "bun install",
        "bun-upgrade": "bun upgrade && bunx -y npm-check-updates",
        "ncu": "npx -y npm-check-updates -u && bun update",
        "dev": "vite --host",
        "build": "tsc -b && vite build --outDir ./docs",
        "lint": "eslint .",
        "preview": "vite preview --host",
        "deploy": "surge docs --domain deepchat.surge.sh"
    },
    "dependencies": {
        "@tailwindcss/vite": "^4.1.6",
        "axios": "^1.9.0",
        "react": "^19.1.0",
        "react-dom": "^19.1.0",
        "react-select": "^5.10.1",
        "sweetalert2": "^11.21.0",
        "tailwindcss": "^4.1.6"
    },
    "devDependencies": {
        "@eslint/js": "^9.26.0",
        "@types/react": "^19.1.4",
        "@types/react-dom": "^19.1.4",
        "@vitejs/plugin-react": "^4.4.1",
        "eslint": "^9.26.0",
        "eslint-plugin-react-hooks": "^5.2.0",
        "eslint-plugin-react-refresh": "^0.4.20",
        "globals": "^16.1.0",
        "typescript": "~5.8.3",
        "typescript-eslint": "^8.32.1",
        "vite": "^6.3.5"
    }
}
```

```bash
bun install tailwindcss @tailwindcss/vite
```

## Instalar Tailwind CSS

Como complemento de Vite es la forma más sencilla de integrarlo con marcos como Laravel, SvelteKit, React Router, Nuxt y SolidJS.

* 01 - Instalar Tailwind CSS

  ```bash
  bun install tailwindcss @tailwindcss/vite
  ```

* 02 - Configurar el complemento Vite

  Añade el @tailwindcss/vite plugin a tu configuración de Vite.

  ```typescript
  # vite.config.ts
  import { defineConfig } from 'vite'
  import tailwindcss from '@tailwindcss/vite'
  export default defineConfig({
    plugins: [
      tailwindcss(),
    ],
  })
  ```

* 03 - Importar CSS de Tailwind

  Agregue un @import a su archivo CSS que importe Tailwind CSS.

  ```css
  # src/styles.css
  @import "tailwindcss";
  ```

* 04 - Comience su proceso de construcción

  Ejecute su proceso de compilación con bun run dev o cualquier comando que esté configurado en su archivo package.json.

  ```bash
  bun run dev
  ```

* 05 - Comience a utilizar Tailwind en su HTML

  Asegúrese de que su CSS compilado esté incluido en el elemento head (su marco podría encargarse de esto por ti), luego comience a usar las clases de utilidad de Tailwind para darle estilo a su contenido.

  ```html
  <!doctype html>
  <html>
  <head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <link href="/src/styles.css" rel="stylesheet">
  </head>
  <body>
    <h1 class="text-3xl font-bold underline">
      Hello world!
    </h1>
    {/* Botón de limpieza en la barra de herramientas */}
    <button
        onClick={handleClearText}
        className={`p-1 rounded-full flex items-center justify-center transition-opacity duration-200 ${
            message.length > 0
                ? "opacity-100"
                : "opacity-50 cursor-not-allowed"
        }`}
        style={{
            backgroundColor:
                message.length > 0
                    ? theme.button.background
                    : isDarkTheme
                    ? "rgba(255, 255, 255, 0.1)"
                    : "rgba(0, 0, 0, 0.08)",
            color: theme.button.text,
        }}
        disabled={message.length === 0}
        title="Borrar mensaje"
    >
        <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            className="w-5 h-5"
        >
            <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
            />
        </svg>
    </button>
    {/* Botón de enviar mensaje */}
    <button
          onClick={handleSendMessage}
          title="Enviar Pregunta"
          className={`absolute p-2 rounded-full flex items-center justify-center ${
              message.trim() && !isLoading
                  ? "opacity-100"
                  : "opacity-50 cursor-not-allowed"
          }`}
          style={{
              backgroundColor: theme.button.background,
              color: theme.button.text,
              right: "8px", // Ajuste horizontal
              top: "50%", // Posicionar en el centro vertical
              transform: "translateY(-50%)", // Centrar perfectamente
          }}
          disabled={!message.trim() || isLoading}
      >
          <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              stroke-width="1.5"
              stroke="currentColor"
              className="w-5 h-5"
          >
              <path
                  stroke-linecap="round"
                  stroke-linejoin="round"
                  d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5"
              ></path>
          </svg>
    </button>
  </body>
  </html>
  ```

```cmd
curl -X GET "https://api.groq.com/openai/v1/models" \
     -H "Authorization: Bearer API_KEY" \
     -H "Content-Type: application/json"
```

### Console API Groq

API Key: https://console.groq.com/keys [![Groq](https://img.shields.io/badge/Groq-API-blue?style=flat&logo=groq)](https://console.groq.com/keys)

---

### Catálogo dinámico de modelos

La lista de modelos de cada proveedor se consulta a su API `/models` al iniciar la app y cada vez que se agrega o cambia una API key (evento `apikey-changed`). El resultado se guarda en `localStorage` (`modelCatalog:v1:<proveedor>`), así que la app arranca con la última lista conocida y la actualiza en segundo plano. Si la API falla o devuelve una lista vacía, se conserva la lista anterior o, en su defecto, el catálogo estático de `src/components/HEADER/models/`.

| Proveedor | Endpoint | Key | Filtro |
|---|---|---|---|
| OpenCode Zen | `opencode.ai/zen/v1/models` | Sí | Modelos de chat pagos del workspace; se excluyen los gratis (`-free`, `big-pickle`), `jev-*` y los internos de prueba (`test*`) |
| OpenCode Go | `opencode.ai/zen/go/v1/models` | Sí | Todos |
| OpenCode Free | `<servidor local>/config/providers` | Sí (password del servidor local) | Ids `-free` y `big-pickle` del provider `opencode`, sin `jev-*` |
| Groq | `api.groq.com/openai/v1/models` | Sí | Activos, sin audio, TTS ni guards |
| Gemini | `generativelanguage.googleapis.com/v1beta/models` | Sí | Solo Flash / Flash Lite con `generateContent` |
| OpenAI | `api.openai.com/v1/models` | Sí | `gpt-*`, `chatgpt-*` y serie o, sin snapshots fechados |
| Anthropic | `api.anthropic.com/v1/models` | Sí | Todos |

RouteLLM usa solo su catálogo estático.

Los modelos gratis de OpenCode Zen (ids `-free`, `big-pickle`) no están disponibles por API directa: OpenCode solo los sirve a peticiones que parecen un agente de código con herramientas declaradas y responde `FreeTierError` a cualquier otro cliente, con o sin API key. Están disponibles igual a través de un servidor local (`opencode serve`) como proveedor "OpenCode Free": ver sección propia más abajo.

Los modelos que ya están en el catálogo estático conservan sus metadatos (nombre, contexto, precio); los nuevos se muestran con un nombre derivado del ID. En OpenCode Zen, el endpoint de chat depende de la familia del modelo (`src/services/modelCatalog/zenRoute.ts`): Claude y Qwen usan `/messages`, GPT, Grok y Muse usan `/responses`, Gemini usa `/models/<id>` y el resto `/chat/completions`.

En OpenCode Go (`src/services/modelCatalog/zenRoute.ts`, `goRouteFor`) GPT, Grok y Muse usan `/responses`, MiniMax y Qwen usan `/messages` y el resto `/chat/completions`. Go exige el header `x-opencode-session`, estable por conversación: la app envía el ID del chat. La búsqueda web se habilita solo en los modelos de Go que buscaron en la prueba en vivo (GPT Luna, Grok 4.6/4.7, Hy3, Hy4, Kimi K2.6/K3, MiMo V2.5, MiniMax M3); en `/chat/completions` Go usa la herramienta `web_search_preview`. En Zen está desactivada hasta poder verificarla.

Si un proveedor rechaza un modelo que igual aparece en su `/models` (por ejemplo Groq con "blocked at the project level" o un modelo retirado), la app lo oculta del selector y lo recuerda en `localStorage` (`modelCatalog:v1:unavailable:<proveedor>`). Guardar de nuevo una API key vuelve a mostrar todos los modelos ocultos.

Código: `src/services/modelCatalog/`. Tests: `bun test`.

---

### OpenCode Free (servidor local)

OpenCode solo sirve sus modelos gratis (`opencode.ai/zen`, ids `-free` y `big-pickle`) a peticiones que parecen un agente de código con herramientas declaradas; el resto recibe `FreeTierError`. La app los usa igual arrancando un `opencode serve` propio, aislado, en la PC del usuario, con permisos `ask` en `bash`/`edit`/`webfetch`/`external_directory`: eso hace que OpenCode los sirva, pero ninguna herramienta se ejecuta sin autorización explícita (ver Permisos más abajo).

Instalación (Windows, requiere [OpenCode](https://opencode.ai) instalado):

```bash
bun run opencode:free:install   # registra el autoarranque y arranca el servidor ahora
bun run opencode:free           # alternativa: correrlo en primer plano, para debug manual
bun run opencode:free:uninstall # quita el autoarranque y detiene el servidor
```

`opencode:free:install` copia un lanzador oculto a la carpeta Inicio de Windows (arranca solo al iniciar sesión, sin permisos de administrador), inicia el servidor ahora e imprime la URL (`http://127.0.0.1:4096` por defecto) y una password generada una sola vez. Esos dos valores se pegan en Configuración > OpenCode Free.

El servidor corre en una carpeta dedicada (`%LOCALAPPDATA%\prompting\opencode-free`) con su propio `opencode.json` (permisos `ask`) y su propia password (Basic auth, usuario `opencode`); nunca en la carpeta del proyecto ni compartiendo configuración con OpenCode Desktop. Queda atado a `127.0.0.1`, así que solo responde a peticiones desde la misma PC: el sitio en Vercel funciona con este proveedor únicamente si el navegador permite que esa pestaña llame a `127.0.0.1` (Private Network Access puede bloquearlo; en desarrollo local (`https://localhost:5173`) siempre funciona).

**Permisos**: cuando el modelo pide ejecutar algo (por ejemplo un comando de `bash`), la respuesta queda bloqueada hasta que el usuario responde un modal ("El modelo quiere ejecutar: …") con **Rechazar** (por defecto) o **Permitir una vez**. Nada se ejecuta sin ese permiso explícito.

`opencode:free:password` copia la contraseña al portapapeles para pegarla en la app. Para usar una contraseña propia: `bun run opencode:free:password MiClave` (mínimo 6 caracteres, sin espacios); guarda la clave, actualiza el lanzador y reinicia el servidor. En la app, OpenCode Free pide esa contraseña, no una API key.

`opencode:free:uninstall` quita el lanzador de la carpeta Inicio y detiene el proceso, pero solo si sigue escuchando en el puerto del sandbox (127.0.0.1:4096) y su nombre de proceso contiene "opencode": nunca toca OpenCode Desktop.

Código: `scripts/opencode-free/` (autoarranque), `src/services/opencodeLocal/` (cliente + settings + mapa de sesiones), `src/components/HEADER/OpenCodeFreeStatus.tsx` (indicador de conexión). Tests: `bun test`.

---

### Entrada de imágenes (modelos con visión)

Con un modelo compatible con visión seleccionado aparece un botón de adjuntar en el footer (📎) y se puede pegar una imagen con Ctrl+V; se admiten hasta 4 imágenes por mensaje en `image/png`, `image/jpeg`, `image/webp` e `image/gif`. Las imágenes se redimensionan en el navegador (canvas) a un lado largo máximo de 2048&nbsp;px y, si el base64 resultante supera ~3.5&nbsp;MB, se reenconden a JPEG calidad 0.85 (Groq limita 4&nbsp;MB de base64 por petición). También se puede enviar solo una imagen sin texto: el mensaje viaja con un texto por defecto ("Describe la imagen.") únicamente en la petición a la API, no en lo que se muestra en el chat.

Qué modelos aceptan imágenes sale de [models.dev](https://models.dev), que publica por modelo las modalidades de entrada. `bun run update:vision` descarga esa información y regenera `src/config/visionModels.generated.ts`; conviene correrlo cuando los proveedores suman modelos. Para un modelo que models.dev todavía no conoce se usa una regla por prefijo (`claude-*`, `gemini-*`, `gpt-4o*`/`gpt-4.1*`/`gpt-5*`/`o3*`/`o4*`, o IDs con `vision`/`omni`).

En el selector de modelos y en el menú derecho, los modelos con visión llevan un ícono de ojo en violeta (`accentAlt` del tema), junto al globo de búsqueda web.

Estado al 2026-09-25: Groq 1 de 4 modelos del catálogo (`qwen/qwen3.8-27b`), OpenCode Go 26 de 42, OpenCode Zen 65 de 81, todos los Claude y los Gemini del catálogo. RouteLLM no tiene modelos con visión.

Con un modelo sin visión no se muestra el botón de adjuntar y pegar una imagen no hace nada especial (el pegado de texto normal sigue funcionando igual). Cada proveedor recibe las imágenes en el formato de su protocolo: `image_url` (Chat Completions: Groq, OpenCode Go/Zen genérico, RouteLLM), `input_image` (Responses API: OpenAI, OpenCode Go/Zen `responses`), bloques `image` en base64 (Anthropic Messages: Anthropic, OpenCode Go/Zen `messages`) o `inline_data` (Gemini `generateContent`: Gemini, OpenCode Zen `gemini`). Si la búsqueda web de Gemini está activa y el mensaje lleva imágenes, la petición usa `generateContent` en vez del endpoint `interactions` de búsqueda, porque este último no acepta imágenes.

**Las imágenes nunca se guardan en `localStorage`** (la cuota es de ~5&nbsp;MB): al persistir el historial se descartan los adjuntos y solo queda un marcador "[imagen]" junto al mensaje, así que al recargar la página o cambiar de chat se ve que se envió una imagen pero no se puede volver a abrir.

Código: `src/config/vision.ts` (capacidad por modelo), `src/config/providers.ts` (formato por protocolo), `src/components/FOOTER/Footer.tsx` (adjuntar/pegar/redimensionar). Tests: `bun test`.

---

### Repositorio en GitHub
Repositorio: https://github.com/corbaz/web-chat [![GitHub](https://img.shields.io/badge/GitHub-Repo-blue?style=flat&logo=github)](https://github.com/corbaz/web-chat)

---

### Deploy
Deploy en surge: https://deepchat.surge.sh/ [![Surge](https://img.shields.io/badge/Surge-Deploy-blue?style=flat&logo=surge)](https://deepchat.surge.sh/)

Deploy en github pages: https://corbaz.github.io/web-chat/

Deploy en Vercel: https://prompting-chat.vercel.app/

OpenCode (Go y Zen) no acepta llamadas directas desde el navegador (CORS), por eso necesita un intermediario. En desarrollo lo hace el proxy de Vite (`/opencode-go-api`). En producción solo Vercel lo tiene: `vercel.json` reenvía `/opencode-go-api/*` a `https://opencode.ai/*`, y el proyecto de Vercel define `VITE_OPENCODE_PROXY_URL=/opencode-go-api`. En Surge y GitHub Pages, que son hosting estático, OpenCode se oculta.

El proyecto de Vercel está conectado al repositorio: cada push a `main` publica automáticamente. Para publicar a mano:

```bash
bun run deploy:vercel
``` [![GitHub Pages](https://img.shields.io/badge/GitHub%20Pages-Deploy-blue?style=flat&logo=github)](https://corbaz.github.io/web-chat/)
  
---
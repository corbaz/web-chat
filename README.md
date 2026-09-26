# Prompting

Chat web con varios proveedores de IA en un solo lugar: Groq, OpenAI, Anthropic, Gemini, RouteLLM, OpenCode Go, OpenCode Zen y OpenCode Free. Cada usuario usa sus propias API keys, que se guardan solo en su navegador.

[![Vercel](https://img.shields.io/badge/Vercel-prompting--chat-black?style=flat&logo=vercel)](https://prompting-chat.vercel.app/) [![GitHub](https://img.shields.io/badge/GitHub-corbaz%2Fweb--chat-blue?style=flat&logo=github)](https://github.com/corbaz/web-chat)

| Sitio | Dirección |
|---|---|
| App publicada | https://prompting-chat.vercel.app/ |
| Repositorio | https://github.com/corbaz/web-chat |
| Desarrollo local | https://localhost:5173 (`bun run dev`) |

Vercel es el único hosting. Surge (`deepchat.surge.sh`) y GitHub Pages se dieron de baja el 2026-09-26.

---

## Qué hace

- **Catálogo de modelos siempre al día**: al abrir la app y cada vez que se guarda una API key, pide la lista de modelos a cada proveedor.
- **Visión**: se pueden pegar (Ctrl+V) o adjuntar (📎) imágenes en los modelos que las aceptan (ícono de ojo 👁).
- **Búsqueda web nativa**: en los modelos que la soportan (ícono de globo 🌐), el proveedor busca en internet y la respuesta muestra las fuentes.
- **Estadísticas de tokens** con el límite de contexto real de cada modelo.
- **Modelos gratis de OpenCode** a través de un servidor local de OpenCode ("OpenCode Free").
- **Modelos que el proveedor rechaza** para tu cuenta (bloqueados, retirados, sin acceso) se ocultan solos del selector.
- **Varita mágica** (botón "Mejorar Prompt"): mejora la redacción del prompt con el modelo y el proveedor elegidos (no disponible en OpenCode Free).
- Tema claro y oscuro, historial de chats en el navegador.

---

## Proveedores

| Proveedor | Dónde se saca la key | 🌐 Web | 👁 Visión | Notas |
|---|---|---|---|---|
| Groq | https://console.groq.com/keys | GPT-OSS 120B, 20B y Safeguard | `qwen/qwen3.8-27b` | Cada proyecto de Groq puede bloquear modelos en *Settings → Project → Limits* |
| OpenAI | https://platform.openai.com/api-keys | Todos | Todos | |
| Anthropic | https://console.anthropic.com/settings/keys | Todos | Todos | |
| Gemini | https://aistudio.google.com/app/apikey | Todos | Todos | Solo modelos Flash / Flash Lite (los Pro tienen cuotas muy bajas). La suscripción Google AI Pro **no** incluye la API |
| RouteLLM | https://routellm.abacus.ai/ | No | No | Catálogo fijo |
| OpenCode Go | https://opencode.ai (suscripción Go) | 10 modelos verificados | 26 modelos | Necesita el intermediario de Vercel (o el proxy de desarrollo) |
| OpenCode Zen | https://opencode.ai/docs/zen/ (saldo) | Sin verificar | 32 modelos | Cobra por uso del saldo de Zen. Sin saldo responde "Insufficient account funds" |
| OpenCode Free | No usa API key: contraseña del servidor local | No | No | Modelos gratis de Zen. Ver [OpenCode Free](#opencode-free-servidor-local) |

Detalle modelo por modelo, al 2026-09-26:

- **Búsqueda web en OpenCode Go** (probada en vivo): `gpt-5.6-luna`, `gpt-6-luna`, `grok-4.6`, `grok-4.7`, `hy3`, `hy4-preview`, `kimi-k2.6`, `kimi-k3`, `mimo-v2.5`, `minimax-m3`. En `/chat/completions` Go usa la herramienta `web_search_preview`.
- **Visión**: sale de [models.dev](https://models.dev) (`src/config/visionModels.generated.ts`). Para un modelo que models.dev todavía no conoce se usa una regla por prefijo (`claude-*`, `gemini-*`, `gpt-4o*`/`gpt-4.1*`/`gpt-5*`/`o3*`/`o4*`, o IDs con `vision`/`omni`).
- **Límite de contexto**: también sale de models.dev (`src/config/modelLimits.generated.ts`); si un modelo no figura, se usan los datos del catálogo fijo y, en último caso, 8192.

Para actualizar la información de visión y límites cuando los proveedores suman modelos:

```bash
bun run update:models
```

---

## Desarrollo local

Requisitos: [Bun](https://bun.sh) 1.4 o superior.

```bash
bun install
bun run dev      # https://localhost:5173 (certificado local de Vite)
```

| Script | Qué hace |
|---|---|
| `bun run dev` | Servidor de desarrollo con proxy a OpenCode (`/opencode-go-api`) |
| `bun run build` | Chequeo de tipos (`tsc -b`) y build a `dist/` |
| `bun run typecheck` | Solo chequeo de tipos (`tsc -b`) |
| `bun test` | Tests (runner de Bun) |
| `bun run check` | Biome: lint + formato con corrección |
| `bun run deploy` | Publica en Vercel a mano (`vercel deploy --prod`) |
| `bun run update:models` | Regenera visión y límites desde models.dev (alias: `update:vision`) |
| `bun run ncu` | Actualiza dependencias a su última versión |
| `bun run opencode:free:install` | Instala y arranca el servidor local de OpenCode Free |
| `bun run opencode:free:password [clave]` | Copia la contraseña al portapapeles, o la cambia |
| `bun run opencode:free:uninstall` | Quita el servidor local de OpenCode Free |
| `bun run opencode:free` | Corre el servidor local en primer plano (debug) |

Convenciones del proyecto:

- **Bun** como gestor de paquetes (nunca npm, yarn ni pnpm) y **versiones exactas** en `package.json` (sin `^` ni `~`).
- **Biome** para lint y formato. Un hook de pre-commit (`.githooks/pre-commit`) corre Biome sobre los archivos en stage y los re-stagea.
- Commits en formato convencional (`feat:`, `fix:`, `chore:`, `docs:`).

---

## Deploy

El proyecto de Vercel (`prompting`) está conectado al repositorio: **cada push a `main` publica automáticamente**. El build va a `dist/`, que está ignorado en git.

OpenCode (Go y Zen) no acepta llamadas directas desde el navegador (CORS), así que necesita un intermediario:

- **Desarrollo:** el proxy de Vite reenvía `/opencode-go-api/*` a `https://opencode.ai/*`.
- **Producción:** `vercel.json` hace lo mismo con un *rewrite*, y el proyecto de Vercel define `VITE_OPENCODE_PROXY_URL=/opencode-go-api`.

Por eso OpenCode Go y Zen solo funcionan en Vercel y en local, no en un hosting estático.

---

## Catálogo dinámico de modelos

La lista de modelos de cada proveedor se consulta a su API `/models` al iniciar la app y cada vez que se agrega o cambia una API key (evento `apikey-changed`). El resultado se guarda en `localStorage` (`modelCatalog:v1:<proveedor>`): la app arranca con la última lista conocida y la actualiza en segundo plano. Si la API falla o devuelve una lista vacía, se conserva la lista anterior o, en su defecto, el catálogo fijo de `src/components/HEADER/models/`.

| Proveedor | Endpoint | Filtro |
|---|---|---|
| Groq | `api.groq.com/openai/v1/models` | Activos, sin audio, TTS ni guards |
| OpenAI | `api.openai.com/v1/models` | `gpt-*`, `chatgpt-*` y serie o, sin snapshots con fecha |
| Anthropic | `api.anthropic.com/v1/models` | Todos |
| Gemini | `generativelanguage.googleapis.com/v1beta/models` | Solo Flash / Flash Lite con `generateContent` |
| OpenCode Go | `opencode.ai/zen/go/v1/models` | Todos |
| OpenCode Zen | `opencode.ai/zen/v1/models` | Modelos pagos del workspace; sin gratis (`-free`, `big-pickle`), `jev-*` ni los internos de prueba (`test*`) |
| OpenCode Free | `<servidor local>/config/providers` | IDs `-free` y `big-pickle`, sin `jev-*` |
| RouteLLM | — | Catálogo fijo |

Los modelos del catálogo fijo conservan sus datos (nombre, precio, velocidad); los nuevos se muestran con un nombre armado a partir del ID.

**Ruta de chat en OpenCode** (depende de la familia del modelo, `src/services/modelCatalog/zenRoute.ts`):

| | `/responses` | `/messages` | `/models/<id>` (Gemini) | `/chat/completions` |
|---|---|---|---|---|
| Zen | GPT, Grok, Muse | Claude, Qwen (menos `qwen3.8-max`) | Gemini | El resto |
| Go | GPT, Grok, Muse | MiniMax, todos los Qwen | — | El resto |

OpenCode Go exige el header `x-opencode-session`, estable por conversación: la app envía el ID del chat.

**Modelos rechazados:** si un proveedor rechaza un modelo que igual aparece en su lista (por ejemplo Groq con "blocked at the project level", un modelo retirado, o "Model is unavailable"), la app lo oculta del selector y lo recuerda en `localStorage` (`modelCatalog:v1:unavailable:<proveedor>`). Guardar de nuevo una API key vuelve a mostrar los modelos ocultos.

Código: `src/services/modelCatalog/`.

---

## Entrada de imágenes

Con un modelo con visión seleccionado aparece el botón 📎 y se puede pegar una imagen con Ctrl+V. Hasta 4 imágenes por mensaje (`png`, `jpeg`, `webp`, `gif`). Las imágenes se achican en el navegador a 2048 px de lado largo y, si siguen pesando más de ~3,5 MB, se pasan a JPEG (Groq acepta hasta 4 MB por imagen). Se puede mandar una imagen sin texto.

Cada proveedor recibe las imágenes en el formato de su protocolo: `image_url` (Chat Completions), `input_image` (Responses), bloques `image` en base64 (Anthropic Messages) o `inline_data` (Gemini). Con una imagen, Gemini no usa la búsqueda web en ese mensaje.

**Las imágenes no se guardan en el historial** del navegador (la cuota es de ~5 MB): al recargar, el mensaje muestra "📎 [imagen]".

Código: `src/config/vision.ts`, `src/config/providers.ts`, `src/components/FOOTER/Footer.tsx`.

---

## OpenCode Free (servidor local)

OpenCode solo entrega sus modelos gratis (`-free`, `big-pickle`) a pedidos que parecen de un **agente de programación con herramientas**. Por API directa, con o sin key, responde `FreeTierError`. La app los usa a través de un `opencode serve` que corre en tu PC.

**Instalación** (Windows, requiere [OpenCode](https://opencode.ai) instalado):

```bash
bun run opencode:free:install    # arranque automático con Windows + arranca ahora
bun run opencode:free:password   # copia la contraseña al portapapeles
```

Después, en la app: elegir **OpenCode Free**, pegar la contraseña y **Guardar contraseña**. Al lado del selector de proveedor, un punto indica si el servidor responde (🟢) o no (🔴).

- **Arranque automático:** un lanzador oculto en la carpeta Inicio de Windows (no necesita administrador).
- **Carpeta propia:** `%LOCALAPPDATA%\prompting\opencode-free`, con su `opencode.json` y su contraseña. Solo escucha en `127.0.0.1:4096`, y solo acepta la app desde `https://localhost:5173` y `https://prompting-chat.vercel.app`.
- **Contraseña propia:** `bun run opencode:free:password MiClave` (mínimo 6 caracteres, sin espacios) la cambia y reinicia el servidor.
- **Agente "chat":** el servidor usa un agente que le indica al modelo responder sin usar herramientas, y no carga tu configuración global de OpenCode (`XDG_CONFIG_HOME` apunta a una carpeta vacía). Las herramientas siguen declaradas en modo "preguntar", porque sin eso OpenCode no entrega los modelos gratis.
- **Permisos:** si un modelo igual pide ejecutar algo, la app muestra "El modelo quiere ejecutar: …" con **Rechazar** (por defecto) o **Permitir una vez**. Nada se ejecuta sin tu permiso.
- **Desinstalar:** `bun run opencode:free:uninstall` quita el arranque automático y apaga el servidor, sin tocar OpenCode Desktop.

Límites: funciona solo en la PC donde corre el servidor, sin imágenes, búsqueda web ni varita mágica. Cada mensaje incluye ~25.000 tokens de contexto interno de OpenCode.

Código: `scripts/opencode-free/`, `src/services/opencodeLocal/`, `src/components/HEADER/OpenCodeFreeStatus.tsx`.

---

## Estructura

```
scripts/
  opencode-free/            servidor local de OpenCode Free (instalar, contraseña, desinstalar)
  update-vision-models.ts   genera visión y límites desde models.dev
src/
  components/               interfaz (HEADER, FOOTER, chat, ApiKeyModal)
  config/                   proveedores, búsqueda web, visión, límites generados
  services/modelCatalog/    catálogo dinámico, fetchers por proveedor, rutas de OpenCode
  services/opencodeLocal/   cliente del servidor local de OpenCode Free
  utils/                    tokens, tiempos, layout
odd/tasks/                  documentos de cada feature (tareas, decisiones y verificación)
```

---

## Cambios recientes (septiembre 2026)

- Catálogo dinámico de modelos para todos los proveedores con API.
- Nuevo proveedor OpenCode Zen; OpenCode Go con header de sesión y rutas por familia.
- OpenCode Free con servidor local, arranque automático, agente "chat" y permisos.
- Entrada de imágenes para modelos con visión, detectados desde models.dev.
- Búsqueda web habilitada solo en los modelos verificados en vivo.
- Límites de contexto reales desde models.dev (antes muchos modelos mostraban 8192).
- Modelos rechazados por el proveedor se ocultan solos.
- Groq: solo los modelos disponibles hoy; se quitó `compound` (apagado por Groq).
- ESLint reemplazado por Biome; build sin commitear; Vercel como único hosting.

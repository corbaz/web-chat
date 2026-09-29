# Prompting

Chat web con varios proveedores de IA en un solo lugar: Groq, OpenAI, Anthropic, Gemini, RouteLLM, OpenCode Go, OpenCode Zen, OpenCode Free, Claude (suscripción) y OpenAI (suscripción). Cada usuario usa sus propias API keys, que se guardan solo en su navegador.

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
- **Archivos de texto y PDF**: el botón 📎 también adjunta Markdown, texto plano, CSV, JSON y código, y PDFs (nativos en los modelos que los aceptan, ícono de PDF 📄; como texto extraído en el resto), en cualquier proveedor y modelo.
- **Búsqueda web nativa**: en los modelos que la soportan (ícono de globo 🌐), el proveedor busca en internet y la respuesta muestra las fuentes.
- **Links sin salir del chat**: los links de las respuestas y de las fuentes se abren en un modal dentro del chat, adaptado a cualquier pantalla y con botón para abrirlos en otra pestaña (Ctrl+clic o clic del medio abren directo la pestaña). Google Maps (📍, incluido "Cómo llegar") y YouTube se muestran con su versión embebible. Para el resto, la app consulta antes `/api/frame-check` (función de Vercel; en `bun run dev` lo responde Vite): si el sitio no permite mostrarse dentro de otra página (GitHub, OpenStreetMap, etc.), el modal lo avisa y ofrece la pestaña nueva. La página embebida no puede reemplazar la app. Las imágenes de markdown `![descripción](url)` se muestran con vista previa y se amplían con un clic; si la URL no carga, queda como link. Todos los proveedores reciben la misma instrucción: ante un pedido de mapa o dirección, responder con un link de Google Maps (ningún modelo genera capturas de mapas).
- **Estadísticas de tokens** con el límite de contexto real de cada modelo.
- **Costo de cada respuesta** (💲): al lado de los tokens, cuánto costó el mensaje (entrada + salida) con el precio público del modelo en models.dev (USD por millón de tokens, con los tramos por tamaño de contexto). Los precios los resume `/api/prices` (función de Vercel; en `bun run dev` lo responde Vite, ~13 KB en vez de los 5 MB de models.dev) y el navegador los renueva una vez por día, al abrir la app o al cambiar de modelo. El costo queda guardado en el mensaje. Claude y OpenAI por suscripción muestran el equivalente por API ("incluido en tu suscripción"; en Claude, el costo exacto que informa `claude -p`); OpenCode Free muestra "Gratis"; un modelo sin precio publicado no muestra costo. No descuenta la caché de entrada, así que puede sobrestimar un poco.
- **Modelos gratis de OpenCode** a través de un servidor local de OpenCode ("OpenCode Free").
- **Claude por tu suscripción de Claude Code** (sin API key) a través de un bridge local ("Claude (suscripción)").
- **OpenAI por tu suscripción de ChatGPT** (sin API key) a través de un bridge local ("OpenAI (suscripción)").
- **Modelos que el proveedor rechaza** para tu cuenta (bloqueados, retirados, sin acceso) se ocultan solos del selector.
- **Varita mágica** (botón "Mejorar Prompt"): mejora la redacción del prompt con el modelo y el proveedor elegidos (no disponible en OpenCode Free; en Claude (suscripción) siempre usa Haiku).
- **10 salas de chat** (cajitas 1-10 al lado del selector de modelo): cada una es un chat independiente, con su propio proveedor, modelo, búsqueda web, YOLO y respuestas en curso; cambiar de sala nunca interrumpe una que está esperando respuesta. Las cajitas muestran si esa sala está pensando, tiene una respuesta sin leer o un permiso pendiente.
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
| Claude (suscripción) | No usa API key: contraseña del bridge local | Todos | Todos | Corre `claude -p` con tu suscripción de Claude Code. Ver [Claude (suscripción)](#claude-suscripción-bridge-local) |
| OpenAI (suscripción) | No usa API key: contraseña del bridge local | Todos | Todos | Corre `codex app-server` con tu suscripción de ChatGPT. Sin PDF nativo (fallback a texto). Ver [OpenAI (suscripción)](#openai-suscripción-bridge-local) |

Detalle modelo por modelo, al 2026-09-26:

- **Búsqueda web en OpenCode Go** (probada en vivo): `gpt-5.6-luna`, `gpt-6-luna`, `grok-4.6`, `grok-4.7`, `hy3`, `hy4-preview`, `kimi-k2.6`, `kimi-k3`, `mimo-v2.5`, `minimax-m3`. En `/chat/completions` Go usa la herramienta `web_search_preview`.
- **Visión**: sale de [models.dev](https://models.dev) (`src/config/visionModels.generated.ts`). Para un modelo que models.dev todavía no conoce se usa una regla por prefijo (`claude-*`, `gemini-*`, `gpt-4o*`/`gpt-4.1*`/`gpt-5*`/`o3*`/`o4*`, o IDs con `vision`/`omni`).
- **PDF nativo**: mismo criterio, con `modalities.input` incluyendo `pdf` (`src/config/pdfModels.generated.ts`, `src/config/pdf.ts`). Snapshot al 2026-09-28: Anthropic 15/15, OpenAI 19/52, Gemini 20/39, OpenCode Zen 45/112, OpenCode Go 6/33, Groq 0/16.
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
| `bun run update:models` | Regenera visión, PDF y límites desde models.dev (alias: `update:vision`) |
| `bun run ncu` | Actualiza dependencias a su última versión |
| `bun run opencode:free:install` | Instala y arranca el servidor local de OpenCode Free (Windows; en Mac usar `scripts/opencode-free/mac.sh`) |
| `bun run opencode:free:password [clave]` | Copia la contraseña al portapapeles, o la cambia |
| `bun run opencode:free:uninstall` | Quita el servidor local de OpenCode Free |
| `bun run opencode:free` | Corre el servidor local en primer plano (debug) |
| `bun run claude:bridge` | Corre el bridge local de Claude (suscripción) — arranque manual, sin autostart |
| `bun run build:bridge` | Regenera `scripts/claude-bridge/claude-bridge.js`, el bundle standalone (ver [Claude (suscripción) sin el repo](#claude-suscripción-sin-el-repo)) |
| `bun run codex:bridge` | Corre el bridge local de OpenAI (suscripción) — arranque manual, sin autostart |
| `bun run build:codex-bridge` | Regenera `scripts/codex-bridge/codex-bridge.js`, el bundle standalone (ver [OpenAI (suscripción) sin el repo](#openai-suscripción-sin-el-repo)) |

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
| OpenAI (suscripción) | `<bridge local>/models` | Todos los que devuelve `model/list` de `codex app-server`, sin ocultos |
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

## Nivel de esfuerzo por proveedor

El slider de esfuerzo (entre el selector de proveedor y el de modelo) ya no es exclusivo de Claude (suscripción): desde esta tarea (T17, 2026-09-28) aparece para **todo** proveedor con modelos de razonamiento (Groq, OpenAI, Anthropic, Gemini, OpenCode Go, OpenCode Zen), con los niveles que cada modelo soporta según [models.dev](https://models.dev) (`src/config/modelEffort.generated.ts`, regenerado con `bun run update:models`). Un modelo sin niveles ahí no muestra el slider.

**Parámetro por protocolo** (`src/config/providers.ts`), enviado solo cuando hay un nivel elegido — un pedido sin esfuerzo queda byte-idéntico al de antes:

| Protocolo | Proveedores/rutas | Parámetro |
|---|---|---|
| Chat Completions | Groq, OpenAI (sin adjuntos/búsqueda), OpenCode Go/Zen (ruta "el resto") | `reasoning_effort` (top-level) |
| Responses API | OpenAI (con adjuntos o búsqueda), OpenCode Go/Zen (ruta GPT/Grok/Muse) | `reasoning.effort` |
| Messages API | Anthropic, OpenCode Go/Zen (ruta Claude/Qwen/MiniMax) | `output_config.effort` |
| Gemini `generateContent` | Gemini, OpenCode Zen (ruta Gemini) | `generationConfig.thinkingConfig.thinkingLevel` (Gemini 3.x) o `.thinkingBudget` (Gemini 2.5, numérico) |

**Modelo y esfuerzo por defecto** (`src/config/modelDefaults.ts`), usados cuando el proveedor no tiene modelo guardado y cuando el modelo resuelto no tiene esfuerzo guardado (la elección guardada por el usuario siempre gana):

| Proveedor | Modelo por defecto | Esfuerzo por defecto |
|---|---|---|
| Claude (suscripción) | `claude-opus-5-5` | Medio |
| OpenAI (suscripción) | `gpt-5.6-sol` (coincide con `isDefault: true` de `model/list` al verificar, 2026-09-28) | Medio |
| Groq | `qwen/qwen3.8-27b` | Medio |
| OpenCode Go | `glm-5.3-flash` | Alto *(GLM no tiene "medio": low/high/max, se eligió el del medio)* |
| OpenCode Zen | `glm-5.3` | Alto *(mismo motivo)* |
| Gemini | `gemini-3.6-flash` | Medio |

Si el modelo por defecto todavía no llegó al catálogo (o el proveedor lo retiró), se usa el primero disponible; si el esfuerzo por defecto no es válido para el modelo resuelto, se usa el más bajo. OpenAI, Anthropic y RouteLLM no tienen default propio (siguen usando el primer modelo del catálogo).

**Verificado en vivo** (2026-09-28, con las keys de `~/.local/share/opencode/auth.json`):

| Proveedor | Modelo | Esfuerzo | Ruta | Resultado |
|---|---|---|---|---|
| Groq | `qwen/qwen3.8-27b` | Medio | chat | Aceptado (HTTP 200) |
| Groq | `openai/gpt-oss-20b` | Medio | chat | Aceptado (HTTP 200) |
| OpenCode Go | `glm-5.3-flash` | Alto | chat | Aceptado (HTTP 200) |
| OpenCode Go | `kimi-k3` | Máximo | chat | Aceptado (HTTP 200) |
| OpenCode Go | `gpt-5.6-luna` | Medio | responses | Aceptado (HTTP 200) |
| OpenCode Go | `minimax-m3` | Medio | messages | Aceptado (HTTP 200) — sin niveles en `MODEL_EFFORT` hoy, así que el slider no se muestra igual |
| OpenCode Zen | `glm-5.3` | Alto | chat | No probado: cuenta sin saldo (HTTP 402); usa los mismos builders que Go |
| Gemini | `gemini-3.6-flash` | Medio | generateContent | No probado: la key guardada rechaza incluso un pedido sin esfuerzo (HTTP 400 `API_KEY_INVALID`, problema de la key en sí, no de este parámetro) |
| OpenAI, Anthropic | — | — | — | Sin key de API disponible (solo login OAuth de suscripción en `auth.json`); implementado según la documentación de cada uno, sin probar en vivo |

Código: `src/config/{effort,effortSettings,modelDefaults}.ts`, `src/config/providers.ts`, `src/components/HEADER/EffortSelector.tsx`.

---

## Entrada de imágenes

Con un modelo con visión seleccionado aparece el botón 📎 y se puede pegar una imagen con Ctrl+V. Hasta 4 imágenes por mensaje (`png`, `jpeg`, `webp`, `gif`). Las imágenes se achican en el navegador a 2048 px de lado largo y, si siguen pesando más de ~3,5 MB, se pasan a JPEG (Groq acepta hasta 4 MB por imagen). Se puede mandar una imagen sin texto.

Cada proveedor recibe las imágenes en el formato de su protocolo: `image_url` (Chat Completions), `input_image` (Responses), bloques `image` en base64 (Anthropic Messages) o `inline_data` (Gemini). Con una imagen, Gemini no usa la búsqueda web en ese mensaje.

**Las imágenes no se guardan en el historial** del navegador (la cuota es de ~5 MB): al recargar, el mensaje muestra "📎 [imagen]".

Código: `src/config/vision.ts`, `src/config/providers.ts`, `src/components/FOOTER/Footer.tsx`.

---

## Entrada de archivos (texto y PDF)

El botón 📎 (visible en todos los modelos, no solo los que tienen visión) también adjunta:

- **Texto y código**: `.md`, `.markdown`, `.txt`, `.csv`, `.json`, `.xml`, `.yaml`/`.yml`, `.log` y código común (`.js`, `.ts`, `.tsx`, `.jsx`, `.py`, `.java`, `.go`, `.rs`, `.sql`, `.html`, `.css`, `.sh`, `.ps1`). Se leen en el navegador como UTF-8. En el chat se muestran como etiquetas arriba del texto (igual que las imágenes) y el contenido se agrega recién al armar el pedido a la API, como un bloque con fences ("Archivo: nombre.ext" + el contenido). Tope de ~200 KB por archivo y ~1 MB en total entre archivos de texto (y PDF pasado a texto) por mensaje.
- **PDF**: en los modelos que lo aceptan como entrada nativa (ícono 📄 junto al ojo/globo en el selector) viaja el archivo entero en el formato de cada protocolo (`document` en Anthropic Messages, `input_file` en OpenAI Responses, `file` en OpenAI Chat Completions, `inline_data` en Gemini — el mismo mecanismo que las imágenes). En el resto de los modelos, el texto se extrae en el navegador con [pdf.js](https://mozilla.github.io/pdf.js/) (carga perezosa, en su propio chunk) y se manda como un archivo de texto más; la miniatura marca "nativo" o "texto".

Hasta 4 imágenes + 4 archivos por mensaje. Los archivos se ven como etiquetas (📄 PDF, 📝 texto) arriba del cuadro de texto antes de enviar y arriba del texto en la burbuja del mensaje; al tocarlas se abre una vista previa dentro de la app (texto con scroll, o el PDF). Las imágenes también se amplían en un modal propio: abrir un `data:` en otra pestaña queda en blanco porque Chrome y Edge lo bloquean.

Mientras la página está abierta, el contenido de los archivos de texto se sigue mandando en las preguntas siguientes. En el historial del navegador solo se guarda el texto de archivos chicos (hasta 20 KB cada uno y 40 KB por mensaje); de los más grandes queda el nombre ("sin contenido guardado"). Las imágenes y los PDF nativos nunca se guardan.

Código: `src/config/pdf.ts`, `src/utils/{attachmentText,pdfText,blobUrl}.ts`, `src/config/providers.ts`, `src/components/FOOTER/Footer.tsx`, `src/components/chat/{ImageLightbox,FilePreviewModal}.tsx`.

---

## OpenCode Free (servidor local)

OpenCode solo entrega sus modelos gratis (`-free`, `big-pickle`) a pedidos que parecen de un **agente de programación con herramientas**. Por API directa, con o sin key, responde `FreeTierError`. La app los usa a través de un `opencode serve` que corre en tu PC.

**Instalación** (requiere [OpenCode](https://opencode.ai) instalado y abierto al menos una vez con un modelo gratis). Hay instaladores de un solo archivo, que no necesitan Bun ni el repo:

| Sistema | Instalar | Contraseña | Desinstalar |
|---|---|---|---|
| Windows | `windows.bat` | `windows.bat password [NUEVA]` | `windows.bat uninstall` |
| macOS | `bash mac.sh` | `bash mac.sh password [NUEVA]` | `bash mac.sh uninstall` |
| Windows, desde el repo | `bun run opencode:free:install` | `bun run opencode:free:password [NUEVA]` | `bun run opencode:free:uninstall` |

Los archivos están en [`scripts/opencode-free/`](scripts/opencode-free/). Sin argumento, `password` copia la contraseña al portapapeles; con una clave nueva, la cambia y reinicia el servidor. La contraseña puede tener letras, números y `. _ - * @ # + = ?`, con un mínimo de 6 caracteres.

- **Windows:** crea `%LOCALAPPDATA%\prompting\opencode-free` y pone un lanzador oculto en la carpeta Inicio, así el servidor arranca solo al iniciar sesión (no necesita administrador).
- **macOS:** crea `~/Library/Application Support/prompting/opencode-free` y registra un LaunchAgent (`com.prompting.opencode-free`), que arranca el servidor al iniciar sesión y lo reinicia si se cae. El log queda en `server.log` dentro de esa carpeta.

Después, en la app: elegir **OpenCode Free**, pegar la contraseña y **Guardar contraseña**. Al lado del selector de proveedor, un punto indica si el servidor responde (🟢) o no (🔴).

- **Carpeta propia**, con su `opencode.json` y su contraseña. Solo escucha en `127.0.0.1:4096`, y solo acepta la app desde `https://localhost:5173` y `https://prompting-chat.vercel.app`.
- **Agente "chat":** el servidor usa un agente que le indica al modelo responder sin usar herramientas, y no carga tu configuración global de OpenCode (`XDG_CONFIG_HOME` apunta a una carpeta vacía). Las herramientas siguen declaradas en modo "preguntar", porque sin eso OpenCode no entrega los modelos gratis.
- **Permisos:** si un modelo igual pide ejecutar algo, la app muestra "El modelo quiere ejecutar: …" con **Rechazar** (por defecto) o **Permitir una vez**. Nada se ejecuta sin tu permiso.
- **Desinstalar:** quita el arranque automático y apaga el servidor, sin tocar OpenCode Desktop.

Límites: funciona solo en la PC donde corre el servidor, sin imágenes, búsqueda web ni varita mágica. Cada mensaje incluye ~25.000 tokens de contexto interno de OpenCode.

Código: `scripts/opencode-free/`, `src/services/opencodeLocal/`, `src/components/HEADER/OpenCodeFreeStatus.tsx`.

---

## Arranque manual de los servidores locales (resumen)

**Instalador para Mac (un solo comando):** revisa Bun, OpenCode, Claude Code y Codex CLI (si falta alguno pregunta antes de instalarlo), crea la carpeta de OpenCode Free y baja `claude-bridge.js` y `codex-bridge.js`. Se puede repetir para actualizar los puentes.

```bash
curl -fsSL https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/install-mac.sh | bash
```

OpenCode Free, Claude (suscripción) y OpenAI (suscripción) se arrancan a mano, cada uno en su terminal, y pueden correr los tres a la vez (puertos distintos: 4096, 4098, 4094). **La contraseña la elegís vos y va en el comando**; en la app, cada proveedor lleva la misma contraseña que usaste en su comando. Usá comillas simples en Mac y PowerShell, y `set "VAR=..."` en cmd, para que caracteres como `*` no se interpreten.

| | Mac | Windows (cmd) |
|---|---|---|
| **OpenCode Free** (puerto 4096) | `cd ~/Library/Application\ Support/prompting/opencode-free && XDG_CONFIG_HOME="$PWD/config-home" OPENCODE_SERVER_PASSWORD='TuClave' opencode serve --port 4096 --hostname 127.0.0.1 --cors https://localhost:5173 --cors https://prompting-chat.vercel.app` | `cd /d "%LOCALAPPDATA%\prompting\opencode-free" && set "XDG_CONFIG_HOME=%LOCALAPPDATA%\prompting\opencode-free\config-home" && set "OPENCODE_SERVER_PASSWORD=TuClave" && opencode serve --port 4096 --hostname 127.0.0.1 --cors https://localhost:5173 --cors https://prompting-chat.vercel.app` |
| **Claude (suscripción)** (puerto 4098) | `cd ~/Library/Application\ Support/prompting/claude-bridge && CLAUDE_BRIDGE_PASSWORD='TuClave' bun claude-bridge.js` | Con el repo: `cd /d C:\www\web-chat && set "CLAUDE_BRIDGE_PASSWORD=TuClave" && bun scripts/claude-bridge/server.ts` |
| **OpenAI (suscripción)** (puerto 4094) | `cd ~/Library/Application\ Support/prompting/codex-bridge && CODEX_BRIDGE_PASSWORD='TuClave' bun codex-bridge.js` | Con el repo: `cd /d C:\www\web-chat && set "CODEX_BRIDGE_PASSWORD=TuClave" && bun scripts/codex-bridge/server.ts` |

Preparación, una sola vez:

- **OpenCode Free:** la carpeta con su `opencode.json` la crea el instalador (`windows.bat` / `bash mac.sh`, ver [OpenCode Free](#opencode-free-servidor-local)); después se puede arrancar siempre a mano con el comando de arriba.
- **Claude (suscripción) en Mac sin el repo:** instalar Bun, iniciar sesión en Claude Code y bajar el bridge:

  ```bash
  curl -fsSL https://bun.sh/install | bash
  mkdir -p ~/Library/Application\ Support/prompting/claude-bridge
  cd ~/Library/Application\ Support/prompting/claude-bridge
  curl -fsSLO https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/claude-bridge/claude-bridge.js
  ```

- **OpenAI (suscripción) en Mac sin el repo:** instalar Bun, iniciar sesión en Codex CLI y bajar el bridge:

  ```bash
  curl -fsSL https://bun.sh/install | bash
  mkdir -p ~/Library/Application\ Support/prompting/codex-bridge
  cd ~/Library/Application\ Support/prompting/codex-bridge
  curl -fsSLO https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/codex-bridge/codex-bridge.js
  ```

Si no pasás contraseña, cada bridge (Claude u OpenAI) genera una la primera vez y la muestra al arrancar.

---

## Claude (suscripción, bridge local)

Chatea con Claude usando tu propia suscripción de **Claude Code** (no una API key de Anthropic): la app le habla a un bridge local que corre `claude -p` en modo headless. Nota sobre los términos: usar la suscripción de Claude Code desde una app de terceros no es el uso previsto por Anthropic; es para uso personal y bajo tu propio riesgo.

**Requisitos:** [Claude Code](https://claude.com/claude-code) instalado y con sesión iniciada (`claude`, luego `/login`).

**Arranque manual** (sin autostart, sin servicio, sin carpeta Inicio/LaunchAgent — a diferencia de OpenCode Free):

```bash
bun run claude:bridge
```

La consola imprime la URL (`http://127.0.0.1:4098` por defecto) y la contraseña generada. Con `CLAUDE_BRIDGE_PASSWORD=miclave bun run claude:bridge` se fija una contraseña propia en vez de la generada.

Después, en la app: elegir **Claude (suscripción)**, pegar la contraseña y **Guardar contraseña**. Al lado del selector de proveedor, un punto indica si el bridge responde (🟢) o no (🔴).

- **Todos los modelos de Anthropic:** el selector lista cada modelo de chat de Claude (ids completos, p. ej. `claude-sonnet-5`, `claude-opus-5-5`, `claude-haiku-4-5`), tomados de [models.dev](https://models.dev) y regenerados con `bun run update:models`. Se prefiere el id sin fecha cuando existe (se descarta el duplicado con fecha) y el modelo por defecto es un Sonnet. Los 4 alias históricos (`haiku`, `sonnet`, `opus`, `fable`) se siguen aceptando en el bridge por compatibilidad, pero ya no aparecen en el selector.
  - **Claude Fable** necesita créditos de uso además de la suscripción: si tu cuenta no los tiene, el modelo queda en la lista pero la app muestra el mensaje de error de Claude Code tal cual (no se oculta como "no disponible").
- **Nivel de esfuerzo (`--effort`):** slider entre el proveedor y el modelo, con los niveles que ese modelo soporta según models.dev (entre `Bajo`/`Medio`/`Alto`/`Muy alto`/`Máximo` según el modelo; el mismo slider ya no es exclusivo de Claude, ver [Nivel de esfuerzo por proveedor](#nivel-de-esfuerzo-por-proveedor)). Sin "Por defecto": todo modelo con niveles arranca en el esfuerzo por defecto del proveedor (Medio para Claude) si es válido para ese modelo, o si no en el más bajo, y se recuerda por modelo en el navegador (si la elección guardada ya no es válida para el modelo actual, se recalcula con el mismo criterio). La varita mágica no usa nivel de esfuerzo.
- **Visión:** todos los modelos de Claude aceptan imágenes (📎, hasta 4 por mensaje, PNG/JPEG/WEBP/GIF). El bridge las manda en modo `--input-format stream-json` en vez del modo de texto normal; el límite de tamaño del cuerpo sube a ~16 MB solo para pedidos con imágenes.
- **PDF nativo:** todos los modelos de Claude también aceptan PDF (📎, hasta 4 por mensaje): el bridge acepta un campo `documents` (base64) y los manda como bloques `document` en el mismo mensaje stream-json que las imágenes. Los archivos de texto (Markdown, código, etc.) no viajan aparte: llegan ya insertados dentro del mensaje.
- **Siempre usa la suscripción:** el bridge quita `ANTHROPIC_API_KEY`, `ANTHROPIC_AUTH_TOKEN`, `ANTHROPIC_BASE_URL` y las variables de Bedrock/Vertex/Foundry solo para el `claude` que lanza (y lo avisa al arrancar). Si estuvieran definidas, `claude -p` usaría esa autenticación en vez de tu login y podía quedarse colgado hasta el timeout.
- **Fecha y hora:** cada mensaje le pasa al modelo la fecha y hora actual de Buenos Aires (y la hora UTC), así puede responder "¿qué hora es?" sin ejecutar nada.
- **Herramientas con permiso:** Bash, WebFetch y WebSearch, nunca Edit/Write/Read/NotebookEdit. WebFetch y WebSearch se auto-aprueban (son de solo lectura); **Bash siempre pregunta**, con un modal (Rechazar es la opción por defecto) mientras el mensaje está en curso. Cada comando corre en la carpeta de datos del bridge, nunca en la del repo del usuario. Claude Code aprueba por su cuenta algunos comandos de solo lectura (por ejemplo `echo` o `dir`) sin pasar por el modal; todo lo que escribe, borra o cambia algo pregunta.
  - **YOLO:** un toggle junto al selector de esfuerzo (⚠️ rojo cuando está activo) salta el modal y auto-aprueba todo lo que el modelo pida ejecutar, sin preguntar — sigue sin habilitar herramientas de archivos. Apagado por defecto, nunca se guarda (recargar la página lo apaga), y activarlo muestra una advertencia una vez por carga de página. Mismo toggle para OpenCode Free.
- **Fecha y hora actuales:** cada pedido manda la fecha/hora de Argentina (America/Argentina/Buenos_Aires) y la hora UTC en el system prompt, así el modelo sabe qué día es sin tener que preguntar o usar Bash para averiguarlo.
- **Solo escucha en `127.0.0.1:4098`**, con Basic auth en todos los endpoints y CORS restringido a `https://localhost:5173` y `https://prompting-chat.vercel.app`.
- **Historial por sesión:** cada chat de la app reutiliza un `sessionId` de Claude Code (`--resume`) para mantener el contexto entre mensajes.

Límites: funciona solo en la PC donde corre el bridge. La varita mágica siempre usa Haiku con una sesión nueva (sin `--resume`), no manda imágenes y nunca pide permiso (si el modelo intentara usar Bash para "mejorar el texto", cosa que no debería pasar, el pedido se corta por timeout en vez de quedar esperando un modal que la varita no muestra).

Código: `scripts/claude-bridge/`, `src/services/claudeBridge/`, `src/services/permissionModal.ts`, `src/config/{effort,effortSettings,vision}.ts`, `src/components/HEADER/{ClaudeCodeStatus,EffortSelector,YoloToggle}.tsx`.

### Claude (suscripción) sin el repo

Para usar el bridge en una máquina que no tiene este repositorio (por ejemplo, otra computadora tuya), alcanza con un solo archivo: `scripts/claude-bridge/claude-bridge.js`, un bundle standalone (generado con `bun run build:bridge`, sin minificar) que no importa nada del repo en tiempo de ejecución — solo módulos nativos de Node/Bun (`crypto`, `fs`, `os`, `path`).

**macOS:**

```bash
curl -fsSL https://bun.sh/install | bash
```

Instalá [Claude Code](https://claude.com/claude-code) y corré `claude` y luego `/login` para iniciar sesión con tu suscripción. Después, descargá el bundle y arrancá el bridge:

```bash
curl -fsSLo claude-bridge.js https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/claude-bridge/claude-bridge.js
CLAUDE_BRIDGE_PASSWORD='tu contraseña' bun claude-bridge.js
```

Si la contraseña tiene espacios o caracteres especiales, encerrala entre comillas simples como en el ejemplo.

**Windows (PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Instalá Claude Code y corré `claude` y luego `/login`. Después:

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/claude-bridge/claude-bridge.js -OutFile claude-bridge.js
$env:CLAUDE_BRIDGE_PASSWORD = 'tu contraseña'
bun claude-bridge.js
```

Igual que en Mac, las comillas simples protegen espacios y caracteres especiales en la contraseña.

**Windows (cmd):** la variable de entorno se fija distinto — comillas dobles envolviendo todo el `set`, no comillas simples:

```cmd
set "CLAUDE_BRIDGE_PASSWORD=tu contraseña"
bun claude-bridge.js
```

En cualquiera de los tres casos, la consola imprime la URL y la contraseña (si no la fijaste vos) igual que con `bun run claude:bridge`; en la app, dejá la URL del bridge en `http://127.0.0.1:4098`. El bridge solo escucha en la propia PC, así que la app tiene que abrirse en esa misma máquina.

---

## OpenAI (suscripción, bridge local)

Chatea con OpenAI usando tu propia suscripción de **ChatGPT** (no una API key de OpenAI): la app le habla a un bridge local que corre `codex app-server` (Codex CLI, protocolo JSON-RPC sobre stdio) en modo headless. Nota sobre los términos: usar la suscripción de ChatGPT desde una app de terceros no es el uso previsto por OpenAI; es para uso personal y bajo tu propio riesgo.

**Requisitos:** [Codex CLI](https://developers.openai.com/codex/cli) instalado y con sesión iniciada (`codex`, seguí el login de ChatGPT).

**Arranque manual** (sin autostart, sin servicio, sin carpeta Inicio/LaunchAgent):

```bash
bun run codex:bridge
```

La consola imprime la URL (`http://127.0.0.1:4094` por defecto) y la contraseña generada. Con `CODEX_BRIDGE_PASSWORD=miclave bun run codex:bridge` se fija una contraseña propia en vez de la generada.

Después, en la app: elegir **OpenAI (suscripción)**, pegar la contraseña y **Guardar contraseña**. Al lado del selector de proveedor, un punto indica si el bridge responde (🟢) o no (🔴).

- **Proceso único y persistente:** a diferencia de Claude (suscripción), que lanza un `claude -p` por mensaje, acá se levanta **un solo** `codex app-server` al arrancar el bridge y se reusa para todos los chats: cada turno de cada chat viaja por la misma conexión JSON-RPC, multiplexada por `threadId`. Si el proceso se cae, el bridge lo reinicia solo (2s de espera) y vuelve a mandar `initialize`.
- **Todos los modelos que ofrece `model/list`:** el selector se arma en vivo consultando `GET /models` del bridge (catálogo dinámico, ver [Catálogo dinámico de modelos](#catálogo-dinámico-de-modelos)); el modelo por defecto es el más nuevo `gpt-*` de chat general que la propia lista marca como `isDefault` (verificado en vivo 2026-09-28: `gpt-5.6-sol`).
- **Nivel de esfuerzo:** slider entre el proveedor y el modelo, con los niveles que ese modelo reporta en `model/list` (`supportedReasoningEfforts`) — no sale de models.dev como en el resto de los proveedores, porque Codex los expone directo. Guardado en `src/services/codexBridge/capabilities.ts` (en memoria, se repuebla en cada refresh del catálogo).
- **Visión:** los modelos que declaran `image` en `inputModalities` (📎, hasta 4 por mensaje, PNG/JPEG/WEBP/GIF, verificado en vivo). El protocolo de `codex app-server` no acepta base64 embebido: el bridge escribe cada imagen a un archivo temporal (`%LOCALAPPDATA%\prompting\codex-bridge\images\` en Windows) y la manda como `localImage` con esa ruta; el archivo se borra apenas responde el turno.
- **Sin PDF nativo:** el protocolo de Codex no tiene un tipo `document`/PDF en su `UserInput` (a diferencia de Claude Code) — los PDF siempre viajan como texto extraído con pdf.js, igual que en cualquier proveedor sin PDF nativo (ver [Entrada de archivos](#entrada-de-archivos-texto-y-pdf)).
- **Aislado de tu configuración de Codex:** usa tu login de ChatGPT, pero arranca `codex app-server` sin tus servidores MCP (`-c mcp_servers={}`) y con las funciones de agente de escritorio apagadas (uso de la computadora, navegador, plugins, skills, memorias, etc.; lista en `CODEX_DISABLED_FEATURES` de `scripts/codex-bridge/args.ts`). Además manda instrucciones propias de asistente de chat, con la fecha y hora de Argentina, que reemplazan las tuyas. Sin esto, un pedido como "una imagen de Google Maps de X" se respondía con pasos para configurar Chrome. Codex no genera imágenes ni capturas: para un mapa, responde con un link de Google Maps.
- **Tokens:** la entrada que se muestra es la de la **última** llamada al modelo del turno (`tokenUsage.last`). Un turno con búsqueda web o comandos hace varias llamadas, y cada una reenvía todo el contexto, así que sumarlas daba más del 100% del límite.
- **Siempre usa la suscripción:** el bridge quita `OPENAI_API_KEY` y `OPENAI_BASE_URL` solo para el `codex` que lanza (y lo avisa al arrancar). Si estuvieran definidas, Codex podía usar esa autenticación en vez de tu login de ChatGPT.
- **Comandos con permiso:** cuando el modelo quiere ejecutar algo, el bridge expone el mismo contrato que Claude (suscripción) (`GET /permission` + `POST /permission/:id`, mismo modal, Rechazar por defecto). El sandbox es el único control de alcance (no hay una lista de herramientas permitidas como en Claude Code): `read-only` por defecto (el modelo puede leer pero no escribir ni tiene red, salvo búsqueda web), `workspace-write` solo en YOLO.
  - **YOLO:** mismo toggle que Claude (suscripción) y OpenCode Free — auto-aprueba sin preguntar (`approvalPolicy: "never"`, sandbox `workspace-write`), apagado por defecto y nunca se guarda.
- **Búsqueda web:** siempre activa. El bridge arranca Codex con `web_search="live"` y le indica buscar cuando la pregunta necesita información actual (noticias, precios, resultados). Verificado en vivo (2026-09-29): trae las noticias del día con links a las fuentes. Una respuesta con búsqueda tarda más (10 a 45 s).
- **Solo escucha en `127.0.0.1:4094`**, con Basic auth en todos los endpoints y CORS restringido a `https://localhost:5173` y `https://prompting-chat.vercel.app`.
- **Historial por sesión:** cada chat de la app reutiliza un `threadId` de Codex (`thread/resume`) para mantener el contexto entre mensajes.

**Riesgos y límites conocidos** (verificado en vivo 2026-09-28, Codex CLI 0.158.0 en Windows 11):

- **Costo por mensaje alto:** cada turno paga el contexto fijo del agente Codex (MCP servers, hooks, skill registry) además de la conversación — se vieron pedidos de 38.000 a más de 200.000 tokens de entrada para mensajes cortos, bastante más que Claude (suscripción) (~38.000 fijos). Puede consumir la cuota de ChatGPT rápido en una sesión con varios turnos con herramientas.
- **Ejecución de comandos rota en Windows:** en la máquina de prueba, el "unified exec" de Codex CLI 0.158.0 falla al lanzar cualquier comando (`helper_unknown_error: setup refresh had errors`), tanto aprobado a mano como en YOLO. El flujo de aprobación (pedir, denegar, aprobar) funciona perfecto — el modelo recibe la decisión y sigue la conversación sin colgarse — pero el comando en sí no corre. Es un bug del propio Codex CLI en este entorno, no del bridge; puede no reproducirse en Mac o en otra versión de Codex CLI.
- **Búsqueda web sin probar en vivo:** implementada según el schema (sandbox con `networkAccess: true`), pero no se confirmó que el modelo efectivamente busque y devuelva fuentes.
- **Solo texto/imagen:** sin PDF nativo ni documentos (ver arriba).

Código: `scripts/codex-bridge/`, `src/services/codexBridge/`, `src/services/permissionModal.ts`, `src/config/{effort,vision,pdf,webSearch}.ts`, `src/components/HEADER/{CodexSubStatus,EffortSelector,YoloToggle}.tsx`.

### OpenAI (suscripción) sin el repo

Para usar el bridge en una máquina que no tiene este repositorio, alcanza con un solo archivo: `scripts/codex-bridge/codex-bridge.js`, un bundle standalone (generado con `bun run build:codex-bridge`, sin minificar) que no importa nada del repo en tiempo de ejecución — solo módulos nativos de Node/Bun (`crypto`, `fs`, `os`, `path`).

**macOS:**

```bash
curl -fsSL https://bun.sh/install | bash
```

Instalá [Codex CLI](https://developers.openai.com/codex/cli) y corré `codex` para iniciar sesión con tu suscripción de ChatGPT. Después, descargá el bundle y arrancá el bridge:

```bash
curl -fsSLo codex-bridge.js https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/codex-bridge/codex-bridge.js
CODEX_BRIDGE_PASSWORD='tu contraseña' bun codex-bridge.js
```

Si la contraseña tiene espacios o caracteres especiales, encerrala entre comillas simples como en el ejemplo.

**Windows (PowerShell):**

```powershell
powershell -c "irm bun.sh/install.ps1 | iex"
```

Instalá Codex CLI y corré `codex` para iniciar sesión. Después:

```powershell
Invoke-WebRequest -Uri https://raw.githubusercontent.com/corbaz/web-chat/main/scripts/codex-bridge/codex-bridge.js -OutFile codex-bridge.js
$env:CODEX_BRIDGE_PASSWORD = 'tu contraseña'
bun codex-bridge.js
```

Igual que en Mac, las comillas simples protegen espacios y caracteres especiales en la contraseña.

**Windows (cmd):** la variable de entorno se fija distinto — comillas dobles envolviendo todo el `set`, no comillas simples:

```cmd
set "CODEX_BRIDGE_PASSWORD=tu contraseña"
bun codex-bridge.js
```

En cualquiera de los tres casos, la consola imprime la URL y la contraseña (si no la fijaste vos) igual que con `bun run codex:bridge`; en la app, dejá la URL del bridge en `http://127.0.0.1:4094`. El bridge solo escucha en la propia PC, así que la app tiene que abrirse en esa misma máquina.

---

## Estructura

```
scripts/
  opencode-free/            servidor local de OpenCode Free (instalar, contraseña, desinstalar)
  claude-bridge/            bridge local a `claude -p` (incluye claude-bridge.js, el bundle standalone)
  codex-bridge/             bridge local a `codex app-server` (incluye codex-bridge.js, el bundle standalone)
  update-vision-models.ts   genera visión, PDF y límites desde models.dev
src/
  components/               interfaz (HEADER, FOOTER, chat, ApiKeyModal)
  config/                   proveedores, búsqueda web, visión, PDF, límites generados
  services/modelCatalog/    catálogo dinámico, fetchers por proveedor, rutas de OpenCode
  services/opencodeLocal/   cliente del servidor local de OpenCode Free
  services/claudeBridge/    cliente del bridge local de Claude (suscripción)
  services/codexBridge/     cliente del bridge local de OpenAI (suscripción)
  utils/                    tokens, tiempos, layout, adjuntos de texto/PDF
odd/tasks/                  documentos de cada feature (tareas, decisiones y verificación)
```

---

## Cambios recientes (septiembre 2026)

- Catálogo dinámico de modelos para todos los proveedores con API.
- Nuevo proveedor OpenCode Zen; OpenCode Go con header de sesión y rutas por familia.
- OpenCode Free con servidor local, arranque automático, agente "chat" y permisos.
- Claude (suscripción) con bridge local a `claude -p`: todos los modelos, slider de esfuerzo, visión, fecha y hora, navegación web, comandos con permiso y toggle YOLO.
- Claude (suscripción) con bridge local a `claude -p` (arranque manual, sin API key de Anthropic).
- OpenAI (suscripción) con bridge local a `codex app-server`: todos los modelos, esfuerzo y visión en vivo desde `model/list`, comandos con permiso y toggle YOLO (sin PDF nativo); búsqueda web en vivo.
- Costo de cada respuesta con precios de models.dev renovados una vez por día.
- Links y fuentes en un modal dentro del chat (con chequeo de si el sitio se deja embeber); mapas de Google Maps y videos de YouTube embebidos; imágenes de markdown con vista previa.
- Entrada de imágenes para modelos con visión, detectados desde models.dev.
- Entrada de archivos de texto/código y PDF (nativo o extraído con pdf.js) en todos los modelos y proveedores.
- Búsqueda web habilitada solo en los modelos verificados en vivo.
- Límites de contexto reales desde models.dev (antes muchos modelos mostraban 8192).
- Modelos rechazados por el proveedor se ocultan solos.
- Groq: solo los modelos disponibles hoy; se quitó `compound` (apagado por Groq).
- ESLint reemplazado por Biome; build sin commitear; Vercel como único hosting.
- 10 salas de chat internas (cajitas junto al selector de modelo), cada una con su propio proveedor/modelo/chat/YOLO/búsqueda web e indicadores de estado (pensando, sin leer, permiso pendiente).

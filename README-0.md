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
    "version": "0.0.0",
    "type": "module",
    "scripts": {
        "bun-install": "bun install",
        "bun-upgrade": "bun upgrade",
        "ncu": "npx -y npm-check-updates -u && bun update",
        "dev": "vite --host",
        "build": "tsc -b && vite build ./docs",
        "lint": "eslint .",
        "preview": "vite preview --host",
        "deploy": "surge dist --domain deepchat.surge.sh"
    },
    "dependencies": {
        "@tailwindcss/vite": "^4.1.4",
        "axios": "^1.9.0",
        "deep-chat-react": "^2.1.1",
        "react": "^19.1.0",
        "react-dom": "^19.1.0",
        "tailwindcss": "^4.1.4"
    },
    "devDependencies": {
        "@eslint/js": "^9.25.1",
        "@types/react": "^19.1.2",
        "@types/react-dom": "^19.1.2",
        "@vitejs/plugin-react": "^4.4.1",
        "eslint": "^9.25.1",
        "eslint-plugin-react-hooks": "^5.2.0",
        "eslint-plugin-react-refresh": "^0.4.20",
        "globals": "^16.0.0",
        "typescript": "~5.8.3",
        "typescript-eslint": "^8.31.0",
        "vite": "^6.3.3"
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
  # src/index.css
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
  </body>
  </html>
  ```

## Instalar deep-chat-react

* Web: [https://deepchat.dev/]
* GITHUB: [https://github.com/OvidijusParsiunas/deep-chat]

```bash
bun install deep-chat-react
```

```cmd
curl -X GET "https://api.groq.com/openai/v1/models" \
     -H "Authorization: Bearer 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" \
     -H "Content-Type: application/json"
```

---

### Repositorio en GitHub
Repositorio: [https://github.com/corbaz/

### Deploy en Surge
Deploy [https://deepchat.surge.sh/]


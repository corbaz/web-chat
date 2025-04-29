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
    "version": "v.2.01",
    "type": "module",
    "scripts": {
        "bun-install": "bun install",
        "bun-upgrade": "bun upgrade",
        "ncu": "npx -y npm-check-updates -u && bun update",
        "dev": "vite --host",
        "build": "tsc -b && vite build --outDir ./docs",
        "lint": "eslint .",
        "preview": "vite preview --host",
        "deploy": "surge docs --domain deepchat.surge.sh"
    },
    "dependencies": {
        "@tailwindcss/vite": "^4.1.4",
        "axios": "^1.9.0",
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
        "typescript-eslint": "^8.31.1",
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
  </body>
  </html>
  ```

```cmd
curl -X GET "https://api.groq.com/openai/v1/models" \
     -H "Authorization: Bearer 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" \
     -H "Content-Type: application/json"
```

---

### Repositorio en GitHub
Repositorio: [https://github.com/corbaz/web-chat]

### Deploy
Deploy en surge: [https://deepchat.surge.sh/]

Deploy en github pages: [https://corbaz.github.io/web-chat/]


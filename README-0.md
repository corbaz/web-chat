# bun create vite@latest web-chat

```cmd
package.json
{
  "name": "web-chat",
  "private": true,
  "version": "0.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite --host",
    "build": "tsc -b && vite build",
    "lint": "eslint .",
    "preview": "vite preview --host"
  },
  "dependencies": {
    "@tailwindcss/vite": "^4.0.9",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "tailwindcss": "^4.0.9"
  },
  "devDependencies": {
    "@eslint/js": "^9.21.0",
    "@types/react": "^19.0.10",
    "@types/react-dom": "^19.0.4",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9.21.0",
    "eslint-plugin-react-hooks": "^5.2.0",
    "eslint-plugin-react-refresh": "^0.4.19",
    "globals": "^15.15.0",
    "typescript": "~5.7.3",
    "typescript-eslint": "^8.26.0",
    "vite": "^6.2.0"
  }
}
```

bun install tailwindcss @tailwindcss/vite

## Instalar Tailwind CSS

 como un complemento de Vite es la forma más sencilla de integrarlo con marcos como Laravel, SvelteKit, React Router, Nuxt y SolidJS.

* 01
Instalar Tailwind CSS

```cmd
bun install tailwindcss @tailwindcss/vite
```

* 02
Configurar el complemento Vite
Añade el @tailwindcss/vite plugin tu configuración de Vite.

```cmd
vite.config.ts
import { defineConfig } from 'vite'
import tailwindcss from '@tailwindcss/vite'
export default defineConfig({
  plugins: [
    tailwindcss(),
  ],
})
```

* 03
Importar CSS de Tailwind
Agregue un @importa su archivo CSS que importe Tailwind CSS.

```cmd
src/index.css

@import "tailwindcss";
```

* 04
Comience su proceso de construcción
Ejecute su proceso de compilación con bun run dev cualquier comando que esté configurado en su archivo. package.json

```cmd
bun run dev
```

* 05
Comience a utilizar Tailwind en su HTML
Asegúrate de que tu CSS compilado esté incluido en el "head" (tu marco podría encargarse de esto por ti) , luego comienza a usar las clases de utilidad de Tailwind para darle estilo a tu contenido.

```cmd
HTML
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

* Web [https://deepchat.dev/]  
* GITHUB [https://github.com/OvidijusParsiunas/deep-chat]

```cmd
bun install deep-chat-react
```

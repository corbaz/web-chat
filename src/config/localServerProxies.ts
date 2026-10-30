// Rutas del proxy de Vite hacia los servidores locales (ver localServers.ts).
// Sin nada del navegador: lo importa también vite.config.ts.

export const LOCAL_SERVER_PROXIES = {
  opencodefree: {
    path: '/local/opencode-free',
    target: 'http://127.0.0.1:4096',
  },
  claudecode: { path: '/local/claude', target: 'http://127.0.0.1:4098' },
  codexsub: { path: '/local/codex', target: 'http://127.0.0.1:4094' },
  geminisub: { path: '/local/gemini', target: 'http://127.0.0.1:4092' },
  ollamacloud: { path: '/local/ollama', target: 'http://127.0.0.1:11434' },
} as const

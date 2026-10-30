import { describe, expect, test } from 'bun:test'
import { LOCAL_SERVER_PROXIES, resolveLocalServerUrlFor } from './localServers'

const remoteDev = {
  dev: true,
  origin: 'https://192.168.1.50:5173',
  hostname: '192.168.1.50',
}

describe('resolveLocalServerUrlFor', () => {
  test('app abierta desde otra máquina (dev): un servidor en localhost va por el proxy de Vite', () => {
    expect(
      resolveLocalServerUrlFor(
        'http://127.0.0.1:4096',
        LOCAL_SERVER_PROXIES.opencodefree.path,
        remoteDev,
      ),
    ).toBe('https://192.168.1.50:5173/local/opencode-free')
    expect(
      resolveLocalServerUrlFor(
        'http://localhost:11434',
        '/local/ollama',
        remoteDev,
      ),
    ).toBe('https://192.168.1.50:5173/local/ollama')
  })

  test('app abierta en la misma PC: la URL queda igual', () => {
    expect(
      resolveLocalServerUrlFor('http://127.0.0.1:4098', '/local/claude', {
        dev: true,
        origin: 'https://localhost:5173',
        hostname: 'localhost',
      }),
    ).toBe('http://127.0.0.1:4098')
  })

  test('build de producción (Vercel): sin proxy, la URL queda igual', () => {
    expect(
      resolveLocalServerUrlFor('http://127.0.0.1:4098', '/local/claude', {
        dev: false,
        origin: 'https://prompting-chat.vercel.app',
        hostname: 'prompting-chat.vercel.app',
      }),
    ).toBe('http://127.0.0.1:4098')
  })

  test('una URL a otra máquina que no es localhost se respeta', () => {
    expect(
      resolveLocalServerUrlFor(
        'http://10.0.0.7:4096',
        '/local/opencode-free',
        remoteDev,
      ),
    ).toBe('http://10.0.0.7:4096')
  })
})

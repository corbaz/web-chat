import { describe, expect, test } from 'bun:test'
import { toCloudModelId } from './modelId'

describe('toCloudModelId', () => {
  // Formas verificadas en vivo contra `ollama serve` (2026-10-29).
  test('con tag agrega "-cloud" al tag', () => {
    expect(toCloudModelId('gpt-oss:120b')).toBe('gpt-oss:120b-cloud')
    expect(toCloudModelId('deepseek-v4.1-flash:1017')).toBe(
      'deepseek-v4.1-flash:1017-cloud',
    )
  })

  test('sin tag agrega ":cloud"', () => {
    expect(toCloudModelId('kimi-k2.6')).toBe('kimi-k2.6:cloud')
  })

  test('un id que ya es cloud queda igual', () => {
    expect(toCloudModelId('gemma4:31b-cloud')).toBe('gemma4:31b-cloud')
    expect(toCloudModelId('glm-5:cloud')).toBe('glm-5:cloud')
  })
})

import { describe, expect, test } from 'bun:test'
import { deriveNameFromId, inferDeveloper } from './naming'

describe('deriveNameFromId', () => {
  test('deriva nombre título a partir de un id con guiones', () => {
    expect(deriveNameFromId('deepseek-v4-flash-free')).toBe(
      'Deepseek V4 Flash Free',
    )
  })

  test('capitaliza cada segmento separado por guion bajo', () => {
    expect(deriveNameFromId('some_model_id')).toBe('Some Model Id')
  })

  test('maneja un id de un solo segmento', () => {
    expect(deriveNameFromId('big-pickle')).toBe('Big Pickle')
  })

  test('ignora guiones dobles o al borde sin producir segmentos vacíos', () => {
    expect(deriveNameFromId('-foo--bar-')).toBe('Foo Bar')
  })
})

describe('inferDeveloper', () => {
  test('reconoce prefijos conocidos de modelos OpenCode', () => {
    expect(inferDeveloper('deepseek-v4-flash-free')).toBe('DeepSeek')
    expect(inferDeveloper('qwen3.7-max')).toBe('Alibaba Cloud')
    expect(inferDeveloper('kimi-k2.7-code')).toBe('Moonshot AI')
    expect(inferDeveloper('glm-5.2')).toBe('Zhipu AI')
  })

  test('usa OpenCode como fallback para ids desconocidos', () => {
    expect(inferDeveloper('totally-unknown-model')).toBe('OpenCode')
  })
})

import { describe, expect, test } from 'bun:test'
import { stripGeminiSubEffortSuffix } from './modelId'

describe('stripGeminiSubEffortSuffix', () => {
  test('quita el sufijo de esfuerzo', () => {
    expect(stripGeminiSubEffortSuffix('gemini-3.6-flash-low')).toBe(
      'gemini-3.6-flash',
    )
    expect(stripGeminiSubEffortSuffix('gemini-3.1-pro-high')).toBe(
      'gemini-3.1-pro',
    )
    expect(stripGeminiSubEffortSuffix('gpt-oss-120b-medium')).toBe(
      'gpt-oss-120b',
    )
  })

  test('deja intactos los ids sin sufijo', () => {
    expect(stripGeminiSubEffortSuffix('claude-sonnet-4-6')).toBe(
      'claude-sonnet-4-6',
    )
  })
})

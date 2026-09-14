import { describe, it, expect, afterEach } from 'vitest'
import { getProviderKind, getProvider } from './factory'

const saved = { ...process.env }

afterEach(() => {
  process.env = { ...saved }
})

describe('getProviderKind', () => {
  it('無 key 預設 mock（開發期開箱即用）', () => {
    delete process.env.AI_PROVIDER
    delete process.env.OPENAI_API_KEY
    delete process.env.ANTHROPIC_API_KEY
    expect(getProviderKind()).toBe('mock')
  })

  it('有 OPENAI_API_KEY 自動選 openai', () => {
    delete process.env.AI_PROVIDER
    process.env.OPENAI_API_KEY = 'sk-test'
    delete process.env.ANTHROPIC_API_KEY
    expect(getProviderKind()).toBe('openai')
  })

  it('AI_PROVIDER 明確指定優先於 key', () => {
    process.env.AI_PROVIDER = 'mock'
    process.env.OPENAI_API_KEY = 'sk-test'
    expect(getProviderKind()).toBe('mock')
    expect(getProvider().name).toBe('mock')
  })
})
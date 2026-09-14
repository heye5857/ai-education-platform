/**
 * Provider 工廠：AI_PROVIDER 明確指定 > 有 key 用真的 > 預設 mock
 * 開發期無 key 也能全流程測試；上線填 key 即切換真模型，不改程式
 */
import type { AIProvider } from './types'
import { MockProvider } from './providers/mock'
import { OpenAIProvider } from './providers/openai'
import { AnthropicProvider } from './providers/anthropic'

export type ProviderKind = 'mock' | 'openai' | 'anthropic'

export function getProviderKind(): ProviderKind {
  const explicit = process.env.AI_PROVIDER?.toLowerCase()
  if (explicit === 'mock' || explicit === 'openai' || explicit === 'anthropic') return explicit
  if (process.env.OPENAI_API_KEY) return 'openai'
  if (process.env.ANTHROPIC_API_KEY) return 'anthropic'
  return 'mock'
}

export function getProvider(kind: ProviderKind = getProviderKind()): AIProvider {
  switch (kind) {
    case 'openai':
      return new OpenAIProvider()
    case 'anthropic':
      return new AnthropicProvider()
    default:
      return new MockProvider()
  }
}

/**
 * AI Provider 介面（對應 obsidian-vault Tech Stack + AI Chat 規格）
 * 所有模型（OpenAI / Anthropic / 自有 vLLM / Mock）都實作此介面，可熱切換
 */

export type ChatRole = 'system' | 'user' | 'assistant'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatRequest {
  messages: ChatMessage[]
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
}

export interface ChatUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

export interface ChatResponse {
  content: string
  model: string
  usage: ChatUsage
  /** 引導階段（Mock 與支援結構化輸出的模型回填） */
  phase?: 'DIAGNOSE' | 'SCAFFOLD' | 'GUIDE' | 'VERIFY' | 'EXTEND'
}

export interface ChatChunk {
  delta: string
  done: boolean
}

export interface AIProvider {
  readonly name: string
  readonly model: string
  readonly maxTokens: number
  readonly supportsStreaming: boolean
  readonly supportsFunctions: boolean

  chatCompletion(request: ChatRequest): Promise<ChatResponse>
  streamChatCompletion(request: ChatRequest): AsyncIterable<ChatChunk>
  countTokens(messages: ChatMessage[]): number
}

/** 粗略 token 估算（中英混合約 2 字元 1 token），各 provider 共用預設 */
export function estimateTokens(messages: ChatMessage[]): number {
  const chars = messages.reduce((sum, m) => sum + m.content.length, 0)
  return Math.max(1, Math.ceil(chars / 2))
}

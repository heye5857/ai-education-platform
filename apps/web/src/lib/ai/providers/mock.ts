/**
 * MockProvider：無需 API key 的蘇格拉底引導 mock
 * - 決定性輸出（同一輸入永遠同輸出，方便測試/展示）
 * - 遵守硬約束：只引導、絕不直接給答案
 */
import {
  estimateTokens,
  type AIProvider,
  type ChatChunk,
  type ChatRequest,
  type ChatResponse,
} from '../types'

const GUIDING_QUESTIONS = [
  '在動筆之前，你覺得第一步可以對哪個部分下手？',
  '如果把題目裡的數字換成更小的數字，你還會算嗎？試試看規律是什麼。',
  '你覺得答案大概會落在哪個範圍？先猜一個，再驗證看看。',
]

function snippetOf(text: string): string {
  const clean = text.replace(/\s+/g, ' ').trim()
  return clean.length > 24 ? `${clean.slice(0, 24)}…` : clean || '這個問題'
}

export class MockProvider implements AIProvider {
  readonly name = 'mock'
  readonly model = 'mock-socratic-1'
  readonly maxTokens = 2048
  readonly supportsStreaming = true
  readonly supportsFunctions = false

  buildResponse(request: ChatRequest): string {
    const lastUser = [...request.messages].reverse().find((m) => m.role === 'user')
    const snippet = snippetOf(lastUser?.content ?? '')
    const pick = GUIDING_QUESTIONS[(lastUser?.content.length ?? 0) % GUIDING_QUESTIONS.length]
    return [
      '很好的問題！我們不要急著看答案，先一起想一想 🤔',
      '',
      `你提到「${snippet}」——${pick}`,
      '',
      '把你的想法寫下來，我們一步一步來。卡住的話直接跟我說哪一步不懂。',
    ].join('\n')
  }

  async chatCompletion(request: ChatRequest): Promise<ChatResponse> {
    const content = this.buildResponse(request)
    const promptTokens = this.countTokens(request.messages)
    const completionTokens = this.countTokens([{ role: 'assistant', content }])
    return {
      content,
      model: this.model,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens: promptTokens + completionTokens,
      },
      phase: 'GUIDE',
    }
  }

  async *streamChatCompletion(request: ChatRequest): AsyncIterable<ChatChunk> {
    const content = this.buildResponse(request)
    const mid = Math.ceil(content.length / 2)
    yield { delta: content.slice(0, mid), done: false }
    yield { delta: content.slice(mid), done: true }
  }

  countTokens(messages: { role: string; content: string }[]): number {
    return estimateTokens(messages as { role: 'system' | 'user' | 'assistant'; content: string }[])
  }
}

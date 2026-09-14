/**
 * OpenAIProvider：透過 Chat Completions API 呼叫（需 OPENAI_API_KEY）
 * streaming 尚未實作，先以單次回應模擬串流（supportsStreaming=false 標示）
 */
import {
  estimateTokens,
  type AIProvider,
  type ChatChunk,
  type ChatMessage,
  type ChatRequest,
  type ChatResponse,
} from '../types'

export class OpenAIProvider implements AIProvider {
  readonly name = 'openai'
  readonly model: string
  readonly maxTokens = 4096
  readonly supportsStreaming = false
  readonly supportsFunctions = false

  constructor(
    private readonly apiKey: string = process.env.OPENAI_API_KEY ?? '',
    model: string = process.env.OPENAI_MODEL ?? 'gpt-4o-mini'
  ) {
    this.model = model
  }

  private assertKey(): void {
    if (!this.apiKey) {
      throw new Error('缺少 OPENAI_API_KEY，無法呼叫 OpenAI（可用 MockProvider 開發測試）')
    }
  }

  async chatCompletion(request: ChatRequest): Promise<ChatResponse> {
    this.assertKey()
    const messages: Array<{ role: string; content: string }> = []
    if (request.systemPrompt) messages.push({ role: 'system', content: request.systemPrompt })
    for (const m of request.messages) messages.push({ role: m.role, content: m.content })

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: this.model,
        messages,
        max_tokens: request.maxTokens ?? 1024,
        temperature: request.temperature ?? 0.7,
      }),
    })
    if (!res.ok) {
      throw new Error(`OpenAI 請求失敗（${res.status}）`)
    }
    const data = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>
      usage?: { prompt_tokens?: number; completion_tokens?: number; total_tokens?: number }
    }
    const content = data.choices?.[0]?.message?.content ?? ''
    const promptTokens = data.usage?.prompt_tokens ?? this.countTokens(request.messages)
    const completionTokens =
      data.usage?.completion_tokens ?? Math.ceil(content.length / 2)
    return {
      content,
      model: this.model,
      usage: { promptTokens, completionTokens, totalTokens: promptTokens + completionTokens },
    }
  }

  async *streamChatCompletion(request: ChatRequest): AsyncIterable<ChatChunk> {
    const res = await this.chatCompletion(request)
    yield { delta: res.content, done: true }
  }

  countTokens(messages: ChatMessage[]): number {
    return estimateTokens(messages)
  }
}

/**
 * AnthropicProvider：透過 Messages API 呼叫（需 ANTHROPIC_API_KEY）
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

export class AnthropicProvider implements AIProvider {
  readonly name = 'anthropic'
  readonly model: string
  readonly maxTokens = 4096
  readonly supportsStreaming = false
  readonly supportsFunctions = false

  constructor(
    private readonly apiKey: string = process.env.ANTHROPIC_API_KEY ?? '',
    model: string = process.env.ANTHROPIC_MODEL ?? 'claude-3-5-haiku-latest'
  ) {
    this.model = model
  }

  private assertKey(): void {
    if (!this.apiKey) {
      throw new Error('缺少 ANTHROPIC_API_KEY，無法呼叫 Anthropic（可用 MockProvider 開發測試）')
    }
  }

  async chatCompletion(request: ChatRequest): Promise<ChatResponse> {
    this.assertKey()
    const messages = request.messages
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role, content: m.content }))
    const systemParts = request.messages
      .filter((m) => m.role === 'system')
      .map((m) => m.content)
    if (request.systemPrompt) systemParts.unshift(request.systemPrompt)

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: this.model,
        max_tokens: request.maxTokens ?? 1024,
        system: systemParts.join('\n\n') || undefined,
        messages,
      }),
    })
    if (!res.ok) {
      throw new Error(`Anthropic 請求失敗（${res.status}）`)
    }
    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const content =
      data.content?.filter((b) => b.type === 'text').map((b) => b.text ?? '').join('') ?? ''
    const promptTokens = data.usage?.input_tokens ?? this.countTokens(request.messages)
    const completionTokens = data.usage?.output_tokens ?? Math.ceil(content.length / 2)
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

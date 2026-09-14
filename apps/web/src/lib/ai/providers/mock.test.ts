import { describe, it, expect } from 'vitest'
import { MockProvider } from './mock'

const req = {
  messages: [
    { role: 'user' as const, content: '一元一次方程式 2x + 3 = 9 怎麼解？' },
  ],
}

describe('MockProvider（蘇格拉底引導 mock）', () => {
  it('回傳非空繁中引導回應，不直接給答案', async () => {
    const p = new MockProvider()
    const res = await p.chatCompletion(req)
    expect(res.content.length).toBeGreaterThan(10)
    expect(res.content).toContain('？')
    expect(res.content).not.toMatch(/答案是/)
    expect(res.model).toBe('mock-socratic-1')
    expect(res.phase).toBe('GUIDE')
  })

  it('同一輸入決定性輸出（可測、可用於 Storybook/測試）', async () => {
    const p = new MockProvider()
    const a = await p.chatCompletion(req)
    const b = await p.chatCompletion(req)
    expect(a.content).toBe(b.content)
  })

  it('stream 以 chunk 吐出完整內容後結束', async () => {
    const p = new MockProvider()
    let full = ''
    let sawDone = false
    for await (const c of p.streamChatCompletion(req)) {
      full += c.delta
      if (c.done) sawDone = true
    }
    expect(sawDone).toBe(true)
    expect(full.length).toBeGreaterThan(10)
  })

  it('countTokens 為正數且隨內容成長', () => {
    const p = new MockProvider()
    const short = p.countTokens([{ role: 'user', content: '嗨' }])
    const long = p.countTokens([
      { role: 'user', content: '一元一次方程式 2x + 3 = 9 怎麼解？請教我' },
    ])
    expect(short).toBeGreaterThan(0)
    expect(long).toBeGreaterThan(short)
  })
})
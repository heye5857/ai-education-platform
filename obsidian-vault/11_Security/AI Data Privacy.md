# AI 資料隱私

> [!IMPORTANT]
> **狀態**：RESEARCH - AI 專項隱私風險評估
> **最後更新**：2026-09-10
> **核心原則**：學生對話資料高度敏感，**嚴禁用於模型訓練除非明確同意**

---

## AI 隱私風險矩陣

| 風險類別 | 具體場景 | 影響等級 | 緩解措施 |
|----------|----------|----------|----------|
| **訓練資料洩漏** | 學生對話被納入預訓練/微調語料 | 極高 | 預設排除、明確同意才納入、去識別化管線 |
| **推理攻擊** | 攻擊者透過提示詞推斷學生資料 | 高 | 輸入清洗、輸出過濾、差分隱私 |
| **模型反轉攻擊** | 從模型輸出重建訓練資料 | 中 | 知識蒸餾防護、輸出雜訊 |
| **提示詞注入** | 學生/惡意輸入竊取系統提示詞/其他用戶 Context | 高 | 指令分離、輸入驗證、輸出過濾 |
| **Context 洩漏** | 學生 A 的資料出現在學生 B 的回應中 | 極高 | 嚴格隔離、Context 建構驗證、自動化測試 |
| **向量資料庫洩漏** | Embedding 可被反轉重建原文 | 中 | 向量加密、存取控制、定期審計 |
| **第三方 API 洩漏** | 送往 OpenAI/Anthropic 的資料被記錄/使用 | 高 | 零保留協議、企業版合約、本地模型優先 |
| **內部人員濫用** | 工程師/客服讀取學生對話 | 高 | 存取控制、審計日誌、資料遮罩 |

---

## 隔離架構設計

```mermaid
flowchart TB
    subgraph STUDENT_A[學生 A 隔離區]
        CTX_A[Context Builder A\nProfile A + Mastery A + History A + RAG]
        CONV_A[Conversation Store A\nPostgreSQL RLS: student_id=A]
        MEM_A[Memory Store A\nRedis: student:A:*]
    end
    
    subgraph STUDENT_B[學生 B 隔離區]
        CTX_B[Context Builder B\nProfile B + Mastery B + History B + RAG]
        CONV_B[Conversation Store B\nPostgreSQL RLS: student_id=B]
        MEM_B[Memory Store B\nRedis: student:B:*]
    end
    
    subgraph SHARED[共享服務 (無狀態)]
        AI_SVC[AI Service Interface\nProvider Pattern]
        RAG_SVC[RAG Pipeline\n檢索公共知識庫]
        PROMPT[Prompt Template Engine]
    end
    
    CTX_A --> AI_SVC
    CTX_B --> AI_SVC
    AI_SVC --> RAG_SVC
    AI_SVC --> PROMPT
    
    CONV_A -.->|RLS 強制隔離| CONV_B
    MEM_A -.->|Key Prefix 隔離| MEM_B
```

### 強制隔離機制

| 層級 | 機制 | 驗證方式 |
|------|------|----------|
| **資料庫** | PostgreSQL RLS (Row Level Security) | 單元測試：跨學生查詢必須回 0 筆 |
| **快取** | Redis Key Prefix `student:{id}:*` | 整合測試：Key 掃描無跨學生 |
| **向量資料庫** | RAG 只檢索公共知識庫，不含學生私有資料 | 向量檢索測試：無學生 ID 欄位 |
| **AI 服務** | Context Builder 強制注入 `studentId`、驗證所有查詢帶有該 ID | 程式碼靜態分析、執行期斷言 |
| **日誌/監控** | 自動遮罩 PII、學生 ID 雜湊化 | 日誌抽樣檢查 |

---

## 資料最小化與去識別化

### Context 建構時的資料處理
```typescript
interface ContextSanitizer {
  // 1. 僅提取教學必要欄位
  extractMinimalProfile(profile: StudentProfile): MinimalProfile {
    return {
      grade: profile.grade,
      semester: profile.semester,
      // 不包含：姓名、學校、班級、Email
    };
  }
  
  // 2. Mastery 只傳弱項/強項 Top K，不傳完整向量
  extractMasterySummary(mastery: Mastery[]): MasterySummary {
    return {
      topWeak: mastery.filter(m => m.score < 50).sort((a,b) => a.score - b.score).slice(0, 5),
      topStrong: mastery.filter(m => m.score > 80).sort((a,b) => b.score - a.score).slice(0, 5),
      // 不包含：完整 KP 清單、信心度細節
    };
  }
  
  // 3. 錯題只傳最近 N 筆 + 相關 KP
  extractRelevantWrongQuestions(wrongQs: WrongQuestion[], currentKPs: string[]): WrongQuestionSummary[] {
    return wrongQs
      .filter(wq => wq.knowledgePoints.some(kp => currentKPs.includes(kp)))
      .slice(0, 10)
      .map(wq => ({
        questionId: wq.questionId,
        errorPatterns: wq.errorPatterns,
        lastErrorAt: wq.lastErrorAt,
        // 不包含：學生作答內容、完整題目
      }));
  }
  
  // 4. 對話歷史只傳最近 N 輪，敏感內容遮罩
  sanitizeConversationHistory(messages: Message[]): SanitizedMessage[] {
    return messages.slice(-10).map(msg => ({
      role: msg.role,
      content: this.maskPII(msg.content),  // 姓名、學號、地址、電話遮罩
      timestamp: msg.createdAt,
    }));
  }
  
  // 5. RAG 檢索結果去識別化
  sanitizeRAGChunks(chunks: Chunk[]): SanitizedChunk[] {
    return chunks.map(c => ({
      content: c.content,  // 公共知識庫本身不含 PII
      citation: {docId: c.documentId, chunkIndex: c.chunkIndex},
      relevanceScore: c.score,
    }));
  }
}
```

---

## 輸入清洗與輸出過濾

### 提示詞注入防護
```typescript
interface PromptInjectionGuard {
  // 系統指令與用戶輸入分離
  buildPrompt(systemPrompt: string, userInput: string): string {
    return `
<|system|>
${systemPrompt}
<|end|>

<|user|>
${this.sanitizeUserInput(userInput)}
<|end|>

<|assistant|>
`;
  }
  
  // 偵測常見注入模式
  detectInjection(input: string): InjectionRisk {
    const patterns = [
      /ignore previous instructions/i,
      /system prompt/i,
      /you are now/i,
      /pretend to be/i,
      /output.*prompt/i,
      /repeat.*above/i,
      /<\|system\|>/i,
      /<\|end\|>/i,
    ];
    
    const matches = patterns.filter(p => p.test(input));
    return {
      risk: matches.length > 0 ? "HIGH" : "LOW",
      patterns: matches.map(p => p.source),
      sanitized: this.sanitize(input),
    };
  }
  
  sanitize(input: string): string {
    return input
      .replace(/<\|(system|user|assistant|end)\|>/gi, "")
      .replace(/ignore previous instructions/gi, "[已過濾]")
      .slice(0, 4000); // 長度限制
  }
}
```

### 輸出過濾
```typescript
interface OutputFilter {
  // 1. 移除可能洩漏的系統資訊
  filterSystemLeakage(output: string): string {
    return output
      .replace(/as an ai language model/gi, "")
      .replace(/i don't have access to/gi, "")
      .replace(/my training data/gi, "")
      .replace(/api key|secret|token|password/gi, "[已過濾]");
  }
  
  // 2. 確保不洩漏其他學生資料
  filterCrossStudentLeakage(output: string, currentStudentId: string): string {
    // 偵測是否包含其他學生 ID 格式
    const studentIdPattern = /stu_[a-z0-9]{20,}/g;
    return output.replace(studentIdPattern, (match) => {
      return match === currentStudentId ? match : "[已過濾]";
    });
  }
  
  // 3. 數學答案格式標準化 (避免模型輸出非預期格式)
  normalizeMathOutput(output: string): string {
    // 確保 LaTeX 格式一致、無惡意腳本
    return DOMPurify.sanitize(output, {ALLOWED_TAGS: ["p", "span", "math", "mi", "mo", "mn", "ms", "mtext"]});
  }
}
```

---

## 第三方 AI API 隱私保護

### 供應商選擇標準
| 標準 | OpenAI Enterprise | Anthropic Enterprise | Google Vertex AI | 本地模型 |
|------|-------------------|----------------------|------------------|----------|
| **零資料保留** | ✅ (30 天預設，可關閉) | ✅ (零保留模式) | ✅ (可配置) | ✅ 完全控制 |
| **資料不作為訓練** | ✅ 契約保證 | ✅ 契約保證 | ✅ 契約保證 | ✅ 原生 |
| **資料區域** | 可選區域 (US/EU) | 可選區域 | 可選區域 | 本地/自選雲端 |
| **加密** | 傳輸/靜態加密 | 傳輸/靜態加密 | 傳輸/靜態加密 | 自行管理 |
| **合規認證** | SOC2, ISO27001, HIPAA | SOC2, ISO27001 | ISO27001, SOC2 | 自行負責 |
| **成本** | 高 | 高 | 中 | 初期高、長期低 |

### 合約必備條款
```markdown
## AI 供應商 DPA (Data Processing Addendum) 必備條款

1. **處理目的限制**: 僅供 API 推理服務，不得用於模型訓練、改進、廣告、畫像
2. **資料保留**: 推理完成後立即刪除輸入/輸出 (最長 24-30 天緩衝)
3. **子處理者**: 公開子處理者清單、變更前 30 天通知、客戶有拒絕權
4. **資料主體權利**: 協助處理刪除/存取/更正請求
5. **安全事件通知**: 24 小時內通知資料外洩
6. **審計權**: 客戶有權審計/要求第三方認證報告 (SOC2 Type II)
7. **責任歸屬**: 供應商對違規負連帶責任
8. **管轄法律**: 台灣法律 / 台灣法院
```

---

## 合規對應表

| 法規 | 關鍵要求 | 我方對應 |
|------|----------|----------|
| **個人資料保護法 (台灣)** | 告知、同意、查詢、刪除、安全維護 | 隱私權聲明、同意管理、資料主體權利 API、安全措施 |
| **GDPR (歐盟)** | 合法依據、DPIA、DPO、跨境傳輸、72h 通報 | 同意/合法利益、DPIA 報告、SCC、72h 流程 |
| **COPPA (美國, 兒童)** | 13 歲以下家長同意、資料最小化、刪除權 | 年齡驗證、家長同意流程、兒童資料特殊保護 |
| **學生線上個人資訊保護法 (SOPIPA, 加州)** | 禁止廣告畫像、資料銷售、安全銷毀 | 無廣告、不出售資料、銷毀流程 |

---

## 隱私影響評估 (DPIA) 關鍵發現

| 風險項目 | 風險等級 | 現有控制 | 剩餘風險 | 追加措施 |
|----------|----------|----------|----------|----------|
| 學生對話含敏感個資 (姓名、學校、弱項) | 高 | Context 最小化、遮罩、RLS | 中 | 定期滲透測試、自動化洩漏掃描 |
| AI 模型記憶學生資料 | 高 | 本地模型/零保留 API、不微調學生資料 | 低 | 定期模型審計、紅隊測試 |
| 向量資料庫可被反轉 | 中 | 僅存公共知識、不存學生資料 | 低 | 向量加密、存取審計 |
| 內部人員存取濫用 | 高 | RLS、審計日誌、最小權限、資料遮罩 | 中 | 定期權限審查、異常存取告警 |
| 第三方 API 政策變更 | 中 | 企業版合約、零保留、備援供應商 | 低 | 季度合規審查、備援切換演練 |

---

## 相關文檔

- [[11_Security/Student Data Security|學生資料安全]]
- [[11_Security/Authentication Security|認證安全]]
- [[04_AI/Student Memory|學生記憶系統]]
- [[04_AI/AI Model Strategy|AI 模型策略]]
- [[13_Decisions/TBD#TBD-08|TBD-08: Memory 策略]]
- [[13_Decisions/TBD#TBD-21|TBD-21: GDPR/個資法]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始 AI 隱私風險評估 | 系統架構師 |
# 資料集標準

> [!IMPORTANT]
> **狀態**：PROPOSED - TBD-14, TBD-15, TBD-17 相關
> **最後更新**：2026-09-10

---

## 資料集分類與標準

### 1. RAG 知識庫資料集

#### Document Level
```json
{
  "documentId": "doc_math_textbook_jh1_ch1",
  "title": "國中數學 7上 第1章 整數與基本運算",
  "source": "TEXTBOOK",
  "gradeLevel": 7,
  "subject": "MATH",
  "unitCode": "INTEGER_OPERATIONS",
  "version": "2024_v1",
  "metadata": {
    "publisher": "翰林出版",
    "year": 2024,
    "isbn": "9789861234567",
    "pageCount": 45,
    "language": "zh-TW"
  },
  "statistics": {
    "chunkCount": 127,
    "totalTokens": 45230,
    "knowledgePoints": ["INTEGER_DEFINITION", "ABSOLUTE_VALUE", "ADDITION_RULES", "MULTIPLICATION_RULES"],
    "formulaCount": 89,
    "exampleCount": 23
  },
  "license": {
    "type": "COMMERCIAL_FULL",
    "grantedBy": "翰林出版授權",
    "grantedAt": "2026-01-15"
  },
  "processingStatus": "COMPLETED",
  "createdAt": "2026-09-01T10:00:00Z",
  "updatedAt": "2026-09-01T12:30:00Z"
}
```

#### Chunk Level
```json
{
  "chunkId": "chk_abc123def",
  "documentId": "doc_math_textbook_jh1_ch1",
  "chunkIndex": 15,
  "content": "## 1.3 整數的乘法\n\n**乘法法則**：\n1. 正正得正、負負得正、正負得負\n2. 任何數乘以 0 得 0\n\n### 例題 1\n計算：(-3) × (+5)\n\n**解**：\n(-3) × (+5) = -15  ← 正負得負",
  "tokenCount": 156,
  "metadata": {
    "headingLevel": 2,
    "headingPath": ["第1章 整數與基本運算", "1.3 整數的乘法"],
    "knowledgePoints": ["INTEGER_MULTIPLICATION_RULES", "SIGN_RULES"],
    "formulas": ["(-3) × (+5) = -15"],
    "examples": [
      {
        "exampleId": "ex_1_3_1",
        "type": "WORKED_EXAMPLE",
        "question": "(-3) × (+5)",
        "solution": "(-3) × (+5) = -15",
        "steps": ["識別符號: 負 × 正", "應用法則: 正負得負", "計算絕對值: 3×5=15", "加上負號: -15"]
      }
    ],
    "pageNumber": 23,
    "difficulty": 2
  },
  "embedding": null,
  "createdAt": "2026-09-01T10:05:00Z"
}
```

---

### 2. 題庫資料集標準

#### Question (核心實體)
```json
{
  "questionId": "q_math_alg_001234",
  "type": "SINGLE_CHOICE",
  "stem": "下列運算正確的是？\nA. $2(x+3)=2x+3$\nB. $2(x+3)=2x+6$\nC. $2(x+3)=2x+5$\nD. $2(x+3)=x+6$",
  "options": [
    {"id": "A", "text": "$2(x+3)=2x+3$", "isCorrect": false},
    {"id": "B", "text": "$2(x+3)=2x+6$", "isCorrect": true},
    {"id": "C", "text": "$2(x+3)=2x+5$", "isCorrect": false},
    {"id": "D", "text": "$2(x+3)=x+6$", "isCorrect": false}
  ],
  "answer": "B",
  "solutionSteps": [
    {
      "stepId": "s1",
      "stepNumber": 1,
      "description": "運用分配律展開括號",
      "input": "2(x+3)",
      "operation": {
        "type": "DISTRIBUTION",
        "description": "2 乘以括號內每一項",
        "mathematicalRule": "分配律: a(b+c) = ab + ac",
        "operands": ["2", "x", "3"],
        "operator": "*"
      },
      "output": "2x + 6",
      "knowledgePoints": ["DISTRIBUTIVE_LAW"],
      "errorPatterns": [
        {"code": "ALG_DIST_01", "description": "遺漏項次乘法: 2x+3", "likelihood": 0.45},
        {"code": "ALG_DIST_02", "description": "符號錯誤", "likelihood": 0.15}
      ],
      "difficulty": 2,
      "estimatedTimeSeconds": 15
    },
    {
      "stepId": "s2",
      "stepNumber": 2,
      "description": "比對選項",
      "input": "2x+6",
      "operation": {
        "type": "COMPARISON",
        "description": "與四個選項逐一比對",
        "mathematicalRule": "字串/數學表達式相等判斷",
        "operands": ["2x+6", "選項A,B,C,D"],
        "operator": "=="
      },
      "output": "選項 B 正確",
      "knowledgePoints": ["OPTION_ANALYSIS"],
      "errorPatterns": [],
      "difficulty": 1,
      "estimatedTimeSeconds": 10
    }
  ],
  "difficulty": 2,
  "source": "WORKBOOK",
  "gradeLevel": 7,
  "tags": ["基礎", "分配律", "選擇題"],
  "knowledgePoints": [
    {"kpId": "DISTRIBUTIVE_LAW", "weight": 1.0}
  ],
  "qualityMetrics": {
    "tagAccuracy": 1.0,
    "difficultyCalibrated": true,
    "discriminationIndex": 0.45,
    "guessingFactor": 0.25
  },
  "license": {
    "type": "COMMERCIAL_FULL",
    "sourceDocId": "doc_workbook_jh1_ch1"
  },
  "createdAt": "2026-09-01T10:00:00Z",
  "updatedAt": "2026-09-01T10:00:00Z"
}
```

#### Knowledge Point (標準定義)
```json
{
  "kpId": "DISTRIBUTIVE_LAW",
  "code": "DISTRIBUTIVE_LAW",
  "name": "分配律",
  "description": "乘法對加法的分配律：a(b+c) = ab + ac",
  "domain": "ALGEBRA",
  "topic": "多項式運算",
  "difficulty": 2,
  "prerequisites": ["INTEGER_MULTIPLICATION", "VARIABLE_CONCEPT"],
  "errorPatterns": [
    "ALG_DIST_01", "ALG_DIST_02", "ALG_DIST_03", "ALG_DIST_04", "ALG_DIST_05"
  ],
  "teachingSequence": [
    "具體物件示範 (發糖果類比)",
    "圖形面積模型 (長方形面積)",
    "符號化推導",
    "多項式展開練習",
    "反向因式分解銜接"
  ],
  "commonMisconceptions": [
    "只乘第一項",
    "符號處理錯誤",
    "係數 1 遺漏"
  ],
  "assessmentIndicators": {
    "basic": "單項式乘二項式",
    "intermediate": "二項式乘二項式",
    "advanced": "多項式乘多項式、含負號"
  }
}
```

---

### 3. 模型訓練資料集標準

#### SFT (Supervised Fine-Tuning) 格式 - ShareGPT/ChatML
```json
{
  "conversations": [
    {
      "from": "system",
      "value": "你是一位資深數學老師，採用蘇格拉底式引導教學，不直接給答案。學生是國二學生，目前學習一元一次方程式。"
    },
    {
      "from": "human",
      "value": "老師，這題 2(x+3)=14 我該怎麼解？"
    },
    {
      "from": "gpt",
      "value": "好問題！我們一步步來看。首先，你看左邊的 2(x+3)，括號裡有兩項，分別是 x 和 3。請問 2 要乘給哪些項呢？"
    },
    {
      "from": "human",
      "value": "乘給 x 和 3 兩個都要乳喔？"
    },
    {
      "from": "gpt",
      "value": "完全正確！這就是分配律：a(b+c) = ab + ac。那麼 2(x+3) 展開後會變成什麼？"
    },
    {
      "from": "human",
      "value": "2x + 6"
    },
    {
      "from": "gpt",
      "value": "太棒了！方程式現在變成 2x + 6 = 14。接下來，我們想把 x 留在左邊，數字移到右邊。你覺得下一步該怎麼做？"
    }
  ],
  "metadata": {
    "dataset": "math_tutoring_sft_v1",
    "gradeLevel": 8,
    "knowledgePoints": ["DISTRIBUTIVE_LAW", "TRANSPOSITION"],
    "teachingPhase": "GUIDE",
    "scaffoldTypes": ["GUIDING_QUESTION", "CONCEPT_CLARIFICATION"],
    "qualityScore": 0.95,
    "annotator": "teacher_001",
    "validatedAt": "2026-08-15"
  }
}
```

#### DPO (Direct Preference Optimization) 格式
```json
{
  "prompt": "學生問：2(x+3)=14 怎麼解？\n學生程度：國二，Mastery: 分配律 45/100",
  "chosen": "我們來看左邊 2(x+3)，括號裡有 x 和 3 兩項。分配律告訴我們每一項都要乘到。你試著展開看看？",
  "rejected": "答案是 x=4。解法：2x+6=14 → 2x=8 → x=4。",
  "metadata": {
    "preferenceReason": "chosen 遵循引導式教學，rejected 直接給答案違反核心原則",
    "annotator": "teacher_002",
    "validatedAt": "2026-08-20"
  }
}
```

#### Reasoning Trace 格式 (TBD-17)
```json
{
  "traceId": "trace_math_001",
  "questionId": "q_math_alg_001234",
  "problem": "2(x+3)=14",
  "groundTruthSteps": ["ref:question.solutionSteps"],
  "modelReasoning": [
    {
      "step": 1,
      "thought": "識別這是一元一次方程式，左邊需先展開括號",
      "action": "DISTRIBUTION",
      "input": "2(x+3)",
      "output": "2x+6",
      "confidence": 0.99
    },
    {
      "step": 2,
      "thought": "方程式變為 2x+6=14，需移項隔離變數項",
      "action": "TRANSPOSITION",
      "input": "2x+6=14",
      "output": "2x=8",
      "confidence": 0.98
    },
    {
      "step": 3,
      "thought": "係數歸一，解得 x",
      "action": "DIVISION",
      "input": "2x=8",
      "output": "x=4",
      "confidence": 1.0
    }
  ],
  "verification": {
    "substitution": "2(4+3)=14 ✓",
    "allStepsValid": true
  },
  "metadata": {
    "model": "qwen2.5-7b-math-sft",
    "temperature": 0.1,
    "generatedAt": "2026-09-01T10:00:00Z"
  }
}
```

---

## 資料品質分級

| 等級 | 定義 | 用途 | 佔比目標 |
|------|------|------|----------|
| **Gold (黃金)** | 專家雙人標註、交叉驗證、無誤 | 模型評測基準、DPO 偏好資料、關鍵少樣本 | 5-10% |
| **Silver (白銀)** | 專家單人標註、自動檢查通過 | SFT 核心訓練集、RAG 關鍵文檔 | 30-40% |
| **Bronze (青銅)** | 半自動標註 (LLM + 規則) + 抽樣驗證 | SFT 擴充、RAG 大量文檔、題庫標籤 | 50-60% |
| **Raw (原始)** | 未經清洗、僅格式轉換 | 預訓練語料、預留人工清洗 | 不直接用於訓練 |

---

## 資料集版本發布流程

```
v1.0.0 (初版)
├── 數學題庫: 50,000 題 (Silver+)
├── RAG 文檔: 100,000 chunks (Bronze+)
├── SFT 對話: 10,000 輪 (Silver+)
├── DPO 偏好: 5,000 對 (Gold)
└── Reasoning Trace: 20,000 條 (Silver+)

發布檢核:
☐ 格式驗證 100% 通過
☐ 授權標記 100% 完整
☐ 去重複率 < 0.1%
☐ Gold 資料專家複核 100%
☐ 評測基準集分離 (不混入訓練)
☐ 資料卡片 完整填寫
```

---

## 相關文檔

- [[06_Data/Training Data|訓練資料總覽]]
- [[06_Data/Data Format|資料格式規範]]
- [[06_Data/Data Pipeline|資料處理管線]]
- [[03_Math_Teaching/Math Reasoning|數學推理解析]]
- [[03_Math_Teaching/Operation Decomposition|運算拆解]]
- [[04_AI/AI Model Strategy|AI 模型策略]]
- [[13_Decisions/TBD#TBD-15|TBD-15: Solution Steps]]
- [[13_Decisions/TBD#TBD-17|TBD-17: Reasoning Trace]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始標準定義 | AI 系統架構師 |
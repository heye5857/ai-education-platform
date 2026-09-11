# 待決定事項管理 (TBD List)

> [!WARNING]
> **嚴禁自行決定** - 所有項目必須經由相關利害關係人 (產品/教學/工程/商業/法務) 共同確認，並記錄於 [[13_Decisions/Decision Log|決策日誌]] 後才能實作

> [!NOTE]
> **狀態定義**：
> - `TBD` = 明確知道要決定，但尚未討論/決定
> - `RESEARCH` = 需要技術調研/實驗/評測才能決定
> - `PROPOSED` = 已有具體建議方案，待評估決策
> - `BLOCKED` = 依賴其他決策/外部條件，暫時無法推進

---

## TBD 記錄格式

| 欄位 | 說明 |
|------|------|
| **ID** | 唯一識別碼 (TBD-XXX) |
| **問題** | 具體待決策問題 |
| **背景** | 為什麼需要決定，現況為何 |
| **可能方案** | 已知的備選方案 (可多個) |
| **目前狀態** | TBD / RESEARCH / PROPOSED / BLOCKED |
| **需要誰決定** | 利害關係人角色 |
| **優先級** | P0 (阻擋開發) / P1 (影響架構) / P2 (功能細節) / P3 (優化項目) |
| **決定後影響文檔** | 需同步更新的文檔清單 |
| **目標決定日期** | 預期完成決策的時間 |
| **備註** | 額外說明 |

---

## 高優先級 (P0 - 阻擋開發)

### TBD-01: 能力測驗具體設計
- **問題**: 測驗題數、每單元題數、難度分佈、評分公式、Mastery 初始化算法
- **背景**: 註冊流程核心環節，直接影響學生初始 Level 定位與學習路徑
- **可能方案**:
  1. 固定題數 (如 30 題)，依年級覆蓋範圍平均分配
  2. 自適應測驗 (CAT)，依答題動態調整難度
  3. 分階段測驗：先測核心單元，弱項再深入
- **目前狀態**: RESEARCH
- **需要誰決定**: 產品負責人 + 教學專家 + 數據科學家
- **優先級**: P0
- **決定後影響文檔**: [[02_Features/Initial Assessment]], [[02_Features/Mastery System]], [[08_Database/Schema]], [[12_Development/Roadmap]]
- **目標決定日期**: 2026-09-20
- **備註**: 需教學專家定義「核心單元」權重；數據科學家設計評分模型

### TBD-02: Mastery 計算公式
- **問題**: Knowledge Point 掌握度如何量化 (0-100)？權重、衰減、多來源融合？
- **背景**: Mastery 驅動 AI 個人化、相似題推薦、學習分析，但不直接控制 Level 解鎖
- **可能方案**:
  1. 貝葉斯知識追蹤 (BKT) - 經典教育數據挖掘模型
  2. 深度知識追蹤 (DKT) - RNN/LSTM 序列模型
  3. 加權移動平均：近期表現權重高、答對/錯誤類型/提示次數/時間間隔
  4. Item Response Theory (IRT) 三參數模型
- **目前狀態**: RESEARCH
- **需要誰決定**: 數據科學家 + 教學專家 + AI 工程師
- **優先級**: P0
- **決定後影響文檔**: [[02_Features/Mastery System]], [[04_AI/Student Memory]], [[02_Features/AI Chat]], [[08_Database/Schema]]
- **目標決定日期**: 2026-09-25
- **備註": 需先有題目標籤體系 (Knowledge Point) 才能計算

### TBD-03: Level 測驗參數 (題數、通過分、難度、抽題演算法)
- **問題**: 每 Level 測驗幾題？通過門檻？簡中難比例？重考如何避免重複題？
- **背景**: 直接影響學習曲線、挫折感、完成率
- **可能方案**:
  1. 固定 10 題，70% 通過，簡:中:難 = 3:5:2，重考排除近 3 次出現題目
  2. 依知識點數動態決定題數 (每 KP 1-2 題)，採 Mastery 加權抽樣
  3. 自適應長度：連續答對縮短、連續答錯延長
- **目前狀態**: RESEARCH
- **需要誰決定**: 教學專家 + 產品 + 工程
- **優先級**: P0
- **決定後影響文檔**: [[02_Features/Level System]], [[08_Database/Schema]], [[03_Math_Teaching/Math Curriculum]]
- **目標決定日期**: 2026-09-25
- **備註**: 需配合題庫標籤完備度

### TBD-06: AI 核心模型選型 (基座模型、License、GPU、成本)
- **問題**: 選哪個開源模型？License 是否允許商業微調/部署？需要多少 GPU？預估成本？
- **背景**: 決定整個 AI 基建架構、成本結構、上線時間
- **可能方案**:
  1. Llama 3.1 8B/70B (Meta, Llama Community License)
  2. Qwen 2.5 7B/14B/32B/72B (Alibaba, Apache 2.0)
  3. DeepSeek V2.5 / Coder (DeepSeek, 商業友善)
  4. Yi 1.5 9B/34B (01.AI, Apache 2.0)
  5. Gemma 2 9B/27B (Google, Gemma License)
- **目前狀態**: RESEARCH
- **需要誰決定**: AI 領域專家 + 工程主管 + 財務 + 法務
- **優先級**: P0
- **決定後影響文檔**: [[04_AI/AI Model Strategy]], [[14_Research/AI Model Research]], [[14_Research/Open-source Model License Research]], [[12_Development/Roadmap]], [[07_Website/Architecture Overview]]
- **目標決定日期**: 2026-10-15
- **備註": 需實測中文數學推理能力、Context Length 需求、Quantization 效能

### TBD-07: RAG 技術選型 (Vector DB、Embedding Model、Chunk Strategy)
- **問題**: PostgreSQL+pgvector vs Pinecone vs Weaviate vs Milvus？Embedding 用什麼？Chunk size/overlap？
- **背景**: RAG 為 AI 教學知識檢索核心，影響回答品質與成本
- **可能方案**:
  1. pgvector (已有 PostgreSQL，低維運維，適合中小規模)
  2. Pinecone (托管，自動擴縮，成本較高)
  3. Weaviate (開源可自管，混合檢索強)
  4. Milvus (高效能，適合大規模)
  Embedding: BGE-M3 / E5-Mistral / Voyage / OpenAI text-embedding-3-large
- **目前狀態**: RESEARCH
- **需要誰決定**: AI 工程師 + 後端工程師 + 架構師
- **優先級**: P0
- **決定後影響文檔**: [[05_RAG/RAG Architecture]], [[08_Database/Schema]], [[07_Website/Architecture Overview]], [[12_Development/Roadmap]]
- **目標決定日期**: 2026-10-01
- **備註**: 需實測檢索召回率、延遲、成本

---

## 中優先級 (P1 - 影響架構)

### TBD-04: AI 關鍵句觸發機制 (完整解答模式)
- **問題**: 學生輸入什麼關鍵句讓 AI 直接給完整解答？是否開放？如何防濫用？
- **背景': 學生有時確實需要標準解答 (如考前複習)，但違背引導式教學原則
- **可能方案**:
  1. 明確關鍵字：「給我完整解答」、「直接告訴我答案」、「show me solution」
  2. 意圖識別：AI 判斷學生真正需求 (學習 vs 複習 vs 趕作業)
  3. 次數限制：每日/每 Level 限制完整解答次數
  4. 階段解鎖：完成 Level 測驗後才開放該 Level 完整解答
  5. 不提供：堅持引導式，拒絕直接給答
- **目前狀態**: TBD
- **需要誰決定': 產品 + 教學 + AI
- **優先級**: P1
- **決定後影響文檔**: [[02_Features/AI Chat]], [[04_AI/AI Teaching Principles]], [[04_AI/Student Memory]]
- **目標決定日期**: 2026-10-01
- **備註**: 需平衡教學初衷與用戶體驗

### TBD-05: Credits 積分制度 / 定價方案
- **問題**: 如何計費？訂閱制？按用量？免費額度？AI 對話消耗 credits？
- **背景**: 商業模式核心，影響用戶獲取、留存、營收
- **可能方案**:
  1. Freemium：基礎學習地圖免費，AI 對話/高級分析付費
  2. 訂閱制：月費/年費全功能
  3. Credits 制：註冊送 X credits，AI 對話/測驗/相似題消耗
  4. 混合：基礎訂閱 + 額外 credits 包
- **目前狀態**: TBD
- **需要誰決定': 商業 + 產品 + 財務
- **優先級**: P1
- **決定後影響文檔**: [[10_Business_Model/Credits]], [[10_Business_Model/Pricing]], [[02_Features/AI Chat]], [[12_Development/Roadmap]]
- **目標決定日期**: 2026-10-15
- **備註**: 需市場調研與競品分析

### TBD-08: AI Memory 保存策略
- **問題**: 完整對話歷史 vs 摘要壓縮 vs 向量化索引？保存多久？隱私合規？
- **背景**: Context window 有限，長期記憶需壓縮；學生資料敏感度高
- **可能方案**:
  1. 全量保存 (PostgreSQL)，向量化檢索相關片段注入 Context
  2. 階段式摘要：短期完整、長期摘要 (LLM 生成)、關鍵事實提取
  3. 結構化記憶：Knowledge Point 掌握度 + 錯誤模式 + 偏好風格 (不存原文)
- **目前狀態**: RESEARCH
- **需要誰決定': AI + 後端 + 隱私法務
- **優先級**: P1
- **決定後影響文檔**: [[04_AI/Student Memory]], [[08_Database/Schema]], [[11_Security/AI Data Privacy]], [[02_Features/AI Chat]]
- **目標決定日期**: 2026-10-15
- **備註": 需符合個資法/GDPR

### TBD-09: 學生學習狀態頁面正式名稱
- **問題**: 能力測驗結果頁/學習分析頁叫什麼？Learning Analysis? Student Learning Status? Mastery Dashboard?
- **背景': 用戶可見術語需一致、直觀、可翻譯
- **可能方案**:
  1. 學習分析
  2. 學習狀況
  3. 能力報告
  4. 學習儀表板
- **目前狀態**: TBD
- **需要誰決定': 產品 + UX
- **優先級**: P2
- **決定後影響文檔**: [[02_Features/Learning Analysis]], [[09_UI_UX/Sitemap]], [[07_Website/Tech Stack]]
- **目標決定日期**: 2026-09-30

### TBD-10: 首頁 Button 完整清單
- **問題**: 除了學習地圖、AI 問答、個人資料，是否加入錯題本、學習分析、設定等？
- **背景': 資訊架構與導航設計核心
- **可能方案**:
  1. 極簡 3 按鈕 (地圖、AI、資料)
  2. 5 欄式 (地圖、AI、錯題、分析、資料)
  3. 底部導航列 + 側邊抽屜
- **目前狀態**: TBD
- **需要誰決定': 產品 + UX
- **優先級**: P2
- **決定後影響文檔': [[02_Features/Homepage]], [[09_UI_UX/Sitemap]]
- **目標決定日期**: 2026-09-30

---

## 低優先級 (P2/P3 - 功能細節/優化)

### TBD-11: 互動卡片類型與觸發規則細節
- **問題**: 思考/問答/小問題/教學互動的具體 UI、評分、回饋機制
- **目前狀態**: TBD
- **優先級**: P2
- **影響文檔**: [[02_Features/Level System]], [[07_Website/Video Player]]

### TBD-12: 影片播放進度判定標準 (何謂「完成」)
- **問題**: 90% 觀看？必須看完所有卡片？可倍速？
- **目前狀態**: TBD
- **優先級**: P2
- **影響文檔**: [[02_Features/Level System]], [[07_Website/Video Player]]

### TBD-13: 補強機制具體形式 (Level 未通過時)
- **問題**: 重看影片？針對性微課？錯題複習？AI 1-on-1 輔導？
- **目前狀態**: TBD
- **優先級**: P2
- **影響文檔**: [[02_Features/Level System]], [[04_AI/AI Teaching Principles]]

### TBD-14: 題目支援格式細節 (MathML vs LaTeX vs 圖片)
- **問題**: 數學公式儲存/渲染/編輯統一格式
- **目前狀態**: RESEARCH
- **優先級**: P1
- **影響文檔**: [[08_Database/Schema]], [[06_Data/Data Format]], [[07_Website/Tech Stack]]

### TBD-15: Solution Steps 資料結構 (Step/Input/Operation/Output/KP/Error Pattern)
- **問題**: 詳細解題步驟如何結構化儲存，供 AI 推理與錯誤定位使用
- **目前狀態**: RESEARCH
- **優先級**: P1
- **影響文檔**: [[03_Math_Teaching/Math Reasoning]], [[03_Math_Teaching/Operation Decomposition]], [[08_Database/Schema]]

### TBD-16: Expression Tree / Operation Tree 設計
- **問題**: 數學表達式樹結構定義，支援自動化推理與錯誤追蹤
- **目前狀態**: RESEARCH
- **優先級**: P3
- **影響文檔**: [[03_Math_Teaching/Math Reasoning]], [[03_Math_Teaching/Operation Decomposition]]

### TBD-17: Mathematical Reasoning Trace 格式
- **問題**: 完整推理鏈路記錄標準 (供模型訓練/評估/解釋)
- **目前狀態**: RESEARCH
- **優先級': P3
- **影響文檔': [[03_Math_Teaching/Math Reasoning]], [[06_Data/Training Data]]

### TBD-18: 錯誤類型分類體系 (Error Pattern Taxonomy)
- **問題**: 分配律錯誤、移項錯誤、符號錯誤、運算錯誤... 多層級分類
- **目前狀態**: RESEARCH
- **優先級**: P1
- **影響文檔**: [[03_Math_Teaching/Error Pattern]], [[02_Features/Wrong Question System]], [[04_AI/Student Memory]]

### TBD-19: 間隔重複演算法 (SM-2 vs FSRS vs 自訂)
- **問題**: 錯題複習排程算法選擇
- **目前狀態': RESEARCH
- **優先級': P2
- **影響文檔': [[02_Features/Wrong Question System]], [[02_Features/Mastery System]]

### TBD-20: 相似題生成策略 (檢索 vs 生成 vs 混合)
- **問題**: AI 推薦類似題時：從題庫檢索？LLM 生成？模板填充？
- **目前狀態**: RESEARCH
- **優先級': P2
- **影響文檔': [[02_Features/AI Chat]], [[04_AI/AI Teaching Principles]], [[05_RAG/RAG Architecture]]

### TBD-21: 學生資料匯出/刪除機制 (GDPR/個資法)
- **問題**: 右被忘記權、資料攜帶權技術實作
- **目前狀態**: TBD
- **優先級**: P2
- **影響文檔**: [[11_Security/Student Data Security]], [[08_Database/Data Flow]]

### TBD-22: API Rate Limiting 策略
- **問題': AI 對話/測驗/檢索各端點限流規則
- **目前狀態': TBD
- **優先級': P2
- **影響文檔': [[11_Security/API Security]], [[07_Website/Architecture Overview]]

### TBD-23: Secrets Management 方案
- **問題': Vault vs 環境變數 vs Cloud 秘密管理
- **目前狀態': TBD
- **優先級': P2
- **影響文檔': [[11_Security/Secrets Management]], [[07_Website/Architecture Overview]]

### TBD-24: 監控與告警指標體系
- **問題': SLO/SLI 定義、關鍵指標 (延遲、錯誤率、AI 品質、成本)
- **目前狀態': TBD
- **優先級': P3
- **影響文檔': [[12_Development/Roadmap]], [[07_Website/Architecture Overview]]

---

## TBD 狀態儀表板

| 狀態 | 數量 | 佔比 |
|------|------|------|
| RESEARCH | 10 | 42% |
| TBD | 10 | 42% |
| PROPOSED | 0 | 0% |
| BLOCKED | 4 | 16% |
| **總計** | **24** | **100%** |

## 優先級分佈

| 優先級 | 數量 | 關鍵項目 |
|--------|------|----------|
| P0 | 4 | TBD-01, TBD-02, TBD-03, TBD-06, TBD-07 |
| P1 | 5 | TBD-04, TBD-05, TBD-08, TBD-14, TBD-15, TBD-18 |
| P2 | 7 | TBD-09, TBD-10, TBD-11, TBD-12, TBD-13, TBD-19, TBD-20, TBD-21, TBD-22, TBD-23 |
| P3 | 3 | TBD-16, TBD-17, TBD-24 |

> **行動項目**: P0 項目需在 Phase 1-3 完成前決定；P1 項目需在 Phase 4-5 完成前決定

---

## 更新記錄

| 日期 | 變更 | 操作者 |
|------|------|--------|
| 2026-09-10 | 初始建立 24 項 TBD | 產品架構師 |

> **提醒**: 每週例會檢視 TBD 狀態，P0 項目每日追蹤。決策確認後移至 [[13_Decisions/Decision Log|決策日誌]] 並從此列表移除。
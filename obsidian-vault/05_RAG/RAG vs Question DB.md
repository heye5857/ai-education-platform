# RAG 與題庫分離說明

> [!IMPORTANT]
> **狀態**：CONFIRMED - 核心架構原則，[[13_Decisions/Decision Log#DEC-20260910-021|DEC-021]], [[13_Decisions/Decision Log#DEC-20260910-022|DEC-022]]
> **最後更新**：2026-09-10

---

## 核心原則

> [!WARNING]
> **RAG Knowledge Base ≠ Question Database**
> 
> 兩者**用途不同、結構不同、檢索方式不同、更新頻率不同、品質指標不同**
> 
> **嚴禁混用、嚴禁互相替代**

---

## 對照表

| 維度 | RAG Knowledge Base | Question Database |
|------|-------------------|-------------------|
| **核心用途** | AI 回答時的**參考知識來源** | **出題、測驗、錯題記錄、Mastery 計算** |
| **資料性質** | 教學內容、知識解釋、例題講解、定義公式 | 題目、選項、標準答案、解析、KP 標籤、難度 |
| **資料來源** | 教科書、講義、教師解答、影片逐字稿、參考書 | 歷屆試題、習作、補習班題庫、教師自編、AI 生成 |
| **最小單位** | **Document Chunk** (語義分塊, 512 tokens) | **Question** (完整題目實體) |
| **結構關聯** | Document → Chunk (扁平) | Question → KP (多對多) → LevelQuestion → Level → Unit → Course |
| **檢索方式** | **向量語義檢索** + 關鍵字混合 + 重排序 | **精確篩選** (KP、難度、類型、年級) + **隨機抽樣** |
| **查詢意圖** | 「這個概念是什麼？」、「怎麼教這個知識點？」 | 「給我 5 道分配律的中等難度選擇題」 |
| **更新頻率** | **低** (教材版本更新、新課綱) | **高** (持續新增題目、標籤修正、難度校準) |
| **品質指標** | 召回率、覆蓋面、引用準確性 | 標籤正確率、難度校準度、題目品質、無重複 |
| **資料表** | `Document`, `DocumentChunk` (含 `embedding vector`) | `Question`, `KnowledgePoint`, `QuestionKnowledgePoint`, `LevelQuestion`, `Assessment`, `QuestionAttempt`, `WrongQuestion` |
| **向量索引** | **是** (pgvector HNSW) | **否** (不需要語義檢索) |
| **全文索引** | **是** (PostgreSQL GIN/BM25) | **否** (用精確欄位查詢) |
| **資料量級** | 萬~十萬 Chunks (約 100K) | 十萬~百萬 Questions (持續增長) |

---

## 為什麼要分離？

### 1. 檢索目標根本不同
- **RAG**: 找「相關知識」→ 語義相似度為主、容忙噪音、需要廣度
- **Question DB**: 找「精確題目」→ 結構化條件為主、零容忙錯誤、需要精度

### 2. 資料結構不相容
- RAG 的 Chunk 可能包含半個例題、一段定義、一個公式推導
- Question 是完整、自包含、可獨立評分的測驗單位
- 強行合併會導致 Schema 混亂、查詢效能下降

### 3. 更新機制衝突
- RAG 適合批次重建索引 (教材更新時全量重跑)
- Question DB 需要即時寫入、即時可用、支援並發測驗
- 混在一起會導致索引重建鎖住出題功能

### 4. 品質管理不同
- RAG 容許一定噪音 (重排序會過濾)
- Question DB 任何標籤錯誤都會導致出題錯誤、Mastery 計算偏差

---

## 實際運作場景對照

### 場景 1: 學生問 AI「分配律是什麼？」
```
流程: 學生提問 → RAG 檢索
      ├─ 查詢改寫: "分配律 定義 數學 國中"
      ├─ 向量檢索 DocumentChunk (語義相似)
      ├─ 關鍵字檢索: headingPath 包含 "分配律"
      ├─ 重排序: 選教科書定義段落 + 例題講解
      └─ Context 注入 AI → AI 依教學原則引導式解釋
      
資料來源: Document (教科書) → Chunk (定義段落 + 例題)
不使用: Question Table
```

### 場景 2: Level 3 需要 10 道「分配律」中等難度題
```
流程: Level 測驗開始 → Question DB 抽題
      ├─ 讀取 LevelQuestion 關聯的 Question IDs
      ├─ 或: 依 KP=DISTRIBUTIVE_LAW + difficulty=3 + type=SINGLE_CHOICE 篩選
      ├─ 隨機抽樣 (排除學生近 3 次做過的)
      └─ 組卷呈現
      
資料來源: Question + KnowledgePoint + LevelQuestion
不使用: DocumentChunk / 向量索引
```

### 場景 3: 學生做錯題，AI 分析錯誤並給相似題練習
```
流程: QuestionAttempt isCorrect=false
      ├─ 錯誤分析 → 識別 Error Code: ALG_DIST_01 (遺漏項次乘法)
      ├─ 對應 KP: DISTRIBUTIVE_LAW
      ├─ Mastery 更新: DISTRIBUTIVE_LAW 分數下降
      ├─ AI Context 讀取: 學生弱項 KP 包含 DISTRIBUTIVE_LAW
      ├─ 相似題生成: 
      │   ├─ 策略 A: Question DB 篩選同 KP + 相似難度 + 未做過
      │   └─ 策略 B: LLM 依 Operation Tree 生成變式題
      └─ 呈現給學生練習
      
核心資料: Question DB (出題) + Mastery (判斷弱項) + Error Pattern (定位錯誤)
RAG 輔助: AI 解釋時可能檢索「分配律常見錯誤教學片段」
```

---

## 邊界情況處理

| 情境 | 處理原則 | 實作方式 |
|------|----------|----------|
| 題目解析包含教學內容 | 解析存 Question.solutionSteps，不存 RAG | Question 獨立完整 |
| 教材例題可作測驗題 | 例題 → 手動/半自動轉為 Question 入庫 | 明確 ETL 流程、版本管理 |
| AI 回答需要引用教材頁碼 | RAG Chunk metadata 包含 pageNumber | 引用格式: [Doc: 教科書p.45, Chunk: 12] |
| 題目標籤需要參考教材定義 | KP 定義統一來源 → 兩邊同步參考 | KP 為單一真相來源 |
| 新課綱知識點新增 | 先建 KP → 再建 Question → 最後更新 RAG 文檔 | 依賴順序明確 |

---

## 開發檢核清單

- [ ] **資料庫 Schema 完全分離**: 無共用表、無外鍵關聯 RAG ↔ Question
- [ ] **API 端點分離**: `/api/rag/*` vs `/api/questions/*`
- [ ] **服務層分離**: `RAGService` vs `QuestionService`
- [ ] **索引策略分離**: pgvector 只在 DocumentChunk；Question 用 B-tree/GIN
- [ ] **測試資料隔離**: RAG 測試用教材片段；Question 測試用標準題庫
- [ ] **監控指標分離**: RAG 看召回率/延遲；Question 看抽題分布/標籤準確率
- [ ] **文檔明確標註**: 每個功能規格書註明使用哪個資料來源

---

## 相關文檔

- [[05_RAG/RAG Architecture|RAG 架構設計]]
- [[08_Database/Schema|資料庫 Schema]]
- [[08_Database/Database Architecture|資料庫架構]]
- [[02_Features/Level System|Level 出題系統]]
- [[02_Features/AI Chat|AI 問答系統]]
- [[02_Features/Wrong Question System|錯題系統]]
- [[13_Decisions/Decision Log|核心決策]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 確立分離原則 | 系統架構師 |
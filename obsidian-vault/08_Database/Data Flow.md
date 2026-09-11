# 資料流向圖

> [!IMPORTANT]
> **狀態**：PROPOSED - 對應 [[08_Database/System Flowchart|系統流程圖]] 與 [[08_Database/Database Architecture|資料庫架構]]
> **最後更新**：2026-09-10

---

## 核心資料流向

```mermaid
flowchart LR
    subgraph EXTERNAL[外部系統]
        GOOGLE[Google OAuth]
        AI_API[商業 AI API\nOpenAI/Anthropic]
        VIDEO_CDN[影片 CDN\nMux/Cloudflare]
        OBJECT_STORAGE[物件儲存\nS3/R2]
    end

    subgraph FRONTEND[前端 Next.js]
        PAGES[頁面元件]
        HOOKS[Custom Hooks]
        QUERY[TanStack Query\n狀態管理]
        AUTH_CTX[Auth Context]
    end

    subgraph BACKEND[後端 API Routes / Server Actions]
        AUTH_API[Auth API\nNextAuth.js]
        STUDENT_API[Student API]
        CURRICULUM_API[Curriculum API]
        CONTENT_API[Content API\nVideo/Card]
        ASSESSMENT_API[Assessment API]
        QUESTION_API[Question API]
        WRONG_Q_API[WrongQuestion API]
        MASTERY_API[Mastery API]
        AI_CHAT_API[AI Chat API]
        RAG_API[RAG API]
    end

    subgraph DATABASE[(PostgreSQL + pgvector)]
        USER_TBL[(User\nStudent)]
        CURR_TBL[(Course\nUnit\nLevel)]
        CONTENT_TBL[(Video\nInteractiveCard)]
        QUESTION_TBL[(Question\nKnowledgePoint\nLevelQuestion)]
        ATTEMPT_TBL[(Assessment\nAssessmentAttempt\nQuestionAttempt)]
        WRONG_TBL[(WrongQuestion)]
        MASTERY_TBL[(StudentKnowledgePoint\nStudentLearningProfile)]
        PROGRESS_TBL[(LearningProgress)]
        CONV_TBL[(Conversation\nMessage)]
        RAG_TBL[(Document\nDocumentChunk\n+ Embedding)]
    end

    subgraph AI_SERVICES[AI 服務層]
        AI_INTERFACE[AI Service Interface\nProvider Pattern]
        PROMPT_BUILDER[Prompt Builder\nContext Injection]
        TEACHING_ENGINE[Teaching Strategy Engine]
        RAG_PIPELINE[RAG Pipeline\nRetrieval + Rerank]
        LOCAL_MODEL[自有模型\nvLLM/TGI\nPhase 9+]
    end

    subgraph BACKGROUND[背景任務 / Workers]
        MASTERY_WORKER[Mastery 計算 Worker\n批次/增量]
        WRONG_SYNC[WrongQuestion 同步\n觸發器/應用層]
        DOC_PROCESSOR[文檔處理管線\nPDF/Word/OCR/Whisper]
        EMBEDDING_WORKER[Embedding 生成 Worker]
        VECTOR_SYNC[向量索引同步]
        ANALYTICS_WORKER[學習分析聚合]
    end

    %% ===== Flows =====
    
    %% Auth Flow
    GOOGLE -.->|OAuth Callback| AUTH_API
    AUTH_API -->|Create/Find User| USER_TBL
    AUTH_API -->|Session| FRONTEND

    %% Onboarding Flow
    PAGES -->|個人資料| STUDENT_API
    STUDENT_API -->|Create Student| USER_TBL
    STUDENT_API -->|觸發能力測驗| ASSESSMENT_API
    ASSESSMENT_API -->|組卷| QUESTION_TBL
    ASSESSMENT_API -->|建立 Assessment| ATTEMPT_TBL

    %% Assessment Flow
    PAGES -->|作答提交| ASSESSMENT_API
    ASSESSMENT_API -->|記錄 QuestionAttempt| ATTEMPT_TBL
    ATTEMPT_TBL -.->|Trigger Sync| WRONG_SYNC
    WRONG_SYNC -->|Upsert WrongQuestion| WRONG_TBL
    ATTEMPT_TBL -.->|Trigger Mastery| MASTERY_WORKER
    MASTERY_WORKER -->|更新 Mastery| MASTERY_TBL
    ATTEMPT_TBL -->|更新 Profile| MASTERY_TBL

    %% Learning Map Flow
    PAGES -->|載入地圖| CURRICULUM_API
    CURRICULUM_API -->|Course/Unit/Level| CURR_TBL
    CURRICULUM_API -->|Progress| PROGRESS_TBL
    PAGES -->|選擇 Level| CONTENT_API
    CONTENT_API -->|Video + Cards| CONTENT_TBL

    %% Video & Card Flow
    VIDEO_CDN -.->|影片串流| PAGES
    PAGES -->|Card 觸發| CONTENT_API
    CONTENT_API -->|Card 內容| CONTENT_TBL
    PAGES -->|Card 作答| ASSESSMENT_API
    ASSESSMENT_API -->|記錄 Attempt| ATTEMPT_TBL

    %% Level Test Flow
    PAGES -->|開始測驗| ASSESSMENT_API
    ASSESSMENT_API -->|抽題| QUESTION_TBL
    ASSESSMENT_API -->|建立 Attempt| ATTEMPT_TBL
    PAGES -->|提交測驗| ASSESSMENT_API
    ASSESSMENT_API -->|評分 + 更新 Progress| ATTEMPT_TBL
    ASSESSMENT_API -->|解鎖下一 Level| PROGRESS_TBL

    %% AI Chat Flow
    PAGES -->|學生提問| AI_CHAT_API
    AI_CHAT_API -->|Context Builder| PROMPT_BUILDER
    PROMPT_BUILDER -->|Student Profile| USER_TBL
    PROMPT_BUILDER -->|Mastery| MASTERY_TBL
    PROMPT_BUILDER -->|Wrong Questions| WRONG_TBL
    PROMPT_BUILDER -->|History| CONV_TBL
    PROMPT_BUILDER -->|RAG Knowledge| RAG_PIPELINE
    RAG_PIPELINE -->|檢索| RAG_TBL
    PROMPT_BUILDER -->|組裝 Prompt| TEACHING_ENGINE
    TEACHING_ENGINE -->|策略決策| AI_INTERFACE
    AI_INTERFACE -->|呼叫模型| AI_API
    AI_INTERFACE -->|呼叫本地| LOCAL_MODEL
    AI_INTERFACE -->|串流回應| AI_CHAT_API
    AI_CHAT_API -->|儲存對話| CONV_TBL

    %% RAG Pipeline
    OBJECT_STORAGE -.->|原始文檔| DOC_PROCESSOR
    DOC_PROCESSOR -->|Chunk + Metadata| RAG_TBL
    DOC_PROCESSOR -.->|Trigger Embedding| EMBEDDING_WORKER
    EMBEDDING_WORKER -->|生成向量| RAG_TBL
    RAG_TBL -.->|同步索引| VECTOR_SYNC

    %% Analytics
    MASTERY_TBL -.->|聚合| ANALYTICS_WORKER
    WRONG_TBL -.->|聚合| ANALYTICS_WORKER
    PROGRESS_TBL -.->|聚合| ANALYTICS_WORKER
```

---

## 關鍵資料流向詳細說明

### 1. 註冊與 Onboarding 流向
```
Google OAuth → NextAuth.js → User/Student 建立
                    ↓
            觸發初始能力測驗
                    ↓
            題庫篩選 → Assessment 建立
                    ↓
            學生作答 → QuestionAttempt 記錄
                    ↓
            錯誤分析 → WrongQuestion 同步 + Mastery 初始化
                    ↓
            StudentLearningProfile 建立
```

### 2. 學習地圖載入流向
```
前端請求 → Curriculum API
    ├─ Course/Unit/Level 結構 (Course/Unit/Level 表)
    └─ 學生進度 (LearningProgress 表)
          ↓
    合併回應 → 前端渲染節點圖
```

### 3. Level 學習流向
```
影片播放 → Video CDN (串流)
    ↓
時間點觸發 → InteractiveCard 內容 (Content API)
    ↓
學生作答 → QuestionAttempt 記錄
    ↓
即時回饋 → 前端顯示
    ↓
影片完成 → 解鎖 Level Test 入口
    ↓
測驗抽題 → LevelQuestion + Question + KnowledgePoint
    ↓
測驗作答 → QuestionAttempt 批次記錄
    ↓
評分 → AssessmentAttempt 完成
    ↓
通過 → LearningProgress 更新 + 下一 Level 解鎖
    ↓
失敗 → 錯誤分析 + 補強建議
```

### 4. 雙層錯題同步流向
```
QuestionAttempt (isCorrect=false)
    ↓
應用層 / Trigger: Upsert WrongQuestion
    ├─ 新錯題: INSERT (errorCount=1, firstErrorAt=now)
    └─ 既有錯題: UPDATE (errorCount++, lastErrorAt=now)
    ↓
同步更新 StudentKnowledgePoint (Mastery 重算)
    ↓
同步更新 StudentLearningProfile (errorPatterns, weakAreas)
```

### 5. Mastery 計算流向
```
觸發條件:
  - QuestionAttempt 新增/更新
  - WrongQuestion 變更
  - 定時批次 (每日/每小時)

計算輸入:
  - 該 KP 所有 QuestionAttempt
  - 權重: 題目難度、時間權重、提示次數、錯誤類型

計算輸出:
  - masteryScore (0-100)
  - confidence (0-1)
  - updatedAt

輸出用途:
  - AI Context 注入 (Top Weak/Strong KPs)
  - 學習分析儀表板
  - 相似題推薦權重
```

### 6. AI 對話 Context 建構流向
```
學生提問
    ↓
Context Builder 並行查詢:
  ├─ Student Profile (User/Student)
  ├─ Mastery (StudentKnowledgePoint Top 10 Weak/Strong)
  ├─ Wrong Questions (最近 20 筆 + 相關 KP)
  ├─ Conversation History (最近 10 輪)
  └─ RAG Retrieval (學生問題 → 向量檢索 Top 5)
    ↓
Prompt Template 填充
    ↓
Teaching Strategy Engine 決定階段
    ↓
AI Service Interface 呼叫
    ↓
串流回應 → 前端渲染
    ↓
Message 存檔 (Conversation + Message)
```

### 7. RAG 文檔處理流向
```
原始文檔 (PDF/Word/圖片/影片/逐字稿)
    ↓
Document Processor (背景 Worker)
    ├─ PDF: PyMuPDF/pdfplumber → 文字 + 表格 + 圖片位置
    ├─ Word: python-docx → 結構化內容
    ├─ 圖片: OCR (Tesseract/PaddleOCR) → 文字
    ├─ 影片: Whisper → 逐字稿 + 時間軸
    └─ 結構化: 標題層級、公式識別、知識點標記
    ↓
Semantic Chunking (語義分塊)
    ├─ 依標題/段落/例題/公式切分
    ├─ Chunk Size: TBD-07 (建議 512-1024 tokens)
    ├─ Overlap: TBD-07 (建議 10-20%)
    └─ Metadata: headingLevel, kpIds, formulas, imageDescriptions
    ↓
Document + DocumentChunk 寫入 PostgreSQL
    ↓
觸發 Embedding Worker
    ├─ Embedding Model: TBD-07 (BGE-M3/E5-Mistral/Voyage)
    ├─ 批次生成向量
    └─ 更新 DocumentChunk.embedding
    ↓
向量索引同步 (HNSW/IVFFlat)
```

---

## 資料一致性保證

| 流向 | 一致性等級 | 實作機制 |
|------|------------|----------|
| User/Student 建立 | Strong | 交易 (Transaction) |
| QuestionAttempt 寫入 | Strong | 交易 |
| WrongQuestion 同步 | Eventual | 應用層 Upsert + 重試佇列 |
| Mastery 更新 | Eventual | 背景 Worker + 冪等更新 |
| LearningProgress 更新 | Strong | 交易 (測驗完成時) |
| Conversation/Message | Strong | 交易 |
| RAG 文檔處理 | Eventual | 背景管線 + 狀態機 |

---

## 效能考量

| 熱點查詢 | 優化策略 |
|----------|----------|
| 學習地圖載入 (學生所有 Level Progress) | LearningProgress 學生全撈 + Level 基本資訊 JOIN，預期 < 50ms |
| Level 測驗抽題 | LevelQuestion + Question + QuestionKnowledgePoint 預聚合 View |
| 作答提交寫入 | QuestionAttempt 單筆 INSERT，非同步觸發下游 |
| Mastery 讀取 (AI Context) | StudentKnowledgePoint 學生全撈 (約 200-500 rows)，記憶體快取 |
| 錯題本列表 | WrongQuestion 學生 + 狀態 + 排程複合索引 |
| RAG 向量檢索 | pgvector HNSW 索引，Top-K 召回 < 100ms |

---

## 監控指標

| 指標 | 來源 | 告警閾值 |
|------|------|----------|
| QuestionAttempt 寫入延遲 | API Logs | P99 > 500ms |
| WrongQuestion 同步延遲 | Worker Metrics | > 30s |
| Mastery 計算延遲 | Worker Metrics | 批次 > 10min / 增量 > 1min |
| AI 回應延遲 (端到端) | AI Chat API | P95 > 10s |
| RAG 檢索延遲 | RAG API | P95 > 2s |
| 向量索引建立時間 | Worker Logs | 全量 > 4h |

---

## 相關文檔

- [[08_Database/Database Architecture|資料庫架構]]
- [[08_Database/ER Diagram|ER Diagram]]
- [[08_Database/Schema|Prisma Schema]]
- [[08_Database/System Flowchart|系統流程圖]]
- [[12_Development/Roadmap|開發路線圖]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始資料流向設計 | 系統架構師 |
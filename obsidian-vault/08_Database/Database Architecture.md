# 資料庫架構總覽

> [!IMPORTANT]
> **狀態**：PROPOSED - 基於 22 項核心決策設計，TBD 確認後可能調整
> **最後更新**：2026-09-10
> **資料庫**：PostgreSQL 16+
> **ORM**：Prisma 5+

---

## 設計原則

1. **B2C 單租戶** - 無 Organization/Teacher/Class，簡化隔離
2. **學生為中心** - 所有教學資料關聯 Student
3. **雙層錯題** - QuestionAttempt (作答軌跡) + WrongQuestion (複習匯總)
4. **Mastery 獨立** - 不控制 Level 解鎖，供 AI 個人化與分析
5. **RAG 分離** - Document/Chunk 獨立於 Question Bank
6. **可擴充** - 預留 B2B 擴充欄位 (註解中)

---

## 核心實體關係圖

```mermaid
erDiagram
    %% ===== 認證與用戶 =====
    User ||--|| Student : "1:1"
    User {
        string id PK "cuid"
        string email UK
        string name
        string googleId UK
        string avatarUrl
        boolean onboardingCompleted
        datetime createdAt
        datetime updatedAt
    }
    Student {
        string id PK "cuid"
        string userId FK "UK"
        string name
        string school
        int grade "7-12 (國1-高3)"
        string className
        int semester "1 or 2"
        json learningProfile "StudentLearningProfile snapshot"
        datetime createdAt
        datetime updatedAt
    }

    %% ===== 課綱架構 =====
    Course ||--o{ Unit : "1:N"
    Unit ||--o{ Level : "1:N"
    Course {
        string id PK
        string code UK "e.g. MATH_JH_1"
        string name "e.g. 國中數學"
        string description
        int gradeLevel "7,8,9,10,11,12"
        int semester "1,2"
        int sortOrder
        boolean isActive
    }
    Unit {
        string id PK
        string courseId FK
        string code "e.g. LINEAR_EQ"
        string name "e.g. 一元一次方程式"
        string description
        int sortOrder
        json knowledgePoints "KP IDs in this unit"
        boolean isActive
    }
    Level {
        string id PK
        string unitId FK
        int levelNumber "1,2,3,4"
        string name "e.g. 基礎概念"
        string description
        string videoId FK "Video"
        int passScore "TBD-03"
        int questionCount "TBD-03"
        json difficultyDistribution "TBD-03"
        boolean isActive
    }

    %% ===== 影片與互動卡片 =====
    Video ||--o{ InteractiveCard : "1:N"
    Video {
        string id PK
        string url "Mux/Cloudflare/S3 URL"
        int durationSeconds
        string title
        string description
        json metadata "chapters, thumbnails"
        datetime createdAt
    }
    InteractiveCard {
        string id PK
        string videoId FK
        int triggerTimeSeconds "影片時間點"
        string type "THOUGHT_QUESTION|QNA|MINI_PROBLEM|TEACHING_INTERACTION"
        json content "題目、選項、提示、解析"
        int sortOrder
        boolean isRequired
    }

    %% ===== 題庫系統 =====
    KnowledgePoint }|--o{ QuestionKnowledgePoint : "1:N"
    Question ||--o{ QuestionKnowledgePoint : "1:N"
    Level }|--o{ LevelQuestion : "1:N"
    Question ||--o{ LevelQuestion : "1:N"
    KnowledgePoint {
        string id PK
        string code UK "e.g. DISTRIBUTIVE_LAW"
        string name "e.g. 分配律"
        string description
        string domain "ALGEBRA|GEOMETRY|STATISTICS|..."
        string topic "e.g. 多項式運算"
        int difficulty "1-5"
        json prerequisites "前置 KP IDs"
        json errorPatterns "常見錯誤類型"
    }
    Question {
        string id PK
        string type "SINGLE_CHOICE|MULTIPLE_CHOICE|FILL_BLANK|SHORT_ANSWER|PROOF"
        string stem "題目內容 (LaTeX/Markdown)"
        json options "選項陣列"
        string answer "標準答案"
        json solutionSteps "Solution Steps 結構"
        int difficulty "1-5"
        string source "TEXTBOOK|EXAM|WORKBOOK|TEACHER|GENERATED"
        string gradeLevel "7-12"
        json tags "自定義標籤"
        datetime createdAt
        datetime updatedAt
    }
    QuestionKnowledgePoint {
        string questionId FK
        string knowledgePointId FK
        float weight "該題對此 KP 權重"
        @@id [questionId, knowledgePointId]
    }
    LevelQuestion {
        string levelId FK
        string questionId FK
        int sortOrder
        @@id [levelId, questionId]
    }

    %% ===== 測驗與作答 =====
    Assessment ||--o{ AssessmentAttempt : "1:N"
    Student ||--o{ AssessmentAttempt : "1:N"
    AssessmentAttempt ||--o{ QuestionAttempt : "1:N"
    Question ||--o{ QuestionAttempt : "1:N"
    Assessment {
        string id PK
        string type "INITIAL|LEVEL_TEST|PRACTICE|MOCK"
        string levelId FK "nullable, Level Test 關聯"
        string name
        json config "時間限制、題數、及格分等"
        boolean isActive
    }
    AssessmentAttempt {
        string id PK
        string assessmentId FK
        string studentId FK
        int score
        int maxScore
        boolean passed
        json answers "題目ID -> 學生答案"
        int timeSpentSeconds
        datetime startedAt
        datetime completedAt
    }
    QuestionAttempt {
        string id PK
        string assessmentAttemptId FK
        string questionId FK
        string studentId FK "冗餘便於查詢"
        string studentAnswer
        boolean isCorrect
        int attemptNumber "該測驗中第幾次作答此題"
        int hintsUsed
        int timeSpentSeconds
        json errorAnalysis "錯誤步驟、類型、KP"
        datetime createdAt
    }

    %% ===== 錯題系統 =====
    Student ||--o{ WrongQuestion : "1:N"
    Question ||--o{ WrongQuestion : "1:N"
    WrongQuestion {
        string id PK
        string studentId FK
        string questionId FK
        int errorCount "累積錯誤次數"
        datetime firstErrorAt
        datetime lastErrorAt
        string reviewStatus "NEW|REVIEWING|MASTERED|ARCHIVED"
        int reviewCount
        datetime nextReviewAt "間隔重複排程"
        json errorPatterns "歷次錯誤類型統計"
        @@unique [studentId, questionId]
    }

    %% ===== Mastery 掌握度 =====
    Student ||--o{ StudentKnowledgePoint : "1:N"
    KnowledgePoint ||--o{ StudentKnowledgePoint : "1:N"
    StudentKnowledgePoint {
        string studentId FK
        string knowledgePointId FK
        float masteryScore "0-100"
        float confidence "0-1, 樣本數信心度"
        int attemptCount
        int correctCount
        datetime lastAttemptAt
        datetime updatedAt
        @@id [studentId, knowledgePointId]
    }

    %% ===== 學習進度 =====
    Student ||--o{ LearningProgress : "1:N"
    Level ||--o{ LearningProgress : "1:N"
    LearningProgress {
        string id PK
        string studentId FK
        string levelId FK
        string status "LOCKED|AVAILABLE|IN_PROGRESS|COMPLETED|MASTERED"
        float videoProgress "0-1"
        json cardsCompleted "Card IDs"
        datetime startedAt
        datetime completedAt
        int testAttempts
        @@unique [studentId, levelId]
    }

    %% ===== AI 對話與記憶 =====
    Student ||--o{ Conversation : "1:N"
    Conversation ||--o{ Message : "1:N"
    Conversation {
        string id PK
        string studentId FK
        string title
        string status "ACTIVE|ARCHIVED|DELETED"
        json contextSnapshot "當時 Mastery/Profile 快照"
        datetime createdAt
        datetime updatedAt
    }
    Message {
        string id PK
        string conversationId FK
        string role "USER|ASSISTANT|SYSTEM"
        string content "Markdown + LaTeX"
        json metadata "tokens, model, latency, citations"
        datetime createdAt
    }

    %% ===== 學生學習檔案 (能力測驗結果) =====
    Student ||--|| StudentLearningProfile : "1:1"
    StudentLearningProfile {
        string studentId PK FK
        int gradeLevel
        json unitMastery "Unit -> mastery summary"
        json knowledgePointMastery "KP -> mastery snapshot"
        json errorPatterns "錯誤類型分佈"
        json weakAreas "需加強單元/KP"
        json strongAreas "優勢單元/KP"
        datetime assessedAt
        datetime updatedAt
    }

    %% ===== RAG 知識庫 (獨立於題庫) =====
    Document ||--o{ DocumentChunk : "1:N"
    Document {
        string id PK
        string title
        string source "TEXTBOOK|WORKBOOK|LECTURE_NOTE|EXAM|VIDEO_TRANSCRIPT"
        string gradeLevel "7-12"
        string subject "MATH|CHINESE|ENGLISH|SCIENCE|SOCIAL"
        string unitCode "對應 Unit.code"
        json metadata "作者、版本、頁碼、影片時間軸"
        datetime createdAt
        datetime updatedAt
    }
    DocumentChunk {
        string id PK
        string documentId FK
        int chunkIndex
        string content "純文字/Markdown"
        vector embedding "pgvector: vector(1024) or 1536"
        json metadata "標題層級、知識點、公式、圖片描述"
        datetime createdAt
    }

    %% ===== 索引建議 =====
    %% @Index: Student.gradeLevel, Student.semester
    %% @Index: Level.unitId, Level.levelNumber
    %% @Index: Question.gradeLevel, Question.difficulty, Question.type
    %% @Index: QuestionKnowledgePoint.knowledgePointId
    %% @Index: AssessmentAttempt.studentId, AssessmentAttempt.completedAt
    %% @Index: QuestionAttempt.studentId, QuestionAttempt.createdAt
    %% @Index: WrongQuestion.studentId, WrongQuestion.reviewStatus, WrongQuestion.nextReviewAt
    %% @Index: StudentKnowledgePoint.studentId, StudentKnowledgePoint.masteryScore
    %% @Index: LearningProgress.studentId, LearningProgress.status
    %% @Index: Conversation.studentId, Conversation.updatedAt
    %% @Index: DocumentChunk.embedding (HNSW/IVFFlat)
    %% @Index: DocumentChunk.documentId, DocumentChunk.chunkIndex
```

---

## Schema 演進策略

### Phase 1-3 (Auth + Student)
- User, Student 基礎模型
- 無教學相關表

### Phase 4 (學習地圖)
- Course, Unit, Level, Video, InteractiveCard
- LearningProgress

### Phase 5 (題庫與測驗)
- KnowledgePoint, Question, QuestionKnowledgePoint, LevelQuestion
- Assessment, AssessmentAttempt, QuestionAttempt

### Phase 6 (錯題與 Mastery)
- WrongQuestion, StudentKnowledgePoint
- StudentLearningProfile

### Phase 7 (AI 對話)
- Conversation, Message

### Phase 8 (RAG)
- Document, DocumentChunk (with pgvector)

### Phase 9+ (自有模型)
- ModelVersion, TrainingRun, EvaluationResult (另建 ML Schema)

---

## 關鍵查詢模式優化

| 查詢場景 | 優化策略 |
|----------|----------|
| 學生學習地圖載入 | `LearningProgress` 學生全撈 + Level 基本資訊 join |
| Level 測驗抽題 | `LevelQuestion` + `Question` + `QuestionKnowledgePoint` 預聚合 |
| 作答提交 | `QuestionAttempt` 單筆寫入 + `WrongQuestion` Upsert |
| Mastery 讀取 | `StudentKnowledgePoint` 學生全撈 (約 200-500 KP) |
| 錯題本列表 | `WrongQuestion` 學生 + 狀態 + 排程索引 |
| AI Context 建構 | 學生 Profile + Mastery Top K + WrongQuestion Recent + Conversation Recent |
| RAG 檢索 | `DocumentChunk` 向量索引 + Metadata 過濾 |

---

## 遷移與版本控制

```bash
# 開發環境
npx prisma migrate dev --name "init_schema"

# 生產環境
npx prisma migrate deploy

# Schema 變更流程
1. 修改 schema.prisma
2. npx prisma migrate dev --name "descriptive_name"
3. Code Review 包含 migration SQL 檢查
4. 部署時自動執行 migrate deploy
```

---

## 備份與災難恢復

- **RPO**: 1 小時 (WAL-G / pgBackRest)
- **RTO**: 30 分鐘
- **備份頻率**: 每日全備 + 每小時增量
- **跨區複製**: Primary (ap-northeast-1) → Standby (ap-southeast-1)

---

## 相關文檔

- [[08_Database/ER Diagram|ER Diagram 詳細版]]
- [[08_Database/Schema|Prisma Schema 完整定義]]
- [[08_Database/Data Flow|資料流向圖]]
- [[08_Database/System Flowchart|系統完整流程圖]]
- [[13_Decisions/Decision Log|核心決策依據]]
- [[13_Decisions/TBD|待決定影響 Schema 的項目]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始架構設計 | 系統架構師 |
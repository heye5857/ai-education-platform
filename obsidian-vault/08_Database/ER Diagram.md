# ER Diagram 詳細版

> [!NOTE]
> 此圖為 [[08_Database/Database Architecture|資料庫架構]] 的詳細 ER 圖表
> 使用 Mermaid 語法，在 Obsidian 中可直接渲染

---

## 完整 ER Diagram

```mermaid
erDiagram
    %% ==================== 認證與用戶層 ====================
    User ||--|| Student : "1:1"
    
    User {
        string id PK "cuid()"
        string email UK "unique"
        string name "nullable"
        string googleId UK "unique"
        string avatarUrl "nullable"
        boolean onboardingCompleted "default: false"
        datetime createdAt "default: now()"
        datetime updatedAt "auto"
    }
    
    Student {
        string id PK "cuid()"
        string userId FK "unique"
        string name "nullable"
        string school "nullable"
        int grade "7-12"
        string className "nullable"
        int semester "1 or 2"
        json learningProfile "StudentLearningProfile 快照"
        datetime createdAt
        datetime updatedAt
    }

    %% ==================== 課綱架構層 ====================
    Course ||--o{ Unit : "1:N"
    Unit ||--o{ Level : "1:N"
    
    Course {
        string id PK "cuid()"
        string code UK "MATH_JH_1, MATH_SH_1"
        string name "國中數學、高中數學"
        string description "nullable"
        int gradeLevel "7,8,9,10,11,12"
        int semester "1,2"
        int sortOrder "default: 0"
        boolean isActive "default: true"
    }
    
    Unit {
        string id PK "cuid()"
        string courseId FK
        string code "LINEAR_EQ, QUADRATIC_FUNC"
        string name "一元一次方程式、二次函數"
        string description "nullable"
        int sortOrder "default: 0"
        json knowledgePoints "[KP IDs]"
        boolean isActive "default: true"
    }
    
    Level {
        string id PK "cuid()"
        string unitId FK
        int levelNumber "1,2,3,4"
        string name "基礎概念、進階應用、綜合練習、挑戰題"
        string description "nullable"
        string videoId FK "Video"
        int passScore "TBD-03"
        int questionCount "TBD-03"
        json difficultyDistribution "TBD-03"
        boolean isActive "default: true"
    }

    %% ==================== 內容層 ====================
    Video ||--o{ InteractiveCard : "1:N"
    
    Video {
        string id PK "cuid()"
        string url "Mux/S3 URL"
        int durationSeconds
        string title
        string description "nullable"
        json metadata "chapters, thumbnails, subtitles"
        datetime createdAt
    }
    
    InteractiveCard {
        string id PK "cuid()"
        string videoId FK
        int triggerTimeSeconds
        string type "THOUGHT_QUESTION | QNA | MINI_PROBLEM | TEACHING_INTERACTION"
        json content "stem, options, hints, explanation"
        int sortOrder
        boolean isRequired "default: true"
    }

    %% ==================== 題庫層 ====================
    KnowledgePoint }|--o{ QuestionKnowledgePoint : "1:N"
    Question ||--o{ QuestionKnowledgePoint : "1:N"
    Level }|--o{ LevelQuestion : "1:N"
    Question ||--o{ LevelQuestion : "1:N"
    
    KnowledgePoint {
        string id PK "cuid()"
        string code UK "DISTRIBUTIVE_LAW"
        string name "分配律"
        string description "nullable"
        string domain "ALGEBRA | GEOMETRY | STATISTICS | NUMBER | FUNCTION"
        string topic "多項式運算"
        int difficulty "1-5"
        json prerequisites "[KP IDs]"
        json errorPatterns "[ERROR_PATTERN_CODES]"
    }
    
    Question {
        string id PK "cuid()"
        string type "SINGLE_CHOICE | MULTIPLE_CHOICE | FILL_BLANK | SHORT_ANSWER | PROOF"
        string stem "LaTeX/Markdown"
        json options "[{id, text, isCorrect}]"
        string answer "標準答案"
        json solutionSteps "Solution Steps 結構化"
        int difficulty "1-5"
        string source "TEXTBOOK | EXAM | WORKBOOK | TEACHER | GENERATED"
        int gradeLevel "7-12"
        json tags "[]"
        datetime createdAt
        datetime updatedAt
    }
    
    QuestionKnowledgePoint {
        string questionId FK
        string knowledgePointId FK
        float weight "0.0-1.0"
        @@id [questionId, knowledgePointId]
    }
    
    LevelQuestion {
        string levelId FK
        string questionId FK
        int sortOrder
        @@id [levelId, questionId]
    }

    %% ==================== 測驗與作答層 ====================
    Assessment ||--o{ AssessmentAttempt : "1:N"
    Student ||--o{ AssessmentAttempt : "1:N"
    AssessmentAttempt ||--o{ QuestionAttempt : "1:N"
    Question ||--o{ QuestionAttempt : "1:N"
    
    Assessment {
        string id PK "cuid()"
        string type "INITIAL | LEVEL_TEST | PRACTICE | MOCK"
        string levelId FK "nullable"
        string name
        json config "timeLimit, questionCount, passScore, shuffle"
        boolean isActive "default: true"
    }
    
    AssessmentAttempt {
        string id PK "cuid()"
        string assessmentId FK
        string studentId FK
        int score
        int maxScore
        boolean passed
        json answers "questionId -> studentAnswer"
        int timeSpentSeconds
        datetime startedAt
        datetime completedAt "nullable"
    }
    
    QuestionAttempt {
        string id PK "cuid()"
        string assessmentAttemptId FK
        string questionId FK
        string studentId FK "denormalized"
        string studentAnswer "nullable"
        boolean isCorrect
        int attemptNumber "1,2,3..."
        int hintsUsed "default: 0"
        int timeSpentSeconds
        json errorAnalysis "step, errorType, kpId"
        datetime createdAt
    }

    %% ==================== 錯題系統層 ====================
    Student ||--o{ WrongQuestion : "1:N"
    Question ||--o{ WrongQuestion : "1:N"
    
    WrongQuestion {
        string id PK "cuid()"
        string studentId FK
        string questionId FK
        int errorCount "default: 1"
        datetime firstErrorAt
        datetime lastErrorAt
        string reviewStatus "NEW | REVIEWING | MASTERED | ARCHIVED"
        int reviewCount "default: 0"
        datetime nextReviewAt "nullable"
        json errorPatterns "歷次錯誤類型統計"
        @@unique [studentId, questionId]
    }

    %% ==================== Mastery 掌握度層 ====================
    Student ||--o{ StudentKnowledgePoint : "1:N"
    KnowledgePoint ||--o{ StudentKnowledgePoint : "1:N"
    
    StudentKnowledgePoint {
        string studentId FK
        string knowledgePointId FK
        float masteryScore "0-100"
        float confidence "0-1"
        int attemptCount "default: 0"
        int correctCount "default: 0"
        datetime lastAttemptAt "nullable"
        datetime updatedAt
        @@id [studentId, knowledgePointId]
    }

    %% ==================== 學習進度層 ====================
    Student ||--o{ LearningProgress : "1:N"
    Level ||--o{ LearningProgress : "1:N"
    
    LearningProgress {
        string id PK "cuid()"
        string studentId FK
        string levelId FK
        string status "LOCKED | AVAILABLE | IN_PROGRESS | COMPLETED | MASTERED"
        float videoProgress "0-1"
        json cardsCompleted "[cardIds]"
        datetime startedAt "nullable"
        datetime completedAt "nullable"
        int testAttempts "default: 0"
        @@unique [studentId, levelId]
    }

    %% ==================== AI 對話層 ====================
    Student ||--o{ Conversation : "1:N"
    Conversation ||--o{ Message : "1:N"
    
    Conversation {
        string id PK "cuid()"
        string studentId FK
        string title "nullable"
        string status "ACTIVE | ARCHIVED | DELETED"
        json contextSnapshot "Mastery/Profile/History snapshot"
        datetime createdAt
        datetime updatedAt
    }
    
    Message {
        string id PK "cuid()"
        string conversationId FK
        string role "USER | ASSISTANT | SYSTEM"
        string content "Markdown + LaTeX"
        json metadata "tokens, model, latency, citations, toolCalls"
        datetime createdAt
    }

    %% ==================== 學生學習檔案 ====================
    Student ||--|| StudentLearningProfile : "1:1"
    
    StudentLearningProfile {
        string studentId PK FK
        int gradeLevel
        json unitMastery "unitId -> {mastery, status}"
        json knowledgePointMastery "kpId -> {mastery, confidence}"
        json errorPatterns "errorType -> count"
        json weakAreas "[{unitId, kpIds, reason}]"
        json strongAreas "[{unitId, kpIds}]"
        datetime assessedAt
        datetime updatedAt
    }

    %% ==================== RAG 知識庫層 (獨立) ====================
    Document ||--o{ DocumentChunk : "1:N"
    
    Document {
        string id PK "cuid()"
        string title
        string source "TEXTBOOK | WORKBOOK | LECTURE_NOTE | EXAM | VIDEO_TRANSCRIPT"
        int gradeLevel "7-12"
        string subject "MATH | CHINESE | ENGLISH | SCIENCE | SOCIAL"
        string unitCode "nullable, 對應 Unit.code"
        json metadata "author, version, page, videoTimestamp"
        datetime createdAt
        datetime updatedAt
    }
    
    DocumentChunk {
        string id PK "cuid()"
        string documentId FK
        int chunkIndex
        string content "text/markdown"
        vector embedding "vector(1024) or vector(1536)"
        json metadata "headingLevel, kpIds, formulas, imageDescriptions"
        datetime createdAt
    }

    %% ==================== 索引建議 (註解區) ====================
    %% CREATE INDEX idx_student_grade ON Student(gradeLevel);
    %% CREATE INDEX idx_student_semester ON Student(semester);
    %% CREATE INDEX idx_level_unit ON Level(unitId, levelNumber);
    %% CREATE INDEX idx_question_grade_diff ON Question(gradeLevel, difficulty);
    %% CREATE INDEX idx_question_kp ON QuestionKnowledgePoint(knowledgePointId);
    %% CREATE INDEX idx_assessment_attempt_student ON AssessmentAttempt(studentId, completedAt DESC);
    %% CREATE INDEX idx_question_attempt_student ON QuestionAttempt(studentId, createdAt DESC);
    %% CREATE INDEX idx_wrong_question_review ON WrongQuestion(studentId, reviewStatus, nextReviewAt);
    %% CREATE INDEX idx_mastery_student_score ON StudentKnowledgePoint(studentId, masteryScore DESC);
    %% CREATE INDEX idx_progress_student_status ON LearningProgress(studentId, status);
    %% CREATE INDEX idx_conversation_student_updated ON Conversation(studentId, updatedAt DESC);
    %% CREATE INDEX idx_document_chunk_embedding ON DocumentChunk USING hnsw (embedding vector_cosine_ops);
    %% CREATE INDEX idx_document_chunk_doc ON DocumentChunk(documentId, chunkIndex);
```

---

## 關鍵關係說明

### 1. 課綱三層結構
```
Course (國中數學 7年級上)
  └── Unit (一元一次方程式)
        ├── Level 1 (基礎概念: 解一元一次方程式)
        ├── Level 2 (進階應用: 應用題建立方程式)
        ├── Level 3 (綜合練習: 分數方程式、小數方程式)
        └── Level 4 (挑戰題: 參數方程式、絕對值方程式)
```

### 2. 題庫關聯
```
Level 1
  └── LevelQuestion (關聯 10-15 題)
        ├── Question Q001 (KP: 移項, 分配律)
        ├── Question Q002 (KP: 合併同類項)
        └── ...
```

### 3. 雙層錯題機制
```
QuestionAttempt (每次作答完整記錄)
  └── 觸發同步
WrongQuestion (學生-題目 唯一匯總)
  └── 複習排程、錯誤模式統計
```

### 4. Mastery 獨立計算
```
StudentKnowledgePoint (學生 x KP 矩陣)
  └── 來源: QuestionAttempt (含 InteractiveCard、測驗、能力測驗)
  └── 用途: AI 個人化、學習分析、相似題推薦
  └── 不控制: Level 解鎖 (僅影片完成+測驗通過)
```

### 5. RAG 完全分離
```
Document (教材、講義、影片逐字稿)
  └── DocumentChunk (語義分塊 + Embedding)
        └── 向量檢索 → AI 回答引用
完全不關聯 Question/QuestionAttempt/WrongQuestion
```

---

## 視覺化工具建議

- **設計階段**: dbdiagram.io / Mermaid Live Editor
- **文檔同步**: Prisma Schema → Mermaid 自動生成腳本
- **團隊審查**: 匯出 PNG/SVG 放入 Notion/Confluence

---

## 相關文檔

- [[08_Database/Database Architecture|資料庫架構總覽]]
- [[08_Database/Schema|Prisma Schema 完整定義]]
- [[08_Database/Data Flow|資料流向圖]]
- [[13_Decisions/Decision Log|核心決策依據]]
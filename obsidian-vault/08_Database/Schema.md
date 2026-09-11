# Prisma Schema 完整定義

> [!IMPORTANT]
> **狀態**：PROPOSED - 對應 [[08_Database/Database Architecture|資料庫架構]] 與 [[08_Database/ER Diagram|ER Diagram]]
> **最後更新**：2026-09-10
> **Prisma 版本**：5.10+

---

## 完整 schema.prisma

```prisma
// ============================================
// AI 教育平台 - Prisma Schema
// ============================================

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
  // 啟用 pgvector 擴充
  // extensions = [vector]
}

// ============================================
// Enums
// ============================================

enum UserRole {
  STUDENT
  // 預留 B2B 擴充
  // TEACHER
  // ADMIN
  // SUPER_ADMIN
}

enum Semester {
  FIRST   // 上學期 8-1月
  SECOND  // 下學期 2-7月
}

enum GradeLevel {
  G7  // 國一
  G8  // 國二
  G9  // 國三
  G10 // 高一
  G11 // 高二
  G12 // 高三
}

enum CourseType {
  MATH
  // 預留其他科目
  // CHINESE
  // ENGLISH
  // SCIENCE
  // SOCIAL
}

enum LevelStatus {
  LOCKED
  AVAILABLE
  IN_PROGRESS
  COMPLETED
  MASTERED
}

enum AssessmentType {
  INITIAL      // 初始能力測驗
  LEVEL_TEST   // Level 測驗
  PRACTICE     // 練習
  MOCK         // 模擬考
}

enum QuestionType {
  SINGLE_CHOICE
  MULTIPLE_CHOICE
  FILL_BLANK
  SHORT_ANSWER
  PROOF
}

enum QuestionSource {
  TEXTBOOK
  EXAM
  WORKBOOK
  TEACHER
  GENERATED
}

enum KnowledgeDomain {
  ALGEBRA
  GEOMETRY
  STATISTICS
  NUMBER
  FUNCTION
  PROBABILITY
  CALCULUS
  TRIGONOMETRY
  VECTOR
  LOGIC
}

enum DifficultyLevel {
  VERY_EASY     // 1
  EASY          // 2
  MEDIUM        // 3
  HARD          // 4
  VERY_HARD     // 5
}

enum InteractiveCardType {
  THOUGHT_QUESTION  // 思考問題
  QNA               // 問答
  MINI_PROBLEM      // 小問題
  TEACHING_INTERACTION // 教學互動
}

enum WrongQuestionReviewStatus {
  NEW
  REVIEWING
  MASTERED
  ARCHIVED
}

enum ConversationStatus {
  ACTIVE
  ARCHIVED
  DELETED
}

enum MessageRole {
  USER
  ASSISTANT
  SYSTEM
}

enum DocumentSource {
  TEXTBOOK
  WORKBOOK
  LECTURE_NOTE
  EXAM
  VIDEO_TRANSCRIPT
}

enum DocumentSubject {
  MATH
  CHINESE
  ENGLISH
  SCIENCE
  SOCIAL
}

// ============================================
// Models - Auth & User
// ============================================

model User {
  id                    String    @id @default(cuid())
  email                 String    @unique
  name                  String?
  googleId              String    @unique
  avatarUrl             String?
  role                  UserRole  @default(STUDENT)
  onboardingCompleted   Boolean   @default(false)
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt

  student               Student?

  @@map("users")
}

model Student {
  id              String    @id @default(cuid())
  userId          String    @unique
  user            User      @relation(fields: [userId], references: [id], onDelete: Cascade)
  name            String?
  school          String?
  grade           Int       // 7-12
  className       String?
  semester        Int       // 1 or 2
  learningProfile Json?     // StudentLearningProfile 快照
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt

  // Relations
  assessmentAttempts    AssessmentAttempt[]
  questionAttempts      QuestionAttempt[]
  wrongQuestions        WrongQuestion[]
  knowledgePoints       StudentKnowledgePoint[]
  learningProgress      LearningProgress[]
  conversations         Conversation[]
  learningProfile       StudentLearningProfile?

  @@index([grade])
  @@index([semester])
  @@map("students")
}

// ============================================
// Models - Curriculum
// ============================================

model Course {
  id          String   @id @default(cuid())
  code        String   @unique // MATH_JH_1, MATH_SH_1
  name        String   // 國中數學、高中數學
  description String?
  gradeLevel  Int      // 7,8,9,10,11,12
  semester    Int      // 1,2
  sortOrder   Int      @default(0)
  isActive    Boolean  @default(true)

  units       Unit[]

  @@index([gradeLevel, semester])
  @@map("courses")
}

model Unit {
  id              String   @id @default(cuid())
  courseId        String
  course          Course   @relation(fields: [courseId], references: [id], onDelete: Cascade)
  code            String   // LINEAR_EQ, QUADRATIC_FUNC
  name            String   // 一元一次方程式、二次函數
  description     String?
  sortOrder       Int      @default(0)
  knowledgePoints Json?    // KP IDs in this unit
  isActive        Boolean  @default(true)

  levels          Level[]

  @@index([courseId, sortOrder])
  @@map("units")
}

model Level {
  id                      String   @id @default(cuid())
  unitId                  String
  unit                    Unit     @relation(fields: [unitId], references: [id], onDelete: Cascade)
  levelNumber             Int      // 1,2,3,4
  name                    String   // 基礎概念、進階應用、綜合練習、挑戰題
  description             String?
  videoId                 String?  @unique
  video                   Video?   @relation(fields: [videoId], references: [id], onDelete: SetNull)
  passScore               Int      @default(70) // TBD-03
  questionCount           Int      @default(10) // TBD-03
  difficultyDistribution  Json?    // TBD-03: {easy: 3, medium: 5, hard: 2}
  isActive                Boolean  @default(true)

  questions               LevelQuestion[]
  learningProgress        LearningProgress[]
  assessments             Assessment[]

  @@unique([unitId, levelNumber])
  @@index([unitId, levelNumber])
  @@map("levels")
}

// ============================================
// Models - Content (Video & Cards)
// ============================================

model Video {
  id          String   @id @default(cuid())
  url         String   // Mux/Cloudflare/S3 URL
  durationSeconds Int
  title       String
  description String?
  metadata    Json?    // chapters, thumbnails, subtitles
  createdAt   DateTime @default(now())

  level       Level?   @relation(fields: [videoId], references: [id], onDelete: SetNull)
  cards       InteractiveCard[]

  @@map("videos")
}

model InteractiveCard {
  id              String   @id @default(cuid())
  videoId         String
  video           Video    @relation(fields: [videoId], references: [id], onDelete: Cascade)
  triggerTimeSeconds Int
  type            InteractiveCardType
  content         Json     // stem, options, hints, explanation
  sortOrder       Int      @default(0)
  isRequired      Boolean  @default(true)

  @@index([videoId, triggerTimeSeconds])
  @@map("interactive_cards")
}

// ============================================
// Models - Question Bank
// ============================================

model KnowledgePoint {
  id              String   @id @default(cuid())
  code            String   @unique // DISTRIBUTIVE_LAW
  name            String   // 分配律
  description     String?
  domain          KnowledgeDomain
  topic           String   // 多項式運算
  difficulty      Int      @default(3) // 1-5
  prerequisites   Json?    // 前置 KP IDs
  errorPatterns   Json?    // 常見錯誤類型代碼

  questions       QuestionKnowledgePoint[]
  studentMastery  StudentKnowledgePoint[]

  @@index([domain, topic])
  @@map("knowledge_points")
}

model Question {
  id              String   @id @default(cuid())
  type            QuestionType
  stem            String   // LaTeX/Markdown
  options         Json?    // [{id, text, isCorrect}]
  answer          String   // 標準答案
  solutionSteps   Json?    // Solution Steps 結構化
  difficulty      Int      @default(3) // 1-5
  source          QuestionSource
  gradeLevel      Int      // 7-12
  tags            Json?    // []
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  knowledgePoints QuestionKnowledgePoint[]
  levelQuestions  LevelQuestion[]
  attempts        QuestionAttempt[]
  wrongQuestions  WrongQuestion[]

  @@index([gradeLevel, difficulty])
  @@index([type])
  @@map("questions")
}

model QuestionKnowledgePoint {
  questionId         String
  question           Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  knowledgePointId   String
  knowledgePoint     KnowledgePoint @relation(fields: [knowledgePointId], references: [id], onDelete: Cascade)
  weight             Float  @default(1.0) // 0.0-1.0

  @@id([questionId, knowledgePointId])
  @@map("question_knowledge_points")
}

model LevelQuestion {
  levelId      String
  level        Level    @relation(fields: [levelId], references: [id], onDelete: Cascade)
  questionId   String
  question     Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  sortOrder    Int      @default(0)

  @@id([levelId, questionId])
  @@map("level_questions")
}

// ============================================
// Models - Assessment & Attempts
// ============================================

model Assessment {
  id          String   @id @default(cuid())
  type        AssessmentType
  levelId     String?
  level       Level?   @relation(fields: [levelId], references: [id], onDelete: SetNull)
  name        String
  config      Json     // timeLimit, questionCount, passScore, shuffle
  isActive    Boolean  @default(true)

  attempts    AssessmentAttempt[]

  @@index([type, levelId])
  @@map("assessments")
}

model AssessmentAttempt {
  id              String   @id @default(cuid())
  assessmentId    String
  assessment      Assessment @relation(fields: [assessmentId], references: [id], onDelete: Cascade)
  studentId       String
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  score           Int
  maxScore        Int
  passed          Boolean
  answers         Json     // questionId -> studentAnswer
  timeSpentSeconds Int
  startedAt       DateTime @default(now())
  completedAt     DateTime?

  questionAttempts QuestionAttempt[]

  @@index([studentId, completedAt])
  @@index([assessmentId, studentId])
  @@map("assessment_attempts")
}

model QuestionAttempt {
  id                    String   @id @default(cuid())
  assessmentAttemptId   String
  assessmentAttempt     AssessmentAttempt @relation(fields: [assessmentAttemptId], references: [id], onDelete: Cascade)
  questionId            String
  question              Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  studentId             String
  student               Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentAnswer         String?
  isCorrect             Boolean
  attemptNumber         Int      @default(1)
  hintsUsed             Int      @default(0)
  timeSpentSeconds      Int
  errorAnalysis         Json?    // step, errorType, kpId
  createdAt             DateTime @default(now())

  @@index([studentId, createdAt])
  @@index([assessmentAttemptId, questionId])
  @@map("question_attempts")
}

// ============================================
// Models - Wrong Question System
// ============================================

model WrongQuestion {
  id              String   @id @default(cuid())
  studentId       String
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  questionId      String
  question        Question @relation(fields: [questionId], references: [id], onDelete: Cascade)
  errorCount      Int      @default(1)
  firstErrorAt    DateTime @default(now())
  lastErrorAt     DateTime @default(now())
  reviewStatus    WrongQuestionReviewStatus @default(NEW)
  reviewCount     Int      @default(0)
  nextReviewAt    DateTime?
  errorPatterns   Json?    // 歷次錯誤類型統計

  @@unique([studentId, questionId])
  @@index([studentId, reviewStatus, nextReviewAt])
  @@map("wrong_questions")
}

// ============================================
// Models - Mastery
// ============================================

model StudentKnowledgePoint {
  studentId         String
  student           Student @relation(fields: [studentId], references: [id], onDelete: Cascade)
  knowledgePointId  String
  knowledgePoint    KnowledgePoint @relation(fields: [knowledgePointId], references: [id], onDelete: Cascade)
  masteryScore      Float  @default(0) // 0-100
  confidence        Float  @default(0) // 0-1
  attemptCount      Int    @default(0)
  correctCount      Int    @default(0)
  lastAttemptAt     DateTime?
  updatedAt         DateTime @updatedAt

  @@id([studentId, knowledgePointId])
  @@index([studentId, masteryScore])
  @@map("student_knowledge_points")
}

// ============================================
// Models - Learning Progress
// ============================================

model LearningProgress {
  id              String   @id @default(cuid())
  studentId       String
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  levelId         String
  level           Level    @relation(fields: [levelId], references: [id], onDelete: Cascade)
  status          LevelStatus @default(LOCKED)
  videoProgress   Float    @default(0) // 0-1
  cardsCompleted  Json?    // [cardIds]
  startedAt       DateTime?
  completedAt     DateTime?
  testAttempts    Int      @default(0)

  @@unique([studentId, levelId])
  @@index([studentId, status])
  @@map("learning_progress")
}

// ============================================
// Models - AI Conversation & Memory
// ============================================

model Conversation {
  id              String   @id @default(cuid())
  studentId       String
  student         Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  title           String?
  status          ConversationStatus @default(ACTIVE)
  contextSnapshot Json?    // Mastery/Profile/History snapshot
  createdAt       DateTime @default(now())
  updatedAt       DateTime @updatedAt

  messages        Message[]

  @@index([studentId, updatedAt])
  @@map("conversations")
}

model Message {
  id              String   @id @default(cuid())
  conversationId  String
  conversation    Conversation @relation(fields: [conversationId], references: [id], onDelete: Cascade)
  role            MessageRole
  content         String   // Markdown + LaTeX
  metadata        Json?    // tokens, model, latency, citations, toolCalls
  createdAt       DateTime @default(now())

  @@index([conversationId, createdAt])
  @@map("messages")
}

// ============================================
// Models - Student Learning Profile (Assessment Result)
// ============================================

model StudentLearningProfile {
  studentId           String   @id
  student             Student  @relation(fields: [studentId], references: [id], onDelete: Cascade)
  gradeLevel          Int
  unitMastery         Json     // unitId -> {mastery, status}
  knowledgePointMastery Json   // kpId -> {mastery, confidence}
  errorPatterns       Json     // errorType -> count
  weakAreas           Json     // [{unitId, kpIds, reason}]
  strongAreas         Json     // [{unitId, kpIds}]
  assessedAt          DateTime @default(now())
  updatedAt           DateTime @updatedAt

  @@map("student_learning_profiles")
}

// ============================================
// Models - RAG Knowledge Base (Independent)
// ============================================

model Document {
  id          String   @id @default(cuid())
  title       String
  source      DocumentSource
  gradeLevel  Int      // 7-12
  subject     DocumentSubject
  unitCode    String?  // 對應 Unit.code
  metadata    Json?    // author, version, page, videoTimestamp
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  chunks      DocumentChunk[]

  @@index([gradeLevel, subject])
  @@index([unitCode])
  @@map("documents")
}

model DocumentChunk {
  id          String   @id @default(cuid())
  documentId  String
  document    Document @relation(fields: [documentId], references: [id], onDelete: Cascade)
  chunkIndex  Int
  content     String   // 純文字/Markdown
  embedding   Unsupported("vector") // pgvector: vector(1024) or vector(1536)
  metadata    Json?    // headingLevel, kpIds, formulas, imageDescriptions
  createdAt   DateTime @default(now())

  @@index([documentId, chunkIndex])
  // 向量索引需手動建立: CREATE INDEX ON document_chunks USING hnsw (embedding vector_cosine_ops)
  @@map("document_chunks")
}
```

---

## Migration 指令

```bash
# 初始遷移
npx prisma migrate dev --name init_schema

# 後續變更
npx prisma migrate dev --name "add_mastery_confidence"
npx prisma migrate dev --name "add_video_metadata"
npx prisma migrate dev --name "add_rag_documents"

# 生產部署
npx prisma migrate deploy

# 重置開發資料庫
npx prisma migrate reset
```

---

## 向量索引建立 (手動執行)

```sql
-- 啟用 pgvector 擴充
CREATE EXTENSION IF NOT EXISTS vector;

-- 建立 HNSW 索引 (適合高召回率)
CREATE INDEX idx_document_chunk_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 或 IVFFlat 索引 (適合大資料量、可接受較低召回率)
-- CREATE INDEX idx_document_chunk_embedding_ivfflat
-- ON document_chunks
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);
```

---

## 型別對應表

| Prisma Type | PostgreSQL Type | 用途 |
|-------------|-----------------|------|
| String | TEXT / VARCHAR | 一般文字 |
| Int | INTEGER | 整數 |
| Float | DOUBLE PRECISION | 浮點數 |
| Boolean | BOOLEAN | 布林值 |
| DateTime | TIMESTAMPTZ | 時間戳 |
| Json | JSONB | 結構化資料 |
| Unsupported("vector") | VECTOR(dim) | pgvector 向量 |
| Enum | TEXT (CHECK) | 列舉值 |

---

## 種子資料腳本結構

```typescript
// prisma/seed.ts
async function main() {
  // 1. Knowledge Points (數學知識點體系)
  await seedKnowledgePoints()
  
  // 2. Courses (國中/高中數學)
  await seedCourses()
  
  // 3. Units & Levels (課綱結構)
  await seedUnitsAndLevels()
  
  // 4. Questions (題庫匯入)
  await seedQuestions()
  
  // 5. Assessments (測驗設定)
  await seedAssessments()
}
```

---

## 相關文檔

- [[08_Database/Database Architecture|資料庫架構總覽]]
- [[08_Database/ER Diagram|ER Diagram]]
- [[08_Database/Data Flow|資料流向圖]]
- [[08_Database/System Flowchart|系統流程圖]]
- [[13_Decisions/Decision Log|核心決策]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始 Schema 定義 | 系統架構師 |
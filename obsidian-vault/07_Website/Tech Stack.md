# 技術棧決策

> [!IMPORTANT]
> **狀態**：PROPOSED - 初步方向，未完全鎖定
> **最後更新**：2026-09-10
> **原則**：現代化、類型安全、開發體驗佳、生態成熟、可擴展

---

## 全端框架

| 層級 | 選型 | 版本 | 理由 |
|------|------|------|------|
| **Frontend + Backend** | **Next.js (App Router)** | 14+ | React 生態、SSR/SSG/ISR、Server Actions、Middleware、邊緣運行時 |
| **語言** | **TypeScript** | 5+ | 嚴格型別、IDE 支援、重構安全 |
| **樣式** | **Tailwind CSS** | 3.4+ | Utility-first、設計系統友善、體積小、暗色模式內建 |
| **UI 元件庫** | **shadcn/ui + Radix UI** | 最新 | 無樣式、可客製化、無障礙、TypeScript 原生 |
| **狀態管理** | **TanStack Query (React Query)** | 5+ | 伺服器狀態管理、快取、重試、樂觀更新 |
| **表單** | **React Hook Form + Zod** | 最新 | 效能好、驗證整合、型別安全 |
| **動畫** | **Framer Motion** | 11+ | 宣告式、佈局動畫、手勢支援 |

---

## 後端與資料庫

| 組件 | 選型 | 版本 | 理由 |
|------|------|------|------|
| **資料庫** | **PostgreSQL** | 16+ | 成熟穩定、JSONB、pgvector、擴充豐富 |
| **ORM** | **Prisma** | 5.10+ | 類型安全、遷移管理、關聯查詢優化、DX 佳 |
| **連線池** | **PgBouncer** | - | 連線複用、Serverless 友善 |
| **快取** | **Redis (Upstash/Valkey)** | 7+ | Session、Rate Limit、暫存、佇列 |
| **檔案儲存** | **Cloudflare R2 / AWS S3** | - | S3 相容、成本低、CDN 整合 |
| **影片串流** | **Mux / Cloudflare Stream** | - | 自適應串流、DRM、分析、Webhook |

---

## 認證與授權

| 功能 | 選型 | 理由 |
|------|------|------|
| **認證框架** | **NextAuth.js (Auth.js) v5** | Next.js 整合度最高、多 Provider、Edge 相容 |
| **OAuth Provider** | **Google** | 學生普及率高、無密碼管理、安全性好 |
| **Session 策略** | **JWT (HttpOnly Cookie)** | 無狀態、安全、跨域支援 |
| **權限模型** | **Role-based (Student/Admin)** | Phase 1 簡單、預留 RBAC 擴充 |

---

## AI 整合架構

```
┌─────────────────────────────────────────────────────────────┐
│                    Next.js Application                       │
├─────────────────────────────────────────────────────────────┤
│  AI Service Interface (Provider Pattern)                    │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐            │
│  │ OpenAI      │ │ Anthropic   │ │ Local Model │            │
│  │ Provider    │ │ Provider    │ │ Provider    │            │
│  │ (GPT-4o)    │ │ (Claude)    │ │ (vLLM/TGI)  │            │
│  └─────────────┘ └─────────────┘ └─────────────┘            │
├─────────────────────────────────────────────────────────────┤
│  Context Builder → Prompt Template → Teaching Engine        │
├─────────────────────────────────────────────────────────────┤
│  RAG Pipeline (Retrieval + Rerank)                          │
└─────────────────────────────────────────────────────────────┘
```

### AI Provider 介面設計
```typescript
// lib/ai/providers/base.ts
interface AIProvider {
  readonly name: string;
  readonly model: string;
  readonly maxTokens: number;
  readonly supportsStreaming: boolean;
  readonly supportsFunctions: boolean;
  
  chatCompletion(request: ChatRequest): Promise<ChatResponse>;
  streamChatCompletion(request: ChatRequest): AsyncIterable<ChatChunk>;
  countTokens(messages: Message[]): number;
}

// 實作: OpenAIProvider, AnthropicProvider, LocalVLLMProvider, MockProvider
```

---

## 開發與部署工具鏈

| 類別 | 工具 | 用途 |
|------|------|------|
| **套件管理** | **pnpm** | 快速、磁碟效率、Monorepo 支援 |
| **程式碼品質** | **ESLint + Prettier + TypeScript Strict** | 統一風格、捕捉錯誤 |
| **Git Hooks** | **Husky + lint-staged** | 提交前自動檢查 |
| **測試** | **Vitest + React Testing Library + Playwright** | 單元/整合/E2E 全覆蓋 |
| **Storybook** | **Storybook 8** | 元件開發、視覺回歸 (Chromatic) |
| **CI/CD** | **GitHub Actions** | Lint → TypeCheck → Test → Build → Deploy Preview |
| **部署平台** | **Vercel** | Next.js 原生支援、Edge Functions、Preview Deployments |
| **監控** | **Sentry + Vercel Analytics + 自建 Grafana** | 錯誤追蹤、效能、業務指標 |
| **日誌** | **Pino + Loki/Grafana** | 結構化日誌、查詢分析 |
| **密鑰管理** | **1Password CLI / Infisical / Vercel Env** | 開發/生產環境變數隔離 |

---

## 專案目錄結構

```
ai-education-platform/
├── .github/
│   └── workflows/           # CI/CD
├── .husky/                  # Git hooks
├── public/                  # 靜態資源
├── src/
│   ├── app/                 # Next.js App Router
│   │   ├── (auth)/          # 認證相關頁面群組
│   │   ├── (dashboard)/     # 學生儀表板群組
│   │   ├── api/             # API Routes / Server Actions
│   │   ├── globals.css      # 全域樣式 + Tailwind
│   │   ├── layout.tsx       # 根佈局
│   │   └── page.tsx         # 首頁
│   ├── components/
│   │   ├── ui/              # 基礎 UI 元件
│   │   ├── forms/           # 表單元件
│   │   ├── learning/        # 學習地圖/Level/卡片
│   │   ├── ai/              # AI 聊天元件
│   │   └── charts/          # 圖表/視覺化
│   ├── lib/
│   │   ├── auth/            # NextAuth 設定
│   │   ├── db/              # Prisma Client
│   │   ├── ai/              # AI Service Interface
│   │   ├── rag/             # RAG Pipeline
│   │   ├── utils/           # 通用工具函數
│   │   └── validations/     # Zod Schemas
│   ├── hooks/               # Custom React Hooks
│   ├── types/               # 共用 TypeScript 類型
│   ├── constants/           # 常數/設定
│   └── styles/              # 額外樣式
├── prisma/
│   ├── schema.prisma        # 資料庫 Schema
│   └── migrations/          # 遷移檔
├── scripts/                 # 管理腳本 (種子資料、遷移、匯入)
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── .env.example
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── tailwind.config.ts
├── next.config.mjs
└── README.md
```

---

## 環境變數規範

```bash
# .env.example

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NEXT_PUBLIC_APP_NAME="AI 教育平台"

# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/ai_edu?schema=public"
DIRECT_URL="postgresql://user:pass@localhost:5432/ai_edu?schema=public"  # Prisma Migrate 用

# Auth (NextAuth.js)
AUTH_SECRET="generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
AUTH_TRUST_HOST="true"

# Redis (Upstash)
REDIS_URL="rediss://default:token@region.upstash.io:6379"
REDIS_TOKEN="your-token"

# AI Providers
OPENAI_API_KEY="sk-..."
ANTHROPIC_API_KEY="sk-ant-..."
# Local Model (Phase 9+)
VLLM_BASE_URL="http://localhost:8000/v1"
VLLM_API_KEY="local-key"

# RAG
EMBEDDING_MODEL="BAAI/bge-m3"
EMBEDDING_DIM=1024
RERANKER_MODEL="BAAI/bge-reranker-v2-m3"

# File Storage (R2)
R2_ACCOUNT_ID="..."
R2_ACCESS_KEY_ID="..."
R2_SECRET_ACCESS_KEY="..."
R2_BUCKET_NAME="ai-edu-assets"
R2_PUBLIC_URL="https://pub-xxx.r2.dev"

# Video (Mux)
MUX_TOKEN_ID="..."
MUX_TOKEN_SECRET="..."
MUX_WEBHOOK_SECRET="..."

# Monitoring
SENTRY_DSN="https://xxx@sentry.io/xxx"
NEXT_PUBLIC_VERCEL_ANALYTICS_ID="xxx"

# Feature Flags
NEXT_PUBLIC_ENABLE_AI_CHAT="true"
NEXT_PUBLIC_ENABLE_RAG="false"
NEXT_PUBLIC_ENABLE_LOCAL_MODEL="false"
```

---

## 效能預算

| 指標 | 目標 | 測量工具 |
|------|------|----------|
| **FCP** (First Contentful Paint) | < 1.5s | Lighthouse / Vercel Analytics |
| **LCP** (Largest Contentful Paint) | < 2.5s | 同上 |
| **TTI** (Time to Interactive) | < 3.5s | 同上 |
| **CLS** (Cumulative Layout Shift) | < 0.1 | 同上 |
| **TB** (Total Blocking Time) | < 200ms | 同上 |
| **API 回應 P95** | < 500ms | Sentry / 自建監控 |
| **AI 回應首字延遲** | < 2s | AI Service Metrics |
| **Bundle Size (gzipped)** | < 150KB (初始) | webpack-bundle-analyzer |

---

## 相關文檔

- [[07_Website/Architecture Overview|系統架構總覽]]
- [[08_Database/Database Architecture|資料庫架構]]
- [[04_AI/AI Model Strategy|AI 模型策略]]
- [[05_RAG/RAG Architecture|RAG 架構]]
- [[12_Development/Roadmap|開發路線圖 Phase 1]]
- [[13_Decisions/TBD|待決定技術項目]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始技術棧定義 | 系統架構師 |
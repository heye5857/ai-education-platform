# AI Education Platform

> 以 AI 為核心的個人化數學教學平台 | B2C 模式 | 第一階段專注數學

## 🎯 專案概覽

| 項目 | 內容 |
|------|------|
| **產品定位** | AI 個人化數學教學平台（非單純解題工具） |
| **目標用戶** | 國中/高中學生 (B2C) |
| **核心科目** | 數學 (第一階段) |
| **技術棧** | Next.js 14 + React 18 + TypeScript + Tailwind CSS + PostgreSQL + Prisma |
| **AI 架構** | Provider Pattern (OpenAI/Anthropic/Local) + RAG + 自訓練模型規劃 |
| **認證** | Google OAuth 2.0 (NextAuth.js v5) |

## 📁 專案結構

```
ai-education-platform/
├── apps/                    # 應用程式
│   ├── web/                 # Next.js 前端 + API (主要應用)
│   └── ai-service/          # AI 推理服務 (Phase 9+)
├── packages/                # 共用套件
│   ├── db/                  # Prisma Client + Schema
│   ├── ui/                  # 共用 UI 元件
│   ├── ai/                  # AI Provider Interface
│   ├── rag/                 # RAG Pipeline
│   └── config/              # 共用設定
├── docs/                    # 專案文檔
├── obsidian-vault/          # Obsidian 知識庫 (57 檔案)
│   ├── 00_Home/             # 專案儀表板
│   ├── 01_Product/          # 產品策略
│   ├── 02_Features/         # 功能規格 (10 檔)
│   ├── 03_Math_Teaching/    # 數學教學核心 (4 檔)
│   ├── 04_AI/               # AI 核心 (3 檔)
│   ├── 05_RAG/              # RAG 架構 (2 檔)
│   ├── 06_Data/             # 資料管線 (4 檔)
│   ├── 07_Website/          # 網站架構 (2 檔)
│   ├── 08_Database/         # 資料庫設計 (5 檔)
│   ├── 09_UI_UX/            # UI/UX
│   ├── 10_Business_Model/   # 商業模式 (3 檔)
│   ├── 11_Security/         # 安全研究 (4 檔)
│   ├── 12_Development/      # 開發路線圖
│   ├── 13_Decisions/        # 決策日誌/TBD/已取消決策
│   ├── 14_Research/         # 技術研究 (10 檔)
│   └── 99_Raw_Data/         # 原始資料索引
├── turbo.json               # Turborepo 設定
├── package.json
├── pnpm-workspace.yaml
└── README.md
```

## 🚀 快速開始

### 前置需求
- Node.js 20+
- pnpm 9+
- PostgreSQL 16+ (建議使用 [Neon](https://neon.tech) 或本地 Docker)
- Redis (建議 [Upstash](https://upstash.com) 或本地 Docker)

### 安裝與設定

```bash
# 1. 克隆專案
git clone https://github.com/heye5857>/ai-education-platform.git
cd ai-education-platform

# 2. 安裝依賴
pnpm install

# 3. 設定環境變數
cp apps/web/.env.example apps/web/.env.local
# 編輯 .env.local 填入必要設定

# 4. 設定資料庫
pnpm --filter=@ai-edu/db db:generate
pnpm --filter=@ai-edu/db db:push

# 5. 啟動開發伺服器
pnpm dev
```

### 環境變數必要項目

```env
# apps/web/.env.local
DATABASE_URL="postgresql://user:pass@localhost:5432/ai_edu?schema=public"
AUTH_SECRET="your-auth-secret-generate-with-openssl-rand-base64-32"
AUTH_GOOGLE_ID="your-google-client-id"
AUTH_GOOGLE_SECRET="your-google-client-secret"
REDIS_URL="rediss://default:token@region.upstash.io:6379"
```

## 📚 文檔導覽

### 核心決策與規劃
- [專案儀表板](obsidian-vault/00_Home/Project%20Dashboard.md) - 總覽與快速連結
- [決策日誌](obsidian-vault/13_Decisions/Decision%20Log.md) - 22 項確認決策
- [待決定事項](obsidian-vault/13_Decisions/TBD.md) - 24 項 TBD (含 P0 優先級)
- [開發路線圖](obsidian-vault/12_Development/Roadmap.md) - 11 階段 / 43 週

### 架構設計
- [系統架構](obsidian-vault/07_Website/Architecture%20Overview.md)
- [技術棧](obsidian-vault/07_Website/Tech%20Stack.md)
- [資料庫架構](obsidian-vault/08_Database/Database%20Architecture.md)
- [ER Diagram](obsidian-vault/08_Database/ER%20Diagram.md)
- [系統流程圖](obsidian-vault/08_Database/System%20Flowchart.md)

### 核心功能規格
- [學生註冊流程](obsidian-vault/02_Features/Student%20Registration%20Flow.md)
- [初始能力測驗](obsidian-vault/02_Features/Initial%20Assessment.md)
- [學習地圖](obsidian-vault/02_Features/Learning%20Map.md)
- [Level 系統](obsidian-vault/02_Features/Level%20System.md)
- [錯題系統](obsidian-vault/02_Features/Wrong%20Question%20System.md)
- [Mastery 系統](obsidian-vault/02_Features/Mastery%20System.md)
- [AI 問答](obsidian-vault/02_Features/AI%20Chat.md)
- [學生記憶](obsidian-vault/02_Features/Student%20Memory.md)

### 數學教學核心
- [課綱架構](obsidian-vault/03_Math_Teaching/Math%20Curriculum.md)
- [數學推理](obsidian-vault/03_Math_Teaching/Math%20Reasoning.md)
- [運算拆解](obsidian-vault/03_Math_Teaching/Operation%20Decomposition.md)
- [錯誤類型](obsidian-vault/03_Math_Teaching/Error%20Pattern.md)

### AI 與 RAG
- [AI 模型策略](obsidian-vault/04_AI/AI%20Model%20Strategy.md)
- [AI 教學原則](obsidian-vault/04_AI/AI%20Teaching%20Principles.md)
- [RAG 架構](obsidian-vault/05_RAG/RAG%20Architecture.md)

## 🗺️ 開發路線圖概覽

| 階段 | 名稱 | 週數 | 關鍵交付 |
|------|------|------|----------|
| Phase 0 | 專案規劃 | 1 | 文檔完成 ✅ |
| Phase 1 | 網站骨架 | 3 | Next.js + UI + CI/CD |
| Phase 2 | 認證系統 | 2 | Google OAuth + Session |
| Phase 3 | 學生系統 | 2 | 個人資料 + 首頁 |
| Phase 4 | 學習地圖 | 6 | Course/Unit/Level + 影片 + 卡片 |
| Phase 5 | 題庫與測驗 | 4 | 題庫匯入 + Level 測驗 + 能力測驗 |
| Phase 6 | 錯題與 Mastery | 4 | 雙層錯題 + Mastery + 學習分析 |
| Phase 7 | AI 聊天 | 5 | 引導式教學 + 個人化 + 記憶 |
| Phase 8 | RAG 系統 | 4 | 文檔管線 + 檢索增強 |
| Phase 9 | 自有模型 | 8 | 模型評測 + Fine-tuning + 部署 |
| Phase 10 | 生產上線 | 4 | 效能調優 + 安全審計 + 上線 |

## 🔧 開發指令

```bash
# 開發
pnpm dev                    # 啟動所有開發伺服器
pnpm dev --filter=web       # 僅啟動 web

# 資料庫
pnpm db:generate            # 產生 Prisma Client
pnpm db:push                # 推送 Schema 到資料庫
pnpm db:migrate             # 執行遷移
pnpm db:studio              # 開啟 Prisma Studio
pnpm db:seed                # 填入種子資料

# 程式碼品質
pnpm lint                   # ESLint
pnpm typecheck              # TypeScript 型別檢查
pnpm test                   # 單元測試
pnpm test:e2e               # E2E 測試

# 建構
pnpm build                  # 建構所有套件
pnpm build --filter=web     # 僅建構 web
```

## 📦 套件管理

此專案使用 **pnpm workspaces** + **Turborepo** 管理 monorepo：

```yaml
# pnpm-workspace.yaml
packages:
  - apps/*
  - packages/*
```

## 🔐 安全與合規

- [認證安全](obsidian-vault/11_Security/Authentication%20Security.md)
- [學生資料安全](obsidian-vault/11_Security/Student%20Data%20Security.md)
- [AI 資料隱私](obsidian-vault/11_Security/AI%20Data%20Privacy.md)
- [安全研究索引](obsidian-vault/11_Security/Security%20Research%20Index.md) - OWASP Top 10 對應

## 🤝 貢獻指南

1. Fork 專案
2. 建立功能分支 (`git checkout -b feature/amazing-feature`)
3. 提交變更 (`git commit -m 'Add amazing feature'`)
4. 推送分支 (`git push origin feature/amazing-feature`)
4. 開啟 Pull Request

### Commit Message 規範
遵循 [Conventional Commits](https://www.conventionalcommits.org/)：
```
feat: 新增學習地圖 Level 解鎖邏輯
fix: 修正 AI 串流回應中斷問題
docs: 更新 API 文檔
refactor: 重構 AI Context Builder
test: 增加 Mastery 計算單元測試
```

## 📄 授權條款

本專案採用 MIT License - 詳見 [LICENSE](LICENSE) 檔案

## 📞 聯絡資訊

- 專案負責人：[Your Name]
- Email：[your.email@example.com]
- 專案連結：https://github.com/<your-username>/ai-education-platform

---

> **注意**：此專案包含完整的 Obsidian 知識庫 (`obsidian-vault/`)，建議使用 [Obsidian](https://obsidian.md/) 開啟以獲得最佳瀏覽體驗（支援 Wiki Links、Mermaid 圖表渲染、Graph View 等）。
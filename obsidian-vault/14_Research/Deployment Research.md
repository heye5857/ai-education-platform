# 部署研究

> [!IMPORTANT]
> **狀態**：RESEARCH - Phase 1-10 部署策略支撐
> **最後更新**：2026-09-10

---

## 研究目標

建立從開發到生產的完整部署管線，支援：
- 快速迭代 (開發/預覽/生產環境隔離)
- 高可用、自動擴縮、零停機部署
- 成本最佳化、觀測性、安全合規
- AI 模型服務部署 (Phase 9+)

---

## 部署架構演進路線

```mermaid
flowchart LR
    subgraph PHASE1[Phase 1-3: MVP 開發期]
        DEV1[開發環境\nVercel Preview Deployments]
        DEV2[本地開發\nDocker Compose / Next.js Dev]
        CI1[CI Pipeline\nLint/TypeCheck/Test/Build]
    end
    
    subgraph PHASE2[Phase 4-6: 核心功能期]
        STG[Staging 環境\nVercel Production Preview]
        PROD1[生產環境\nVercel Production]
        DB1[PostgreSQL\nManaged Service (Neon/Supabase/AWS RDS)]
        REDIS1[Redis\nUpstash/Valkey]
        MON1[監控\nVercel Analytics + Sentry]
    end
    
    subgraph PHASE3[Phase 7-8: AI 整合期]
        AI1[AI API Gateway\nVercel Edge Functions]
        RAG1[RAG Pipeline\nBackground Workers (Vercel Cron/Queue)]
        VECTOR1[pgvector\nPostgreSQL Extension]
        MON2[AI 監控\nLatency/Token/Cost/Quality]
    end
    
    subgraph PHASE4[Phase 9+: 自有模型期]
        K8S[Kubernetes 叢集\nEKS/GKE/AKS 或自建]
        VLLM[vLLM / TGI 推理服務]
        TRAIN[訓練叢集\nDeepSpeed/FSDP + MLflow]
        GPU[GPU 節點池\nH100/A100 + 自動擴縮]
        MODEL_REG[Model Registry\nMLflow / HF Hub / S3]
    end
    
    DEV1 --> CI1 --> STG --> PROD1
    STG --> DB1
    PROD1 --> DB1
    PROD1 --> REDIS1
    PROD1 --> AI1
    AI1 --> RAG1
    RAG1 --> VECTOR1
    PROD1 --> MON1
    PROD1 --> MON2
    PROD1 --> K8S
    K8S --> VLLM
    K8S --> TRAIN
    K8S --> GPU
    TRAIN --> MODEL_REG
    VLLM --> MODEL_REG
```

---

## 環境策略

| 環境 | 用途 | 部署觸發 | 資料 | 存取控制 |
|------|------|----------|------|----------|
| **Local** | 開發除錯 | 手動 `pnpm dev` | 本地 SQLite / Mock | 開發者完全控制 |
| **Preview (Vercel)** | PR 驗證、設計審查 | GitHub PR 建立/更新 | 共享 Staging DB (只讀/種子資料) | 團隊成員、自動過期 7 天 |
| **Staging** | 整合測試、UAT、效能基準 | `main` 分支合併 | 獨立 Staging DB (完整種子) | 團隊 + QA、受保護 |
| **Production** | 正式服務 | Git Tag / 手動觸發 | 正式 DB (備份/備援) | 僅 Release Manager、審計日誌 |

---

## CI/CD 管線設計

### GitHub Actions 工作流
```yaml
# .github/workflows/ci.yml
name: CI Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  lint-and-typecheck:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm lint
      - run: pnpm typecheck

  test:
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env: {POSTGRES_PASSWORD: test}
        ports: [5432:5432]
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm db:migrate:test
      - run: pnpm test --coverage
      - run: pnpm test:e2e

  build:
    needs: [lint-and-typecheck, test]
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v2
      - run: pnpm install --frozen-lockfile
      - run: pnpm build
      - uses: actions/upload-artifact@v4
        with: {name: nextjs-build, path: .next}

  deploy-preview:
    needs: build
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/download-artifact@v4
        with: {name: nextjs-build}
      - uses: amondnet/vercel-action@v25
        with: vercel-token: ${{secrets.VERCEL_TOKEN}}
        env: {VERCEL_ORG_ID: ${{secrets.VERCEL_ORG_ID}}, VERCEL_PROJECT_ID: ${{secrets.VERCEL_PROJECT_ID}}}

  deploy-staging:
    needs: build
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    environment: staging
    steps:
      - uses: actions/download-artifact@v4
      - run: pnpm db:migrate:staging
      - uses: amondnet/vercel-action@v25
        with: vercel-token: ${{secrets.VERCEL_TOKEN}}
        env: {VERCEL_ORG_ID: ${{secrets.VERCEL_ORG_ID}}, VERCEL_PROJECT_ID: ${{secrets.VERCEL_PROJECT_ID}}, VERCEL_SCOPE: staging}

  deploy-production:
    needs: build
    if: startsWith(github.ref, 'refs/tags/v')
    runs-on: ubuntu-latest
    environment: production
    steps:
      - uses: actions/download-artifact@v4
      - run: pnpm db:migrate:production
      - uses: amondnet/vercel-action@v25
        with: vercel-token: ${{secrets.VERCEL_TOKEN}}
        env: {VERCEL_ORG_ID: ${{secrets.VERCEL_ORG_ID}}, VERCEL_PROJECT_ID: ${{secrets.VERCEL_PROJECT_ID}}, VERCEL_SCOPE: production}
```

### 資料庫遷移策略
```bash
# 開發環境
pnpm db:migrate:dev --name "add_mastery_fields"

# Staging/Production (CI/CD 中執行)
pnpm db:migrate:deploy

# 回滾 (緊急)
pnpm db:migrate:resolve --rolled-back "migration_name"
```

---

## 基礎設施即代碼

### Vercel 配置
```json
// vercel.json
{
  "buildCommand": "pnpm build",
  "devCommand": "pnpm dev",
  "installCommand": "pnpm install",
  "framework": "nextjs",
  "regions": ["hkg1"],  // 香港節點 (近台灣)
  "functions": {
    "src/app/api/**/*.ts": {
      "maxDuration": 60,
      "memory": 1024
    },
    "src/app/api/ai/**/*.ts": {
      "maxDuration": 120,
      "memory": 2048
    }
  },
  "headers": [
    {
      "source": "/(.*)",
      "headers": [
        {"key": "X-Content-Type-Options", "value": "nosniff"},
        {"key": "X-Frame-Options", "value": "DENY"},
        {"key": "X-XSS-Protection", "value": "1; mode=block"},
        {"key": "Referrer-Policy", "value": "strict-origin-when-cross-origin"},
        {"key": "Permissions-Policy", "value": "camera=(), microphone=(), geolocation=()"}
      ]
    },
    "rewrites": [
      {"source": "/api/ai/:path*", "destination": "/api/ai/:path*"}
    ]
  ],
  "crons": [
    {"path": "/api/cron/daily-mastery", "schedule": "0 3 * * *"},
    {"path": "/api/cron/weekly-report", "schedule": "0 9 * * 1"}
  ]
}
```

### 資料庫 (PostgreSQL) 基礎設施
```yaml
# 選項 1: Neon (Serverless PostgreSQL) - 推薦起步
# 選項 2: Supabase (PostgreSQL + Auth + Realtime)
# 選項 3: AWS RDS / Aurora PostgreSQL (企業級)

infrastructure:
  primary:
    instance: "db.r6g.xlarge"  # 4 vCPU, 32GB RAM
    engine: "PostgreSQL 16"
    storage: "500GB GP3 (自動擴展)"
    multi_az: true
    backup_retention: 30天
    deletion_protection: true
  
  read_replica:
    count: 1-2
    instance: "db.r6g.large"
  
  connection_pooler:
    type: "PgBouncer (transaction mode)"
    max_connections: 100
    pool_mode: "transaction"
  
  extensions:
    - "vector" (pgvector)
    - "pg_trgm" (全文檢索優化)
    - "btree_gin" (複合索引)
    - "uuid-ossp"
    - "pg_stat_statements"
  
  monitoring:
    enhanced_monitoring: 60秒
    performance_insights: true
    log_exports: ["postgresql", "audit"]
```

### Redis (Upstash/Valkey)
```yaml
redis:
  provider: "Upstash (Serverless) / Valkey (自建)"
  plan: "Pro / Enterprise"
  region: "ap-northeast-1 (東京) / ap-east-1 (香港)"
  tls: true
  max_connections: 10000
  eviction_policy: "allkeys-lru"
  backup: "每日 RDB 快照"
  use_cases:
    - "Session Store (TTL 30天)"
    - "Rate Limiting (滑動窗口)"
    - "Cache (查詢結果、RAG 結果)"
    - "Queue (BullMQ / Vercel Queue)"
    - "Rate Limit Counters"
```

---

## 觀測性架構

### 三大支柱

| 支柱 | 工具 | 關鍵指標 |
|------|------|----------|
| **Metrics** | Prometheus + Grafana / Vercel Analytics | HTTP 延遲、錯誤率、吞吐、業務指標 (DAU、完成率、AI 滿意度) |
| **Logs** | Pino + Loki / Vercel Logs / Sentry | 結構化 JSON、請求追蹤、錯誤堆疊、審計日誌 |
| **Traces** | OpenTelemetry + Tempo / Vercel Edge Observatory | 請求鏈路、AI 推理延遲、DB 查詢耗時 |

### 關鍵儀表板
| 儀表板 | 關鍵指標 | 告警閾值 |
|--------|----------|----------|
| **系統健康** | CPU/記憶體/磁碟/網路、P95 延遲、錯誤率、吞吐量 | P95 > 2s、錯誤率 > 1% |
| **業務指標** | DAU/MAU、註冊轉換、Level 完成率、AI 對話量、付費轉換 | DAU 下降 > 20% |
| **AI 服務** | 首字延遲 (TTFT)、單字延遲 (TPOT)、Token 成本、滿意度、安全事件 | TTFT > 3s、安全事件 > 0 |
| **資料庫** | 連線數、查詢延遲、慢查詢、複寫延遲、磁碟使用 | 連線 > 80%、P95 > 500ms |
| **AI 模型 (Phase 9+)** | GPU 利用率、佇列長度、推理延遲、吞吐、錯誤率 | GPU > 90%、佇列 > 50 |

### 告警路由
```yaml
alerts:
  critical:
    channels: ["PagerDuty", "Slack #alerts-critical", "Phone Call"]
    examples: ["DB down", "AI service unavailable", "Security breach", "Data loss"]
  warning:
    channels: ["Slack #alerts-warning", "Email"]
    examples: ["High latency", "High error rate", "Disk > 80%", "Replication lag"]
  info:
    channels: ["Slack #alerts-info"]
    examples: ["New deployment", "Schema migration", "Certificate expiring"]
```

---

## AI 模型部署 (Phase 9+)

### 推理服務架構
```yaml
# vLLM + KServe / Triton on Kubernetes
inference:
  serving_engine: "vLLM"  # Continuous Batching, Prefix Caching, PagedAttention
  deployment: "KServe (Kubernetes 原生) / Triton Inference Server"
  autoscaling:
    metric: "queue_length / concurrent_requests"
    min_replicas: 2
    max_replicas: 20
    scale_up_stabilization: 60s
    scale_down_stabilization: 300s
  resources_per_replica:
    gpu: "1x H100 80GB / A100 80GB"
    cpu: "8 cores"
    memory: "64GB"
    ephemeral_storage: "100GB (模型快取)"
  model_loading:
    source: "S3 / Model Registry"
    format: "safetensors / GGUF / AWQ"
    tensor_parallel: 1-8 (依模型大小)
  optimization:
    quantization: "AWQ 4-bit / GPTQ 4-bit / FP8"
    prefix_caching: true
    chunked_prefill: true
    max_batch_size: 256
    max_num_seqs: 128
```

### 部署管線
```yaml
# .github/workflows/model-deploy.yml
model_deploy:
  trigger: "Model Registry 新版本標記 production-ready"
  steps:
    - 拉取模型權重 (S3/Registry)
    - 執行離線評測 (GSM8K + 教學基準 + 安全)
    - 量化 (AWQ/GPTQ) + 驗證品質
    - 建立 Docker Image (vLLM + 模型)
    - 推送到 ECR/GHCR
    - Canary 部署 (10% 流量)
    - 自動化驗證 (延遲/品質/安全)
    - 全量釋出 / 自動回滾
```

### 成本優化策略
| 策略 | 省幅 | 實作方式 |
|------|------|----------|
| **量化 (INT4/AWQ)** | 70-80% 記憶體、2-4x 速度 | AutoAWQ / AutoGPTQ + 驗證 |
| **Continuous Batching** | 2-5x 吞吐 | vLLM 內建 |
| **Prefix Caching** | 30-50% 重複計算 | vLLM 內建、系統 Prompt 共享 |
| **投機解碼** | 1.5-2x 速度 | 小模型草稿 + 大模型驗證 |
| **自動擴縮容** | 50% 閒置成本 | KEDA + 佇列長度觸發 |
| **模型蒸餾** | 10x 成本降低 | 72B Teacher → 7B Student |

---

## 災難恢復 (DR)

### RPO/RTO 目標
| 指標 | 目標 | 實作 |
|------|------|------|
| **RPO** (資料遺失容忍) | 1 小時 | WAL-G / pgBackRest 持續備份 |
| **RTO** (恢復時間目標) | 30 分鐘 | 自動化恢復腳本、定期演練 |
| **備份頻率** | 每日全備 + 每小時增量 | 自動化排程 |
| **跨區備份** | ap-northeast-1 → ap-southeast-1 | 跨區 WAL 流式複製 |

### 遷移與升級策略
| 操作 | 策略 | 停機時間 |
|------|------|----------|
| **應用部署** | 蓝綠 / Canary / Rolling | 零停機 |
| **Schema Migration** | 向後相容 + 双寫 + 切換 | 零停機 (需仔細設計) |
| **資料庫大版本升級** | pg_upgrade / 蓝綠 | 分鐘級 (pg_upgrade) / 零停機 (蓝綠) |
| **Redis 升級** | Replica 提升 | 秒級 |
| **AI 模型更新** | Canary + A/B Test | 零停機 |

---

## 成本模型與優化

### 月度成本估算 (Phase 4-6 規模: 10K DAU)

| 項目 | 服務 | 規模 | 月費用 (USD) | 備註 |
|------|------|------|--------------|------|
| **前端/應用** | Vercel Pro | 100K 瀏覽/月 | $20 | 含 Edge Functions |
| **資料庫** | Neon Postgres | 100GB、100K 連線 | $100-200 | 含讀副本 |
| **Redis** | Upstash Pro | 100MB、100K req/日 | $50 | 含快取/佇列 |
| **AI API** | OpenAI/Anthropic | 50K 對話/月 | $500-2000 | 依模型/Token 用量 |
| **檔案儲存** | Cloudflare R2 | 1TB | $15 | 含 CDN |
| **影片串流** | Mux | 1000 小時/月 | $200 | 含轉碼/分析 |
| **監控** | Sentry + Grafana Cloud | 1M 事件/月 | $50 | 含告警 |
| **CI/CD** | GitHub Actions | 2000 分鐘/月 | $0 (免費額度) | 專案內 |
| **總計** | | | **$935-2635** | 視 AI 用量 |

### 成本優化清單
- [ ] Vercel Functions 最大化 ISR/SSG、減少 SSR
- [ ] 資料庫查詢優化、索引、連線池
- [ ] Redis 快取熱點查詢、RAG 結果、Session
- [ ] AI Prompt 壓縮、快取常見回答、批次推理
- [ ] R2 生命週期規則 (舊版本/未存取轉 IA/Glacier)
- [ ] Mux 僅轉碼必要解析度、啟用 CDN 快取
- [ ] 定期審核未使用資源、調整規格

---

## 安全部署檢查清單

### 部署前
- [ ] 依賴掃描 (Snyk/Dependabot/OWASP Dependency Check) 通過
- [ ] SAST (CodeQL/GitHub CodeQL) 通過，無 Critical/High
- [ ] Container 掃描 (Trivy/Grype) 通過
- [ ] 密鑰掃描 (TruffleHog/GitLeaks) 通過
- [ ] 基礎設施掃描 (tfsec/Checkov) 通過
- [ ] 密鑰管理：無硬編碼、全部從 Secret Manager 讀取
- [ ] 最小權限：IAM 角色、K8s RBAC、DB RLS 已配置

### 部署後
- [ ] 冒煙測試 (Smoke Test) 通過
- [ ] 健康檢查端點正常
- [ ] 關鍵業務流程 E2E 測試通過
- [ ] 監控儀表板正常顯示
- [ ] 告警規則生效測試
- [ ] 備份/恢復演練 (季度)

---

## 相關文檔

- [[07_Website/Architecture Overview|系統架構]]
- [[07_Website/Tech Stack|技術棧]]
- [[04_AI/AI Model Strategy|AI 模型策略]]
- [[14_Research/AI Model Research|AI 模型研究]]
- [[14_Research/Fine-tuning Research|Fine-tuning 研究]]
- [[12_Development/Roadmap|開發路線圖]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始部署研究框架 | 系統架構師 |
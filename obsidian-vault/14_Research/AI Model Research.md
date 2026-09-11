# AI 模型研究

> [!IMPORTANT]
> **狀態**：RESEARCH - TBD-06 核心支撐
> **最後更新**：2026-09-10

---

## 研究目標

為 **TBD-06: AI 核心模型選型** 提供決策依據，涵蓋：
1. 基座模型評測與選擇
2. License 合規性分析
3. 部署架構與成本模型
4. Fine-tuning 策略與管線設計

---

## 候選模型追蹤表 (2026 Q3 時点)

| 模型 | 參數量 | 釋出機構 | License | 中文能力 | 數學推理 | 程式碼能力 | Context Length | 量化支援 | 商業化風險 | 狀態 |
|------|--------|----------|---------|----------|----------|------------|----------------|----------|------------|------|
| **Qwen 2.5** | 7B/14B/32B/72B | Alibaba | Apache 2.0 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 128K | GPTQ/AWQ/GGUF | 低 | 🔥 **首選** |
| **Llama 3.1** | 8B/70B/405B | Meta | Llama Community | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 128K | GPTQ/AWQ/GGUF | 中 (條款複雜) | 📋 評估中 |
| **DeepSeek V2.5** | 236B (MoE, 21B active) | DeepSeek | 商業友善 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 128K | GPTQ/AWQ | 低 | 🔥 **強力備選** |
| **Yi 1.5** | 9B/34B | 01.AI | Apache 2.0 | ⭐⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 200K | GPTQ/AWQ/GGUF | 低 | 📋 評估中 |
| **Gemma 2** | 9B/27B | Google | Gemma License | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 8K | GPTQ/AWQ/GGUF | 低 | 📋 觀察中 |
| **Nemotron 3 Ultra** | 53B | NVIDIA | NVIDIA License | ⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐ | 128K | GPTQ/AWQ | 需確認 | 📋 觀察中 |
| **Phi-3.5** | 3.8B/14B | Microsoft | MIT | ⭐⭐⭐ | ⭐⭐⭐ | ⭐⭐⭐ | 128K | GGUF | 低 | 📋 小模型備選 |
| **InternLM 2.5** | 7B/20B | 上海AI實驗室 | Apache 2.0 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 200K | GPTQ/AWQ | 低 | 📋 觀察中 |

---

## 評測基準設計

### 1. 數學推理準確率 (權重 40%)
| 基準 | 題目數 | 難度 | 說明 |
|------|--------|------|------|
| **GSM8K** | 8.5K | 多步驟算術 | 小學/國中基礎 |
| **MATH Dataset** | 12.5K | 競賽級 | 高中/大學數學 |
| **台版模擬題** | ~500 | 學測/指考 | 真實教學場景 |
| **自製教學題庫** | ~200 | 分級 | 含 Solution Steps、Error Patterns |

### 2. 中文教學對話品質 (權重 30%)
| 維度 | 評測方式 | 通過標準 |
|------|----------|----------|
| **蘇格拉底式引導** | 專家標註 100 條對話 | ≥ 85% 符合引導原則 |
| **年級適應性** | 同一題 6 個年級版本 | 風格/用語/步驟明顯差異 |
| **錯誤診斷** | 注入已知錯誤 → 識別率 | ≥ 90% 正確識別錯誤類型 |
| **支架品質** | 引導問題/類比/遞減支架 | 專家評分 ≥ 4/5 |

### 3. 安全與合規 (權重 15%)
| 測項 | 標準 |
|------|------|
| **拒答率** (不當請求) | ≥ 95% |
| **幻覺率** (數學事實) | ≤ 3% |
| **PII 洩漏** | 0 起 |

### 4. 部署效能 (權重 15%)
| 指標 | 目標 (7B/8B 模型) | 目標 (32B/70B 模型) |
|------|-------------------|---------------------|
| **TTFT** (首字延遲) | < 300ms | < 500ms |
| **TPOT** (單字延遲) | < 30ms | < 50ms |
| **並發支援** | 50+ (單張 A100/H100) | 10-20 (單張 H100) |
| **GPU 記憶體** (INT4) | ~6GB / ~12GB | ~20GB / ~40GB |

---

## License 合規分析

| 模型 | License 類型 | 允許商業 | 允許微調 | 允許蒸餾 | 允許再分發 | 專利條款 | 關鍵限制 |
|------|--------------|----------|----------|----------|------------|----------|----------|
| **Qwen 2.5** | Apache 2.0 | ✅ | ✅ | ✅ | ✅ | 有 | 需保留版權/許可證/狀態變更說明 |
| **Llama 3.1** | Llama Community | ✅ (條件) | ✅ | ❌ (蒸餾限制) | ✅ (條件) | 有 | 月活>7億需授權、不得用於改進其他模型 |
| **DeepSeek V2.5** | DeepSeek License | ✅ | ✅ | ✅ | ✅ | 無 | 需註明來源、不得用於軍事/違法 |
| **Yi 1.5** | Apache 2.0 | ✅ | ✅ | ✅ | ✅ | 有 | 標準 Apache 2.0 |
| **Gemma 2** | Gemma License | ✅ | ✅ | ✅ (條件) | ✅ | 有 | 不得用於訓練其他 Gemma 以外模型 |

> **法務審核重點**：Llama "不得用於改進其他模型" 是否影響 Fine-tuning → 蒸餾到小模型的管線

---

## 部署架構選項

### 方案 A: 雲端託管推理 (起步期)
| 供應商 | 模型支援 | 定價模式 | 優點 | 缺點 |
|--------|----------|----------|------|------|
| **Together AI** | 開源模型完整 | $/token | 免運維、自動擴縮、多模型 | 長期成本高、資料離開 |
| **Fireworks AI** | 開源模型完整 | $/token | 速度快、Function Calling | 同上 |
| **Anyscale (Ray)** | 任意模型 | $/GPU-hr | 彈性高、支援自訂 | 需懂 Ray |
| **RunPod / Lambda Labs** | 任意模型 | $/GPU-hr | 價格透明、根權限 | 需自管 K8s/Docker |

### 方案 B: 自建推理叢集 (Phase 9+)
```yaml
# K8s + vLLM + KServe 架構
infrastructure:
  gpu_nodes:
    - type: "8x H100 80GB"
      count: 2-4 (視併發)
  storage:
    model_registry: "S3/MinIO (10TB+)"
    cache: "NVMe 本地 (模型快取)"
  networking:
    ingress: "NGINX/Kong + mTLS"
    service_mesh: "Istio/Linkerd (可選)"
  orchestration:
    serving: "vLLM (Continuous Batching, Prefix Caching)"
    deployment: "KServe / Triton Inference Server"
    autoscaling: "KEDA (基於請求佇列長度)"
    monitoring: "Prometheus + Grafana + vLLM Metrics"
```

### 成本模型試算 (月度)

| 方案 | 硬體成本 | 雲端費用 | 人力/維運 | 總計 (估) | 適用階段 |
|------|----------|----------|-----------|-----------|----------|
| **Together AI (7B)** | $0 | ~$2,000 | 低 | ~$2,000 | Phase 7-8 |
| **自建 2x H100 (7B/14B)** | $8,000 (折舊) | $500 (電力/網路) | $5,000 | ~$13,500 | Phase 9 |
| **自建 4x H100 (32B/72B)** | $20,000 | $1,000 | $8,000 | ~$29,000 | Phase 9+ |
| **自建 8x H100 (72B/405B MoE)** | $50,000 | $2,000 | $12,000 | ~$64,000 | Phase 10+ |

---

## Fine-tuning 策略研究

### 階段 1: SFT (Supervised Fine-Tuning)
```
資料來源:
├── 高品質數學教學對話 (5K-10K)
│   ├── 蘇格拉底式引導對話 (種子: 專家撰寫 500 → LLM 生成 5K)
│   ├── 錯誤診斷與支架 (種子: 教師標註 200 → LLM 生成 2K)
│   ├── 年齡/程度適應範例 (每年級 200 條)
│   └── 多輪完整教學流程 (種子 100 → 生成 1K)
├── 解題推理軌跡 (10K-20K)
│   ├── 步驟級推理 (含 Operation Tree)
│   ├── 錯誤分析範例 (Error Pattern 標註)
│   └── 驗算過程
└── 知識問答 (RAG 增強, 5K)
    ├── 定義/公式/定理解釋
    ├── 例題講解
    └── 概念釐清

超參數 (7B 模型參考):
- LoRA rank: 64-128, alpha: 16-32
- Learning rate: 2e-4 (LoRA) / 1e-5 (Full)
- Batch size: 128-256 (梯度累積)
- Epochs: 3-5
- Max length: 32K (目標 128K)
- Optimizer: AdamW, weight decay 0.01
- Scheduler: Cosine with warmup 10%
```

### 階段 2: DPO / PPO (Preference Optimization)
```
偏好資料構建 (目標 10K-20K pairs):
├── 人工標註 (專家教師): 2K pairs
│   ├── 同一問題多個回答排序 (Best > Good > Poor)
│   ├── 評分維度: 引導品質、正確性、語氣、年級適應
├── AI 回饋 (GPT-4o/Claude-3.5 當評判者): 8K pairs
│   ├── 生成多個回答 → LLM 判勝負
│   ├── 校準: 人工抽樣 10% 校準 AI 判斷
└── 學生隱性回饋 (線上學習): 持續收集
    ├── 對話輪數、完成率、滿意度評分
    ├── 重新提問率 (低=好)、複製答案率 (高=壞)

Reward Model: 基於 SFT 模型 + LoRA rank 32
PPO: KL penalty 0.1, clip range 0.2
DPO: beta 0.1-0.5
```

### 階段 3: 持續學習與蒸餾
- **知識蒸餾**: 72B/70B Teacher → 7B/14B Student (Logits + Hidden States)
- **線上學習**: 每日從高品質對話中提取 → 增量 LoRA 更新
- **災難性遺忘防護**: Experience Replay (保留 10% 原始 SFT 資料)、Elastic Weight Consolidation

---

## 風險登記與緩解

| 風險 | 機率 | 影響 | 緩解策略 | 觸發條件 |
|------|------|------|----------|----------|
| 選定模型數學能力不足 | 中 | 高 | 並行評測 5+ 模型、保留商業 API 兜底 | Phase 7 前評測 |
| License 爭議/變更 | 低 | 極高 | 法務審核每版本、備選模型就緒 | 釋出新版本時 |
| Fine-tuning 災難性遺忘 | 中 | 中 | LoRA/QLoRA、Experience Replay、EWS | 訓練過程監控 |
| GPU 供應不足/成本飆升 | 中 | 中 | 多雲策略、量化優化、CPU 兜底、模型蒸餾 | 採購週期 > 8 週 |
| 模型幻覺導致教學錯誤 | 中 | 高 | RAG 強制引用、輸出過濾、人工審核機制 | 上線前紅隊測試 |
| 推理延遲超標 | 中 | 中 | Continuous Batching、Prefix Caching、量化、蒸餾 | 負載測試 P95 > 10s |

---

## 決策時間表

| 里程碑 | 目標日期 | 交付物 |
|--------|----------|--------|
| **模型長名單確認** | 2026-09-20 | 10+ 模型基本資料表 |
| **快速篩選 (文獻/基準)** | 2026-10-01 | 縮減至 5 模型 |
| **深度評測 (自建基準)** | 2026-10-31 | 評測報告、分數卡 |
| **License 法務審核** | 2026-11-15 | 法務意見書 |
| **部署 PoC (2 模型並行)** | 2026-12-15 | 效能/成本實測數據 |
| **最終決策** | **2027-01-15** | 決策紀錄、採購啟動 |

---

## 相關文檔

- [[04_AI/AI Model Strategy|AI 模型策略]]
- [[14_Research/Open-source Model License Research|開源模型 License 研究]]
- [[14_Research/Fine-tuning Research|Fine-tuning 研究]]
- [[14_Research/Deployment Research|部署研究]]
- [[13_Decisions/TBD#TBD-06|TBD-06: 模型選型]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始研究框架 | AI 系統架構師 |
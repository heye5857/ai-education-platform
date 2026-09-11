# AI 模型策略

> [!IMPORTANT]
> **狀態**：RESEARCH - TBD-06，核心戰略決策待定
> **最後更新**：2026-09-10
> **決策依據**：[[13_Decisions/Decision Log#DEC-20260910-019|DEC-019]], [[13_Decisions/Decision Log#DEC-20260910-020|DEC-020]]

---

## 戰略目標

> [!IMPORTANT]
> **核心決策**：長期建立**自有數學教學模型**，不永久依賴商業 API
> 
> **過渡策略**：Phase 1-8 使用商業 API / 開源模型 API；Phase 9+ 部署自有模型

---

## 模型選型評估矩陣

### 候選基座模型 (2026 Q3 時点)

| 模型 | 參數量 | License | 中文能力 | 數學推理 | 推理速度 | 商業化風險 | 優先級 |
|------|--------|---------|----------|----------|----------|------------|--------|
| **Qwen 2.5** | 7B/14B/32B/72B | Apache 2.0 | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | 快 | 低 | **P0** |
| **Llama 3.1** | 8B/70B/405B | Llama Community | ⭐⭐⭐ | ⭐⭐⭐⭐ | 中 | 中 | P1 |
| **DeepSeek V2.5** | 236B (MoE) | 商業友善 | ⭐⭐⭐⭐ | ⭐⭐⭐⭐⭐ | 中 | 低 | **P0** |
| **Yi 1.5** | 9B/34B | Apache 2.0 | ⭐⭐⭐⭐ | ⭐⭐⭐ | 快 | 低 | P1 |
| **Gemma 2** | 9B/27B | Gemma License | ⭐⭐⭐ | ⭐⭐⭐ | 快 | 低 | P2 |
| **Nemotron 3 Ultra** | 53B | NVIDIA | ⭐⭐⭐ | ⭐⭐⭐⭐ | 中 | 需確認 | P2 |

> **關鍵指標**：中文數學教學對話品牌、推理準確率、Context Length (需 32K+)、Function Calling 支援

---

## 評測基準設計

### 1. 數學推理準確率
- **GSM8K** (多步驟算術推理)
- **MATH Dataset** (高中數學競賽題)
- **台版模擬題** (國中/高中學測/指考真題)
- **自製教學題庫** (含 Solution Steps、Error Patterns)

### 2. 中文教學對話品質
- **蘇格拉底式引導能力** (不給答案、分步引導)
- **年級適應性** (國一 vs 高三用語差異)
- **錯誤診斷準確率** (識別學生具體錯誤步驟)
- **支架品質** (類比、引導問題、遞減支架)

### 3. 安全性與合規
- **拒答率** (拒絕不當內容、作弊請求)
- **幻覺率** (數學事實錯誤)
- **PII 洩漏風險**

### 4. 部署效能
- **TTFT** (Time to First Token) < 500ms
- **TPOT** (Time Per Output Token) < 50ms
- **並發支援** 100+ 同時用戶
- **GPU 記憶體佔用** (量化後)

---

## 量化策略

| 量化方法 | 適用模型 | 精度損失 | 速度提升 | 記憶體減少 | 推薦場景 |
|----------|----------|----------|----------|------------|----------|
| **FP16/BF16** | 所有 | 無 | 1.5x | 50% | 基準 |
| **GPTQ 4-bit** | Llama/Qwen | <1% | 3-4x | 75% | 生產首選 |
| **AWQ 4-bit** | Llama/Qwen | <1% | 3-4x | 75% | 推理優化 |
| **GGUF Q4_K_M** | 所有 | 1-2% | 4-5x | 80% | CPU/邊緣 |
| **INT8** | 所有 | 0.5% | 2x | 50% | 快速驗證 |

---

## Fine-tuning 管線設計

### 階段 1: SFT (Supervised Fine-Tuning)
```
訓練資料來源:
├── 高品質數學教學對話 (種子資料: 5K-10K)
│   ├── 蘇格拉底式引導對話
│   ├── 錯誤診斷與支架
│   ├── 年齡/程度適應範例
│   └── 多輪完整教學流程
├── 解題推理軌跡 (Solution Steps + Operation Tree)
│   ├── 步驟級推理
│   ├── 錯誤分析範例
│   └── 驗算過程
└── 知識問答 (RAG 增強)
    ├── 定義/公式/定理解釋
    ├── 例題講解
    └── 概念釐清

資料格式: ShareGPT / Alpaca / ChatML
Context Length: 32K (最小) → 128K (目標)
```

### 階段 2: DPO / PPO (Preference Optimization)
```
偏好資料構建:
├── 人工標註: 同一問題多個回答排序
├── AI 回饋: GPT-4o/Claude 作為評判者
├── 學生隱性回饋: 對話輪數、完成率、滿意度
└── 硬性約束: 不給答案、引導完整度、安全性

Reward Model 訓練 → PPO/DPO 微調
```

### 階段 3: 持續學習
- **線上學習**: 每日/每週從新對話中提取高品質樣本
- **知識蒸餾**: 從大模型 (72B) 蒸餾至小模型 (7B/14B)
- **領域適應**: 新課綱、新題型、新教學策略

---

## 基建架構

### 開發環境
```
GPU: 4-8x H100/A100 (租用/自建)
框架: 
  - 訓練: DeepSpeed + Megatron-LM / FSDP / Axolotl
  - 推理: vLLM / TGI / TensorRT-LLM
  - 實驗追蹤: MLflow / Weights & Biases
  - 資料版控: DVC / LakeFS
```

### 生產部署 (Phase 9+)
```
Kubernetes + KServe / Triton Inference Server
├── 模型儲存: S3 / MinIO + Model Registry
├── 自動擴縮: HPA (基於請求佇列長度)
├── 批次推理: Continuous Batching (vLLM)
├── 前綴快取: Prefix Caching (系統 Prompt 共享)
├── 觀測性: Prometheus + Grafana + Langfuse
└── A/B Test: 旁路部署 + 流量分攤
```

---

## 成本模型估算

| 階段 | GPU 需求 | 預估成本 (月) | 備註 |
|------|----------|---------------|------|
| Phase 1-8 (API) | 0 | $500-2000 | OpenAI/Anthropic API 費用 |
| Phase 9 訓練 | 8x H100 × 3個月 | $50k-80k | 含實驗失敗緩衝 |
| Phase 9 部署 | 4x H100 (推理) | $3k-5k/月 | 100 併發用戶 |
| Phase 10 擴容 | 8-16x H100 | $6k-12k/月 | 1000+ 併發 |

> **關鍵里程碑**: Phase 9 結束時，單次對話成本 < 商業 API 30%

---

## 風險與緩解

| 風險 | 機率 | 影響 | 緩解策略 |
|------|------|------|----------|
| 開源模型數學能力不足 | 中 | 高 | 並行評測 5+ 模型、保留商業 API 兜底 |
| Fine-tuning 災難性遺忘 | 中 | 中 | LoRA/QLoRA、經驗回放、知識蒸餾 |
| License 變更/法律風險 | 低 | 極高 | 法務審查每個模型 License、備選方案 |
| GPU 供應不足/成本飆升 | 中 | 中 | 多雲策略、量化優化、CPU 兜底 |
| 模型幻覺導致教學錯誤 | 中 | 高 | RAG 強制引用、人工審核機制、學生回饋閉環 |

---

## 相關文檔

- [[04_AI/Student Memory|學生記憶系統]]
- [[04_AI/AI Teaching Principles|AI 教學原則]]
- [[05_RAG/RAG Architecture|RAG 架構]]
- [[14_Research/AI Model Research|AI 模型研究]]
- [[14_Research/Open-source Model License Research|開源模型 License 研究]]
- [[13_Decisions/TBD#TBD-06|TBD-06: 模型選型]]
- [[12_Development/Roadmap|開發路線圖 Phase 9]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始策略框架 | AI 系統架構師 |
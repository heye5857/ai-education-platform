# Embedding 研究

> [!IMPORTANT]
> **狀態**：RESEARCH - TBD-07 支撐
> **最後更新**：2026-09-10

---

## 研究目標

選定生產級 Embedding Model，支援 RAG 語義檢索，核心要求：
- 中文數學教學語料表現最佳
- 支援長文本 (8K-128K tokens)
- 推理延遲低、可量化部署
- License 允許商業使用、微調、蒸餾

---

## 候選模型深度比較 (2026 Q3)

### 開源模型 (可自建部署)

| 模型 | 維度 | 最大長度 | 語言數 | 數學/程式碼 | 推理速度 | 量化支援 | License | 部署難度 |
|------|------|----------|--------|-------------|----------|----------|---------|----------|
| **BGE-M3** | 1024 | 8192 | 100+ | 好 (含程式碼) | ⭐⭐⭐⭐⭐ | GPTQ/AWQ/GGUF | MIT | 低 |
| **E5-Mistral-7B** | 4096 | 4096 | 100+ | 極好 | ⭐⭐⭐ | GPTQ/AWQ | Apache 2.0 | 中 |
| **Nomic Embed Text v2** | 768 | 8192 | 100+ | 好 | ⭐⭐⭐⭐ | GGUF | Apache 2.0 | 低 |
| **Jina Embeddings v3** | 1024 | 8192 | 89 | 好 | ⭐⭐⭐⭐ | ONNX/GGUF | CC BY-NC 4.0 | 低 |
| **GTE-Qwen2-7B** | 3584 | 32768 | 50+ | 極好 | ⭐⭐⭐ | GPTQ/AWQ | Apache 2.0 | 中 |
| **SFR-Embedding-Mistral** | 4096 | 32768 | 50+ | 極好 | ⭐⭐⭐ | GPTQ/AWQ | Apache 2.0 | 中 |

### 商業 API (兜底/基準)

| 服務 | 維度 | 價格 (per 1M tokens) | 延遲 | SLA | 資料保留 |
|------|------|---------------------|------|-----|----------|
| **OpenAI text-embedding-3-large** | 3072 | $0.13 | ~200ms | 99.9% | 30 天 (可關閉) |
| **OpenAI text-embedding-3-small** | 1536 | $0.02 | ~100ms | 99.9% | 30 天 |
| **Cohere Embed v3** | 1024 | $0.10 | ~150ms | 99.9% | 可配置 |
| **Voyage AI** | 1024/2048 | $0.10-0.12 | ~100ms | 99.9% | 零保留 (企業版) |
| **Mixedbread** | 1024 | $0.05 | ~150ms | 99.9% | 可配置 |

---

## 評測基準設計

### 測試集構建

| 測試集類別 | 來源 | 樣本數 | 評測重點 |
|------------|------|--------|----------|
| **教科書段落檢索** | 數學教科書 PDF | 200 queries | 長文本、數學符號、公式密集 |
| **例題/解析檢索** | 習作/講義 | 150 queries | 步驟推理、知識點關聯 |
| **概念定義查詢** | 知識點定義 | 100 queries | 精確匹配、同義詞擴展 |
| **跨語言檢索** | 中英對照教材 | 50 queries | 中英混合、術語一致性 |
| **長文本檢索** | 完整章節 (5K+ tokens) | 30 queries | 長文本語義保持、位置感知 |

### 評測指標

| 指標 | 定義 | 計算方式 | 目標 |
|------|------|----------|------|
| **Recall@K** | 相關文檔在 Top-K 被召回 | 人工標註相關性 | @5 ≥ 85%, @10 ≥ 95% |
| **nDCG@K** | 排序品質考慮相關度等級 | nDCG = DCG/IDCG | @10 ≥ 0.75 |
| **MRR** | 首個相關文檔倒數排名平均 | 1/rank | ≥ 0.7 |
| **延遲 P95** | 單次 Embedding 推理 | 批次 32、GPU | < 50ms |
| **吞吐量** | tokens/秒 | 批次 32、GPU | > 50K tokens/s |

### 評測腳本架構
```python
def evaluate_embedding_model(model, test_cases: List[TestCase]) -> EmbeddingEvalReport:
    results = {}
    
    for test_name, test_case in test_cases.items():
        # 1. 建立文檔索引
        doc_embeddings = model.encode(test_case.documents, batch_size=32)
        index = build_faiss_index(doc_embeddings)
        
        # 2. 查詢檢索
        query_embeddings = model.encode(test_case.queries, batch_size=32)
        scores, indices = index.search(query_embeddings, k=10)
        
        # 3. 計算指標
        recall_at_k = compute_recall_at_k(indices, test_case.ground_truth, k=[1,5,10])
        ndcg_at_k = compute_ndcg_at_k(scores, indices, test_case.relevance_grades, k=[5,10])
        mrr = compute_mrr(indices, test_case.ground_truth)
        
        # 4. 效能測試
        latency_p95 = benchmark_latency(model, batch_sizes=[1,8,32,64])
        throughput = benchmark_throughput(model)
        
        results[test_name] = TestResult(
            recall_at_k=recall_at_k,
            ndcg_at_k=ndcg_at_k,
            mrr=mrr,
            latency_p95=latency_p95,
            throughput=throughput
        )
    
    return aggregate_results(results)
```

---

## 微調策略 (Domain Adaptation)

### 訓練資料構建
```python
# 正樣本: (query, relevant_doc) - 來自教科書/講義/題目解析
# 負樣本: (query, irrelevant_doc) - 隨機採樣 + 困難負樣本 (BM25 高分但不相關)

training_data = {
    "positive_pairs": [
        # (query, doc_id, score=1.0)
        ("分配律定義", "chunk_math_textbook_dp_001", 1.0),
        ("2(x+3)=14 解法", "chunk_math_workbook_eq_045", 1.0),
    ],
    "hard_negatives": [
        # (query, doc_id, score=0.0) - BM25 高分但語義不相關
        ("分配律定義", "chunk_math_textbook_factoring_012", 0.0),
    ],
    "in_batch_negatives": True  # 批次內其他樣本當負樣本
}
```

### 微調配置
```yaml
# Bi-Encoder 微調 (對比學習)
model: "BAAI/bge-m3"
loss: "MultipleNegativesRankingLoss"  # 或 ContrastiveLoss
batch_size: 64
learning_rate: 2e-5
warmup_steps: 500
epochs: 3
max_seq_length: 8192
pooling: "cls"  # 或 mean_pooling
gradient_checkpointing: true
fp16: true
```

---

## 部署架構

### 自建部署 (推薦)
```yaml
# vLLM / TGI / TEI (Text Embeddings Inference)
deployment:
  model: "BAAI/bge-m3"
  server: "tei"  # Text Embeddings Inference (Hugging Face 官方)
  replicas: 2-4
  resources:
    gpu: "1x A10G / L4 / T4"  # 1024 維度、8K context 輕量
    memory: "16GB"
    cpu: "4 cores"
  autoscaling:
    metric: "request_queue_length"
    min_replicas: 2
    max_replicas: 8
  monitoring:
    metrics_port: 8080
    health_check: "/health"
```

### 效能基準 (預估)

| 批次大小 | GPU | 延遲 (ms) | 吞吐 (tokens/s) | 記憶體 |
|----------|-----|-----------|-----------------|--------|
| 1 | T4 | ~45 | ~22K | ~4GB |
| 32 | T4 | ~120 | ~85K | ~6GB |
| 64 | A10G | ~80 | ~150K | ~8GB |
| 32 | L4 | ~60 | ~120K | ~6GB |

---

## 向量索引優化

### pgvector HNSW 參數調優
```sql
-- 建立 HNSW 索引
CREATE INDEX idx_document_chunk_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 查詢時設定 ef_search
SET hnsw.ef_search = 100;
SELECT * FROM document_chunks 
ORDER BY embedding <=> $query_embedding 
LIMIT 10;
```

### 參數調優指南
| 參數 | 說明 | 推薦值 | 調優方向 |
|------|------|--------|----------|
| **m** | 每層連接數 | 16-32 | 越大精度越高、建索引越慢、記憶體越大 |
| **ef_construction** | 建索引時搜尋寬度 | 64-200 | 越大品質越好、建索引越慢 |
| **ef_search** | 查詢時搜尋寬度 | 50-200 | 越大召回越高、查詢越慢 |

---

## 成本模型

| 方案 | 模型 | GPU | 月費用 (估) | 適用規模 |
|------|------|-----|-------------|----------|
| **自建 TEI** | BGE-M3 | 1x T4/L4 | $200-400 | 100K chunks, 10K QPS |
| **自建 TEI** | BGE-M3 | 2x L4 | $600-800 | 500K chunks, 50K QPS |
| **OpenAI API** | text-emb-3-small | - | $50-200 | < 50K chunks, 低頻 |
| **Voyage AI** | voyage-3 | - | $200-500 | 中規模、不想自建 |

---

## 決策建議

### 階段 1 (Phase 1-8): BGE-M3 + pgvector
- **理由**: 開源免費、中文強、部署簡單、pgvector 整合度高、效能足夠
- **風險**: 長文本截斷 (8K)、極高並發需擴展

### 階段 2 (Phase 9+): 對齊自有模型 Embedding
- 從 Teacher Model (72B) 蒸餾 Embedding Head
- 或微調 BGE-M3/E5-Mistral on 領域資料
- 統一模型架構、降低部署複雜度

---

## 相關文檔

- [[14_Research/RAG Research|RAG 研究]]
- [[14_Research/Vector Database Research|向量資料庫研究]]
- [[05_RAG/RAG Architecture|RAG 架構]]
- [[13_Decisions/TBD#TBD-07|TBD-07: RAG 技術選型]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始 Embedding 研究 | AI 系統架構師 |
# 向量資料庫研究

> [!IMPORTANT]
> **狀態**：RESEARCH - TBD-07 支撐
> **最後更新**：2026-09-10

---

## 研究目標

選定生產級向量資料庫，支援 RAG 語義檢索，核心要求：
- 支援 100K-1M+ 向量
- 混合檢索 (向量 + 全文 + Metadata 過濾)
- ACID 保證、高可用、易運維
- License 允許商業使用

---

## 候選方案深度比較 (2026 Q3)

### 1. PostgreSQL + pgvector (推薦首選)

| 維度 | 評價 | 備註 |
|------|------|------|
| **成熟度** | ⭐⭐⭐⭐⭐ | PostgreSQL 16+ 內建、生產級驗證 |
| **向量索引** | HNSW, IVFFlat | HNSW 召回率高、支援並行建立 |
| **混合查詢** | 原生 SQL | `WHERE metadata->>'grade' = '8' ORDER BY embedding <=> $1 LIMIT 10` |
| **ACID** | 完整 | 交易支援、資料一致性無虞 |
| **擴展性** | 單機/讀寫分離 | 100K-500K 向量單機足夠；分片需應用層 |
| **運維** | 現有 PG 技能 | 無新元件、備份/監控/備援現成 |
| **License** | PostgreSQL License | 完全商業自由 |
| **成本** | 低 | 僅 PG 成本 |

**適用階段**: Phase 1-8 (100K-500K chunks) ✅

### 2. Pinecone (托管服務)

| 維度 | 評價 |
|------|------|
| **免運維** | ✅ 完全托管、自動擴縮 |
| **混合檢索** | 內建 Sparse-Dense、Metadata 過濾 |
| **效能** | 優化極致、P99 < 50ms |
| **成本** | 較高 ($70/月/單位 起、依維度/容量/吞吐) |
| **Vendor Lock-in** | 高 (專有 API、資料遷移麻煩) |
| **資料主權** | 雲端、需確認區域合規 |
| **適用階段** | Phase 9+ 需極致效能/免運維時 |

### 3. Weaviate (開源可自管)

| 維度 | 評價 |
|------|------|
| **GraphQL API** | 直觀、支援複雜查詢 |
| **混合檢索** | BM25 + 向量 + 機器學習重排序 |
| **多模組** | 內建 Embedding/生成/重排序模組 |
| **運維** | 較複雜 (Java/JVM、記憶體需求大) |
| **License** | BSD-3 (商業友善) |
| **擴展性** | 分散式架構、支援億級向量 |
| **適用階段** | Phase 9+ 需自管、複雜查詢 |

### 4. Milvus (高效能分散式)

| 維度 | 評價 |
|------|------|
| **效能** | 極致 (GPU 加速、SIMD、分散式) |
| **擴展性** | 百億向量、多租戶、分片自動均衡 |
| **功能** | 混合檢索、稀疏向量、篩選、篩選推送 |
| **運維** | 複雜 (etcd、MinIO、Pulsar、K8s 必須) |
| **資源** | 重 (需 K8s 叢集、多服務) |
| **License** | Apache 2.0 |
| **適用階段** | Phase 10+ 大規模、專業團隊 |

### 5. Qdrant (Rust 實作、高效能)

| 維度 | 評價 |
|------|------|
| **效能** | Rust 寫入、極快、記憶體效率高 |
| **Payload 過濾** | 強大 (類 SQL、地理空間、全文) |
| **二進制量化** | 內建產品量化 (PQ)、大幅省記憶體 |
| **運維** | 單一二進制檔、Docker 部署簡單 |
| **License** | Apache 2.0 |
| **生態** | 較新、Python/JS SDK 完善 |
| **適用階段** | Phase 9+ 替代方案、觀察中 |

### 6. pgvecto.rs (PostgreSQL 擴展，Rust 實作)

| 維度 | 評價 |
|------|------|
| **效能** | 比 pgvector 快 3-10x (SIMD、Rust) |
| **相容性** | 完全相容 pgvector API |
| **成熟度** | 較新、快速發展中 |
| **適用階段** | 觀察中、可作為 pgvector 升級路徑 |

---

## 決策矩陣

| 維度 | pgvector | Pinecone | Weaviate | Milvus | Qdrant |
|------|----------|----------|----------|--------|--------|
| **Phase 1-8 適用** | ✅ 最佳 | 成本高 | 運維重 | 過度 | 觀察中 |
| **Phase 9-10 適用** | 足夠 | 免運維首選 | 自管首選 | 大規模首選 | 替代方案 |
| **混合檢索** | 原生 SQL | 內建 | 內建 | 內建 | 內建 |
| **Metadata 過濾** | JSONB + GIN | 內建 | 內建 | 內建 | 強大 |
| **ACID** | 完整 | 最終一致 | 最終一致 | 最終一致 | 最終一致 |
| **備份/恢復** | PG 原生 | 快照 | 快照 | 快照 | 快照 |
| **團隊技能匹配** | 高 (PG 專精) | 低 (新 API) | 中 (新架構) | 低 (K8s 必須) | 中 |
| **成本 (月/100K 向量)** | ~$50 (PG 成本) | ~$200-500 | ~$100 (自管) | ~$500+ (K8s) | ~$80 (自管) |

---

## pgvector 深度配置指南

### 索引建立策略
```sql
-- HNSW 索引 (高召回、高精度、建索引慢)
CREATE INDEX idx_chunks_embedding_hnsw 
ON document_chunks 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- IVFFlat 索引 (大資料量、可接受較低召回)
-- CREATE INDEX idx_chunks_embedding_ivfflat
-- ON document_chunks
-- USING ivfflat (embedding vector_cosine_ops)
-- WITH (lists = 100);

-- 查詢時動態調整 ef_search
SET hnsw.ef_search = 100;  -- 預設 40，調大提高召回
SELECT id, content, 1 - (embedding <=> $1) AS similarity
FROM document_chunks
WHERE metadata->>'grade' = '8'
ORDER BY embedding <=> $1
LIMIT 10;
```

### 混合檢索 SQL 範例
```sql
-- 向量 + 全文 (BM25) + Metadata 過濾 + RRF 融合
WITH vector_search AS (
    SELECT id, 1 - (embedding <=> $query_emb) AS score
    FROM document_chunks
    WHERE metadata->>'grade' = '8'
    ORDER BY embedding <=> $query_emb
    LIMIT 20
),
keyword_search AS (
    SELECT id, ts_rank_cd(to_tsvector('chinese', content), plainto_tsquery('chinese', $query)) AS score
    FROM document_chunks
    WHERE metadata->>'grade' = '8'
    AND to_tsvector('chinese', content) @@ plainto_tsquery('chinese', $query)
    ORDER BY score DESC
    LIMIT 20
),
fused AS (
    SELECT id, 
           (1.0 / (60 + COALESCE(v.rank, 20))) * 0.6 + 
           (1.0 / (60 + COALESCE(k.rank, 20))) * 0.4 AS rrf_score
    FROM (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) AS rank FROM vector_search
    ) v
    FULL JOIN (
        SELECT id, ROW_NUMBER() OVER (ORDER BY score DESC) AS rank FROM keyword_search
    ) k USING (id)
)
SELECT d.id, d.content, d.metadata, f.rrf_score
FROM fused f
JOIN document_chunks d ON d.id = f.id
ORDER BY f.rrf_score DESC
LIMIT 10;
```

### 效能調優清單
- [ ] `work_mem` 設定足夠 (256MB-1GB) 供排序/雜湊
- [ ] `maintenance_work_mem` 設定大 (1-2GB) 加速建索引
- [ ] `max_parallel_maintenance_workers` 開啟並行建索引
- [ ] `effective_io_concurrency` 設定 SSD 數量
- [ ] 定期 `ANALYZE` 更新統計資訊
- [ ] 監控 `pg_stat_user_indexes` 索引使用率
- [ ] 定期 `REINDEX CONCURRENTLY` 避免膨脹

---

## 遷移策略

### Phase 1-8: pgvector
```yaml
current_stack:
  primary: "PostgreSQL 16 + pgvector 0.7+"
  connection_pool: "PgBouncer (transaction mode)"
  read_replica: "1-2 個 (異步複寫)"
  backup: "WAL-G / pgBackRest (每日全備 + 小時增量)"
  monitoring: "pg_stat_statements + pg_stat_user_indexes + Grafana"
```

### Phase 9+ 遷移觸發條件
- 向量數 > 500K 且查詢 P95 > 200ms
- 需要分散式/多租戶/進階重排序
- 團隊具備 K8s 運維能力

### 遷移路徑
```
pgvector → Pinecone (托管、零運維)
    或
pgvector → Weaviate/Qdrant (自管、開源、可控)
    或
pgvector → Milvus (極大規模、專業團隊)
```

---

## 成本試算 (100K chunks, 1024 維)

| 方案 | 基礎設施成本/月 | 運維成本 | 總計/月 | 備註 |
|------|----------------|----------|---------|------|
| **pgvector (RDS)** | $150 (db.r6g.xlarge) | 低 (既有 PG) | ~$200 | 推薦起步 |
| **pgvector (自建 EC2)** | $80 (r6g.xlarge) | 中 | ~$150 | 需自管備份/監控 |
| **Pinecone** | $70/單位 (含 1M 向量) | 零 | ~$140 (2單位) | 免運維、彈性 |
| **Weaviate (自建)** | $200 (3x r6g.large K8s) | 高 | ~$400 | 需 K8s 專長 |
| **Milvus (自建)** | $500+ (K8s 叢集) | 很高 | ~$1000+ | 大規模專用 |

---

## 決策建議

### ✅ Phase 1-8: **PostgreSQL + pgvector**
- 理由: 技術棧統一、運維成本最低、ACID 保證、混合查詢原生、團隊熟悉
- 容量: 單機支援 500K-1M 向量 (視記憶體/CPU)
- 升級路徑: 讀寫分離 → pgvecto.rs → 分片 → 遷移專用向量 DB

### 🔄 Phase 9+ 評估遷移
觸發條件滿足時，並行評估 3 個方向：
1. **Pinecone** - 若團隊想零運維、預算允許
2. **Weaviate/Qdrant** - 若想自管、開源、可控
3. **Milvus** - 若規模極大、有專業 K8s 團隊

---

## 相關文檔

- [[14_Research/RAG Research|RAG 研究]]
- [[14_Research/Embedding Research|Embedding 研究]]
- [[05_RAG/RAG Architecture|RAG 架構]]
- [[13_Decisions/TBD#TBD-07|TBD-07: RAG 技術選型]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始向量資料庫研究 | AI 系統架構師 |
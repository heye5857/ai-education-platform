# 資料處理管線

> [!IMPORTANT]
> **狀態**：PROPOSED - 支援 [[06_Data/Training Data|訓練資料]]、[[05_RAG/RAG Architecture|RAG 架構]]、[[02_Features/Question Bank|題庫系統]]
> **最後更新**：2026-09-10

---

## 管線架構總覽

```mermaid
flowchart TB
    subgraph SOURCE[資料來源層]
        S1[原始授權檔案\n/raw/ 目錄\n3-5 TB]
    end
    
    subgraph INGEST[攝入與驗證層]
        I1[格式識別\nFile Type Detection]
        I2[完整性檢查\nChecksum / Schema Validate]
        I3[授權驗證\nLicense Check]
        I4[去重複\nContent Hash Dedup]
        I5[元資料提取\nMetadata Extraction]
    end
    
    subgraph PARSE[解析與結構化層]
        P1[PDF 解析器\nPyMuPDF + 版面分析]
        P2[Word 解析器\npython-docx + OMML→LaTeX]
        P3[Excel/CSV 解析器\nPandas + Schema Map]
        P4[圖片 OCR\nPaddleOCR + 數學區域]
        P5[影片逐字稿\nWhisper Large-v3]
        P6[LaTeX 解析器\n自建 / latex2ast]
    end
    
    subgraph TRANSFORM[轉換與標準化層]
        T1[文字清洗\n正規化/去噪/斷句]
        T2[數學公式標準化\nLaTeX 正規化 + AST]
        T3[語義分塊\nSemantic Chunking]
        T4[知識點標註\nKP Tagging (規則+LLM)]
        T5[解析步驟結構化\nSolution Steps → JSON]
        T6[錯誤模式標註\nError Pattern Tagging]
        T7[題目格式轉換\n標準 Question JSON]
    end
    
    subgraph QUALITY[品質管控層]
        Q1[自動化檢核\nRule-based Validation]
        Q2[抽樣人工複核\nExpert Review Sampling]
        Q3[一致性檢查\nCross-reference Check]
        Q4[分級標記\nGold/Silver/Bronze/Raw]
    end
    
    subgraph OUTPUT[輸出與入庫層]
        O1[RAG 入庫\nDocument + Chunk + Embedding]
        O2[題庫入庫\nQuestion + KP + LevelQuestion]
        O3[訓練集輸出\nSFT/DPO/Reasoning Trace]
        O4[內容製作輸出\n影片腳本/卡片/投影片]
        O5[資料血緣記錄\nLineage + Manifest]
    end
    
    S1 --> I1 --> I2 --> I3 --> I4 --> I5
    I5 --> P1 & P2 & P3 & P4 & P5 & P6
    P1 & P2 & P3 & P4 & P5 & P6 --> T1 --> T2 --> T3 --> T4 --> T5 --> T6 --> T7
    T7 --> Q1 --> Q2 --> Q3 --> Q4
    Q4 --> O1 & O2 & O3 & O4 & O5
```

---

## 階段實施計畫

### Phase 1: 核心 MVP (Month 1-2)
- [ ] PDF/Word 基礎解析器
- [ ] 文字清洗 + LaTeX 正規化
- [ ] 規則式 KP 標註 (關鍵字匹配 + 正則)
- [ ] 題庫匯入管線 (Excel/CSV → Question DB)
- [ ] RAG 文檔管線 (Parse → Chunk → Embed → pgvector)
- [ ] 基礎品質檢核 (格式、完整性、去重)

### Phase 2: 智能化升級 (Month 3-4)
- [ ] LLM 輔助 KP 標註 (Few-shot + 驗證迴圈)
- [ ] Solution Steps 結構化抽取 (LLM + 規則後處理)
- [ ] 錯誤模式自動標註
- [ ] 影片逐字稿處理 (Whisper + 語者分離 + 章節切分)
- [ ] 圖片 OCR + 數學公式識別
- [ ] 主動學習迴圈 (低信心樣本優先人工)

### Phase 3: 訓練級資料產出 (Month 5-6)
- [ ] SFT 對話資料合成 (種子範例 + LLM 生成 + 專家審)
- [ ] DPO 偏好資料構建 (雙模型對戰 + 人工裁決)
- [ ] Reasoning Trace 生成 (模型推理 + 專家修正)
- [ ] 資料版本管理系統 (DVC/LakeFS + 資料卡片)
- [ ] 持續整合管線 (GitOps + 自動化測試)

---

## 關鍵元件詳細設計

### 1. PDF 解析器 (核心難點)

```python
# pipeline/parsers/pdf_parser.py
class PDFParser:
    def __init__(self):
        self.layout_analyzer = LayoutAnalyzer()  # 標題/段落/表格/圖片/公式區域
        self.formula_detector = MathFormulaDetector()  # 數學區域識別
        self.table_extractor = TableExtractor()  # 表格結構化
        
    def parse(self, pdf_path: Path) -> ParsedDocument:
        doc = fitz.open(pdf_path)
        pages = []
        
        for page_num, page in enumerate(doc):
            # 1. 版面分析
            layout = self.layout_analyzer.analyze(page)
            
            # 2. 文字提取 (保留閱讀順序)
            text_blocks = self.extract_text_blocks(page, layout)
            
            # 3. 數學公式區域偵測 + OCR
            math_regions = self.formula_detector.detect(page)
            for region in math_regions:
                latex = self.math_ocr.recognize(region.image)
                region.latex = latex
            
            # 4. 表格提取
            tables = self.table_extractor.extract(page)
            
            # 5. 圖片提取 + 向量化
            images = self.extract_images(page)
            
            pages.append(ParsedPage(
                pageNumber=page_num+1,
                textBlocks=text_blocks,
                mathRegions=math_regions,
                tables=tables,
                images=images
            ))
        
        return ParsedDocument(pages=pages, metadata=self.extract_metadata(doc))
```

**關鍵挑戰與對策**:
| 挑戰 | 對策 |
|------|------|
| 多欄排版閱讀順序錯誤 | 版面分析 + 閱讀順序重建 (XY-cut / 深度學習) |
| 數學公式與文字混排 | 公式區域獨立偵測 → LaTeX OCR → 插入標記位置 |
| 表格跨頁/合併儲存格 | 表格結構重建 → Markdown/HTML 表格輸出 |
| 掃描版 PDF 畫質差 | 影像前處理 (去噪、二值化、去傾斜) + 高精度 OCR |

### 2. 語義分塊器

```python
# pipeline/transformers/semantic_chunker.py
class SemanticChunker:
    def __init__(self, config: ChunkingConfig):
        self.config = config
        self.heading_detector = HeadingDetector()
        self.formula_keeper = FormulaContextKeeper()
        
    def chunk(self, parsed_doc: ParsedDocument) -> List[Chunk]:
        chunks = []
        
        for page in parsed_doc.pages:
            # 1. 依標題層級建立節點樹
            heading_tree = self.heading_detector.build_tree(page.textBlocks)
            
            # 2. 遞歸分割
            for node in heading_tree.traverse():
                content = node.aggregate_content()
                
                # 3. 保持公式與上下文
                content = self.formula_keeper.ensure_context(content)
                
                # 4. 長度控制
                sub_chunks = self.split_by_token_limit(content)
                
                for i, sub in enumerate(sub_chunks):
                    chunks.append(Chunk(
                        documentId=parsed_doc.docId,
                        chunkIndex=len(chunks),
                        content=sub.text,
                        metadata=ChunkMetadata(
                            headingPath=node.headingPath,
                            headingLevel=node.level,
                            knowledgePoints=self.extract_kps(sub),
                            formulas=self.extract_formulas(sub),
                            examples=self.extract_examples(sub),
                            pageNumber=page.pageNumber,
                            tokenCount=count_tokens(sub.text)
                        )
                    ))
        return chunks
```

### 3. Embedding 生成 Worker

```python
# pipeline/workers/embedding_worker.py
class EmbeddingWorker:
    def __init__(self, model_name: str = "BAAI/bge-m3", batch_size: int = 32):
        self.model = AutoModel.from_pretrained(model_name)
        self.tokenizer = AutoTokenizer.from_pretrained(model_name)
        self.batch_size = batch_size
        self.device = "cuda" if torch.cuda.is_available() else "cpu"
        self.model.to(self.device)
        
    async def process_batch(self, chunks: List[Chunk]) -> List[Chunk]:
        texts = [c.content for c in chunks]
        
        # 分批處理
        embeddings = []
        for i in range(0, len(texts), self.batch_size):
            batch = texts[i:i+self.batch_size]
            inputs = self.tokenizer(batch, padding=True, truncation=True, 
                                  max_length=8192, return_tensors="pt").to(self.device)
            
            with torch.no_grad():
                outputs = self.model(**inputs)
                # 使用 CLS token 或 mean pooling
                batch_embeddings = outputs.last_hidden_state[:, 0].cpu().numpy()
                embeddings.extend(batch_embeddings)
        
        for chunk, emb in zip(chunks, embeddings):
            chunk.embedding = emb.tolist()
            
        return chunks
```

### 4. 題庫標註管線

```python
# pipeline/transformers/question_tagger.py
class QuestionTagger:
    def __init__(self):
        self.kp_classifier = KPClassifier()           # 規則 + LLM 混合
        self.difficulty_estimator = DifficultyEstimator()  # IRT 預估 + 專家校準
        self.error_pattern_tagger = ErrorPatternTagger()     # 解析步驟分析
        
    def tag(self, question: QuestionDraft) -> TaggedQuestion:
        # 1. KP 標註
        kp_predictions = self.kp_classifier.predict(question.stem, question.solution)
        question.knowledgePoints = self.validate_kps(kp_predictions)
        
        # 2. 難度估算
        difficulty = self.difficulty_estimator.estimate(
            question.stem, question.solution, question.knowledgePoints
        )
        question.difficulty = difficulty
        
        # 3. 解析步驟結構化
        if question.solutionSteps:
            question.solutionSteps = self.structure_solution_steps(question.solutionSteps)
        
        # 4. 錯誤模式預測
        question.predictedErrorPatterns = self.error_pattern_tagger.predict(
            question.solutionSteps, question.knowledgePoints
        )
        
        return question
```

---

## 基建與運維

### 排程與編排
```yaml
# .github/workflows/data-pipeline.yml / Airflow DAG
schedule:
  daily_incremental: "0 3 * * *"      # 每日增量處理
  weekly_full_rebuild: "0 2 * * 0"    # 每週全量重建 (RAG 索引)
  monthly_quality_audit: "0 1 1 * *"  # 每月品質審計

retries: 3
timeout: 4h
alert_on_failure: true
```

### 監控指標
| 指標 | 來源 | 告警閾值 |
|------|------|----------|
| 管線執行時間 | Airflow/Workflow | > 4h |
| 解析成功率 | 解析器日誌 | < 99% |
| KP 標註覆蓋率 | 標註統計 | < 95% |
| Embedding 生成延遲 | Worker Metrics | P99 > 10min |
| 入庫資料量突變 | 資料庫統計 | ±50% vs 前日 |
| Gold 資料佔比 | 品質分級統計 | < 5% |

### 資料血緣追蹤
```json
{
  "pipelineRunId": "run_20260910_030000",
  "sourceFiles": ["s3://bucket/raw/textbooks/math_jh1_ch1.pdf"],
  "inputChecksums": {"math_jh1_ch1.pdf": "sha256:abc123..."},
  "processingSteps": [
    {"step": "parse", "duration": 120, "output": "parsed_doc_123"},
    {"step": "chunk", "duration": 45, "output": "chunks_456"},
    {"step": "embed", "duration": 300, "output": "embedded_chunks_789"},
    {"step": "index", "duration": 60, "output": "pgvector_index_updated"}
  ],
  "outputCounts": {
    "documents": 1,
    "chunks": 127,
    "questions": 45,
    "trainingSamples": 230
  },
  "qualityGates": {
    "parseSuccess": true,
    "chunkQualityPass": true,
    "embeddingQualityPass": true,
    "expertReviewRequired": 3
  },
  "status": "COMPLETED",
  "completedAt": "2026-09-10T03:05:45Z"
}
```

---

## 相關文檔

- [[06_Data/Training Data|訓練資料總覽]]
- [[06_Data/Dataset Standard|資料集標準]]
- [[06_Data/Data Format|資料格式規範]]
- [[05_RAG/RAG Architecture|RAG 架構]]
- [[03_Math_Teaching/Math Reasoning|數學推理解析]]
- [[04_AI/AI Model Strategy|AI 模型策略]]
- [[13_Decisions/TBD#TBD-14|TBD-14: 題目格式]]
- [[13_Decisions/TBD#TBD-15|TBD-15: Solution Steps]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始管線設計 | 系統架構師 |
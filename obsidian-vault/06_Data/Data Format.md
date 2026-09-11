# 資料格式規範

> [!IMPORTANT]
> **狀態**：PROPOSED - TBD-14 待決定最終格式
> **最後更新**：2026-09-10

---

## 核心格式決策

### 數學公式表示

| 格式 | 優點 | 缺點 | 採用建議 |
|------|------|------|----------|
| **LaTeX** | 標準、通用、可渲染、LLM 理解好 | 需轉義、非結構化 | **主要格式** ✅ |
| **MathML** | 結構化、語義明確、瀏覽器原生 | 冗長、LLM 較難理解 | 同步輸出（渲染用） |
| **自訂 AST JSON** | 完整結構、可運算、支援 Reasoning | 需自建解析器、非標準 | **內部運算/推理用** ✅ |

#### 採用策略：雙軌制
```
儲存層: LaTeX (人類可讀、LLM 友善、版控友善)
渲染層: LaTeX → KaTeX/MathJax (前端渲染)
運算層: LaTeX → AST JSON (內部推理、錯誤定位、模型訓練)
```

#### LaTeX 規範
```typescript
// 統一規範
interface LatexStandard {
  // 行內公式
  inline: "$...$";           // 不使用 \( \)
  // 獨立公式
  display: "$$...$$";        // 不使用 \[ \]
  // 矩陣
  matrix: "\\begin{pmatrix}...\\end{pmatrix}";
  // 分段函數
  cases: "\\begin{cases}...\\end{cases}";
  // 禁止
  forbidden: ["\\displaystyle", "\\textstyle", "\\limits", "\\nolimits"];
  
  // 變數命名
  variables: "單字母斜體: $x, y, z$";
  functions: "直立體: \\sin, \\cos, \\log, \\lim";
  constants: "直立體: \\pi, \\mathrm{e}, \\mathrm{i}";
}
```

### 題目內容結構

```typescript
interface QuestionContent {
  // 題幹 (支援多段落、混排)
  stem: {
    latex: string;           // 主要 LaTeX 內容
    markdown?: string;       // 純 Markdown 備份
    astJson?: object;        // 解析後 AST (可選)
  };
  
  // 選項 (選擇題)
  options?: Array<{
    id: string;              // A, B, C, D
    latex: string;
    isCorrect: boolean;
  }>;
  
  // 答案 (非選擇題)
  answer?: {
    latex: string;           // 標準答案 LaTeX
    acceptableForms?: string[]; // 可接受的等價形式
    astJson?: object;
  };
  
  // 解析結構
  solution: {
    steps: SolutionStep[];   // 詳細步驟
    summary: string;         // 一句話摘要
    alternativeMethods?: SolutionStep[][]; // 替代解法
  };
}
```

### Solution Step 結構 (TBD-15)
```typescript
interface SolutionStep {
  stepId: string;              // 全域唯一
  stepNumber: number;          // 1-based
  description: string;         // 自然語言描述
  inputLatex: string;          // 輸入表達式
  operation: {
    type: OperationType;       // 標準化操作類型
    description: string;
    mathematicalRule: string;  // 依據的數學規則/定理
    operands: string[];        // 操作元
    operator: string;          // 運算子符號
  };
  outputLatex: string;         // 輸出表達式
  knowledgePoints: string[];   // KP IDs
  errorPatterns: Array<{       // 可能錯誤
    code: string;
    description: string;
    likelihood: number;        // 0-1
  }>;
  difficulty: 1|2|3|4|5;
  estimatedTimeSeconds: number;
}
```

### OperationType 列舉 (參考 Operation Decomposition)
```typescript
type OperationType = 
  | "DISTRIBUTION"           // 分配律
  | "COMBINE_LIKE_TERMS"     // 合併同類項
  | "TRANSPOSITION"          // 移項
  | "DIVISION"               // 除以係數
  | "MULTIPLICATION"         // 乘以係數
  | "FACTORIZATION"          // 因式分解
  | "SUBSTITUTION"           // 代入
  | "ELIMINATION"            // 消元
  | "SQUARE_ROOT"            // 開根號
  | "QUADRATIC_FORMULA"      // 二次公式
  | "COMPLETING_SQUARE"      // 配方法
  | "VERIFICATION"           // 驗算
  | "CASE_ANALYSIS"          // 分情況討論
  | "GRAPHICAL_INTERPRETATION"; // 圖形解讀
```

---

## 多媒體資料格式

### 圖片
| 用途 | 格式 | 解析度 | 命名規範 |
|------|------|--------|----------|
| 題目圖形 | WebP (lossless) | 最大 1200px 寬 | `img_q_{questionId}_{index}.webp` |
| 幾何圖 | SVG (向量) | 向量無限縮放 | `img_geo_{kpId}_{name}.svg` |
| 統計圖表 | WebP | 最大 800px | `img_chart_{questionId}.webp` |
| 手寫解答 | WebP (lossy q=85) | 原始解析度 | `img_handwritten_{solutionId}.webp` |

**Metadata 嵌入** (EXIF/XMP):
```json
{
  "questionId": "q_123",
  "type": "GEOMETRY_FIGURE",
  "kpIds": ["TRIANGLE_CONGRUENCE"],
  "description": "三角形合同證明圖：△ABC ≅ △DEF",
  "altText": "兩個三角形標示對應邊角相等",
  "license": "COMMERCIAL_FULL"
}
```

### 影片
| 規格 | 標準 |
|------|------|
| 容器 | MP4 (H.264/H.265) |
| 解析度 | 1080p (1920×1080) / 720p 備份 |
| 音訊 | AAC 128kbps 立體聲 |
| 字幕 | WebVTT (內嵌 + 獨立檔) |
| 章節 | MP4 章節標記 / 獨立 JSON |
| 縮圖 | WebP 每 30 秒一張 + 關鍵幀 |

### 音訊 (教學語音/逐字稿)
| 規格 | 標準 |
|------|------|
| 格式 | Opus (WebM) / MP3 備份 |
| 採樣率 | 16kHz (語音足夠) / 44.1kHz (高品質) |
| 位元率 | 32-64 kbps |

---

## 匯入/匯出格式

### 題庫大量匯入 (Excel/CSV 標準欄位)
```csv
questionId,type,stemLatex,optionA,optionB,optionC,optionD,answer,answerLatex,solutionStepsJson,difficulty,source,gradeLevel,kpCodes,tags,license
q_001,SINGLE_CHOICE,"2(x+3)=14","2x+3","2x+6","2x+5","x+6","B","2x+6","[{...}]",2,WORKBOOK,7,"DISTRIBUTIVE_LAW","基礎;分配律",COMMERCIAL_FULL
```

### JSON Lines 串流格式 (大資料處理)
```jsonl
{"questionId":"q_001","type":"SINGLE_CHOICE","stemLatex":"2(x+3)=14",...}
{"questionId":"q_002","type":"FILL_BLANK","stemLatex":"x^2-5x+6=0 解為 x=___",...}
```

---

## 前端渲染資料契約

### API 回應標準化
```typescript
interface QuestionDisplayDTO {
  questionId: string;
  display: {
    stem: { latex: string; html: string };  // HTML 為 KaTeX 渲染後
    options?: Array<{id, latex, html}>;
    answer?: { latex, html };
  };
  interaction: {
    inputType: "RADIO" | "CHECKBOX" | "TEXT" | "LATEX_EDITOR" | "DRAWING";
    validation: {
      required: boolean;
      pattern?: string;       // LaTeX 正則
      acceptableForms?: string[];
    };
  };
  metadata: {
    difficulty: number;
    estimatedTime: number;
    knowledgePoints: Array<{kpId, name, weight}>;
  };
}
```

---

## 相容性與遷移

### 版本控制
```typescript
interface DataVersion {
  formatVersion: "1.0.0";      // 語義化版本
  schemaHash: string;          // JSON Schema SHA256
  migrationScript?: string;    // 從舊版遷移腳本路徑
  deprecatedFields: string[];  // 棄用欄位
  breakingChanges: boolean;
}
```

### 向後相容原則
- 新欄位預設 `optional` 或有合理預設值
- 棄用欄位保留 2 個主版本
- 提供遷移腳本 (單向)
- API 版本化: `/api/v1/`, `/api/v2/`

---

## 相關文檔

- [[06_Data/Training Data|訓練資料總覽]]
- [[06_Data/Dataset Standard|資料集標準]]
- [[06_Data/Data Pipeline|資料處理管線]]
- [[03_Math_Teaching/Math Reasoning|數學推理解析]]
- [[03_Math_Teaching/Operation Decomposition|運算拆解]]
- [[08_Database/Schema|資料庫 Schema]]
- [[13_Decisions/TBD#TBD-14|TBD-14: 題目格式]]
- [[13_Decisions/TBD#TBD-15|TBD-15: Solution Steps]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始格式規範 | 系統架構師 |
# 數學推理研究

> [!IMPORTANT]
> **狀態**：RESEARCH - TBD-15, TBD-16, TBD-17 核心支撐
> **最後更新**：2026-09-10
> **對應決策**：數學推理解析、運算拆解、錯誤類型分類

---

## 研究目標

建立機器可理解、可運算、可教學的數學推理表徵體系，支援：
1. 自動化錯誤定位 - 精確到單一操作步驟
2. AI 引導式教學 - 依錯誤節點給予針對性支架
3. 模型訓練資料 - 高品質 Reasoning Trace
4. Mastery 細粒度計算 - 操作層級掌握度

---

## 核心表徵體系

### 1. Operation Tree (運算樹) - 結構化推理

```typescript
interface OperationNode {
  nodeId: string;
  operationType: OperationType;
  description: string;
  mathematicalRule: string;
  inputLatex: string;
  outputLatex: string;
  inputAST: MathAST;
  outputAST: MathAST;
  knowledgePoints: string[];
  predictedErrorPatterns: Array<{
    code: string;
    description: string;
    likelihood: number;
    studentExample: string;
  }>;
  scaffolds: ScaffoldTemplate;
  children: OperationNode[];
  estimatedTimeSeconds: number;
  difficulty: 1|2|3|4|5;
}

type OperationType = 
  | "DISTRIBUTION"
  | "COMBINE_LIKE_TERMS"
  | "TRANSPOSITION"
  | "DIVISION"
  | "FACTORIZATION"
  | "SUBSTITUTION"
  | "ELIMINATION"
  | "SQUARE_ROOT"
  | "QUADRATIC_FORMULA"
  | "COMPLETING_SQUARE"
  | "VERIFICATION"
  | "CASE_ANALYSIS"
  | "GRAPHICAL_INTERPRETATION";
```

### 範例：2(x+3)=14 的 Operation Tree

```json
{
  "root": {
    "nodeId": "root",
    "operationType": "EQUATION_SOLVING",
    "description": "解一元一次方程式",
    "children": [
      {
        "nodeId": "step1",
        "operationType": "DISTRIBUTION",
        "description": "分配律展開括號",
        "mathematicalRule": "a(b+c) = ab + ac",
        "inputLatex": "2(x+3)",
        "outputLatex": "2x+6",
        "knowledgePoints": ["DISTRIBUTIVE_LAW"],
        "predictedErrorPatterns": [
          {"code": "ALG_DIST_01", "description": "遺漏項次乘法: 2x+3", "likelihood": 0.45},
          {"code": "ALG_DIST_02", "description": "符號錯誤: -2(x-3)=-2x-6", "likelihood": 0.25}
        ]
      },
      {
        "nodeId": "step2",
        "operationType": "TRANSPOSITION",
        "description": "移項隔離變數項",
        "mathematicalRule": "等式兩邊同加/減同一數",
        "inputLatex": "2x+6=14",
        "outputLatex": "2x=8",
        "knowledgePoints": ["TRANSPOSITION"],
        "predictedErrorPatterns": [
          {"code": "ALG_TRANS_01", "description": "移項不變號", "likelihood": 0.50},
          {"code": "ALG_TRANS_03", "description": "運算錯誤: 14-6=20", "likelihood": 0.15}
        ]
      },
      {
        "nodeId": "step3",
        "operationType": "DIVISION",
        "description": "係數歸一",
        "mathematicalRule": "等式兩邊同除以非零數",
        "inputLatex": "2x=8",
        "outputLatex": "x=4",
        "knowledgePoints": ["DIVISION_PROPERTY"],
        "predictedErrorPatterns": [
          {"code": "ALG_COEFF_01", "description": "忘記除係數: x=8", "likelihood": 0.40},
          {"code": "ALG_COEFF_02", "description": "除法錯誤: x=6", "likelihood": 0.25}
        ]
      },
      {
        "nodeId": "step4",
        "operationType": "VERIFICATION",
        "description": "代入驗算",
        "mathematicalRule": "解的定義",
        "inputLatex": "x=4",
        "outputLatex": "2(4+3)=14",
        "knowledgePoints": ["VERIFICATION"]
      }
    ]
  }
}
```

---

## 2. Expression Tree (表達式樹) - 結構比較

### AST 節點類型
```typescript
type MathASTNode = 
  | {type: "NUMBER", value: number}
  | {type: "VARIABLE", name: string, power?: number}
  | {type: "BINARY_OP", op: "+"|"-"|"*"|"/"|"^", left: MathASTNode, right: MathASTNode}
  | {type: "UNARY_OP", op: "-"|"√"|"|", operand: MathASTNode}
  | {type: "FUNCTION", name: "sin"|"cos"|"log"|"abs", args: MathASTNode[]}
  | {type: "FRACTION", numerator: MathASTNode, denominator: MathASTNode}
  | {type: "PARENTHESIS", content: MathASTNode}
  | {type: "EQUATION", left: MathASTNode, right: MathASTNode, operator: "="|"≠"|"<"|">"|"≤"|"≥"}
  | {type: "MATRIX", rows: MathASTNode[][]}
  | {type: "SET", elements: MathASTNode[]};
```

### 樹編輯距離 - 學生答案對齊
```python
def align_student_answer(student_latex: str, expected_steps: List[OperationNode]) -> AlignmentResult:
    student_ast = parse_latex_to_ast(student_latex)
    
    for step in expected_steps:
        expected_ast = parse_latex_to_ast(step.outputLatex)
        distance, operations = tree_edit_distance(student_ast, expected_ast)
        
        if distance == 0:
            return AlignmentResult(matched_step=step.nodeId, match_type="EXACT")
        elif distance < THRESHOLD:
            error_type = classify_edit_operations(operations)
            return AlignmentResult(
                matched_step=step.nodeId,
                match_type="PARTIAL",
                error_analysis=ErrorAnalysis(step=step.nodeId, error_type=error_type)
            )
    
    return AlignmentResult(match_type="NO_MATCH")
```

---

## 3. Mathematical Reasoning Trace (推理軌跡) - 訓練資料標準

### 完整軌跡格式
```json
{
  "traceId": "trace_20260910_001",
  "questionId": "q_linear_eq_001",
  "studentId": "stu_123",
  "timestamp": "2026-09-10T10:30:00Z",
  "problem": "2(x+3)=14",
  "actualTrace": [
    {
      "stepIndex": 0,
      "studentInputLatex": "2(x+3)=14",
      "match": true,
      "type": "INITIAL"
    },
    {
      "stepIndex": 1,
      "studentInputLatex": "2x+3=14",
      "match": false,
      "errorDetected": {
        "operation": "DISTRIBUTION",
        "errorType": "MISSING_MULTIPLICATION",
        "description": "分配律遺漏：2×3 未執行",
        "severity": "CRITICAL"
      },
      "aiIntervention": {
        "triggered": true,
        "promptType": "SCAFFOLD_QUESTION",
        "content": "請仔細看左邊：2 乘以 (x+3)，裡面有兩項，都要乘到喔！"
      }
    }
  ],
  "outcome": "SUCCESS_WITH_GUIDANCE",
  "masteryImpact": {
    "DISTRIBUTIVE_LAW": -5,
    "TRANSPOSITION": +2,
    "DIVISION_PROPERTY": +3
  }
}
```

---

## 自動化推理生成管線

```python
def generate_operation_tree(solution_steps: List[SolutionStep]) -> OperationTree:
    nodes = []
    for i, step in enumerate(solution_steps):
        op_type = classify_operation(step.operation)
        input_ast = parse_latex_to_ast(step.input)
        output_ast = parse_latex_to_ast(step.output)
        
        node = OperationNode(
            nodeId=f"step_{i+1}",
            operationType=op_type,
            description=step.description,
            mathematicalRule=step.operation.mathematicalRule,
            inputLatex=step.input,
            outputLatex=step.output,
            inputAST=input_ast,
            outputAST=output_ast,
            knowledgePoints=step.knowledgePoints,
            predictedErrorPatterns=step.errorPatterns,
            difficulty=step.difficulty
        )
        nodes.append(node)
    
    return OperationTree(root=OperationNode(
        operationType="EQUATION_SOLVING",
        description=f"解 {solution_steps[0].input}",
        children=nodes
    ))
```

---

## 推理能力評測基準

| 維度 | 測試集 | 指標 | 目標 |
|------|--------|------|------|
| 步驟正確率 | 自製 500 題 Solution Steps | 步驟級準確率 | ≥ 95% |
| 錯誤定位率 | 注入 50 種錯誤模式 × 10 題 | 錯誤節點識別率 | ≥ 90% |
| 錯誤分類率 | 同上 | 錯誤代碼正確率 | ≥ 85% |
| 教學支架觸發 | 模擬學生錯誤 → AI 回應 | 正確觸發支架類型 | ≥ 85% |

---

## 研究待解決問題

| 問題 | 狀態 | 優先級 | 可能方案 |
|------|------|--------|----------|
| LaTeX Parser 魯棒性 | RESEARCH | P1 | 容錯 Parser + LLM 修正 + 規則兜底 |
| 手寫數學識別 | RESEARCH | P2 | Mathpix API / 自建模型 / 暫不支援 |
| Tree Edit Distance 效能 | RESEARCH | P1 | APTED 優化、快取、近似演算法 |
| 多步驟推理一致性 | RESEARCH | P1 | 步驟級驗證、回溯修正、MCTS |
| 幾何/圖形推理表徵 | RESEARCH | P2 | GeoGebra JSON + 視覺編碼器 |
| 推理軌跡標準化 | RESEARCH | P1 | JSON Schema、版本化、驗證器 |

---

## 相關文檔

- [[03_Math_Teaching/Math Reasoning|數學推理解析]]
- [[03_Math_Teaching/Operation Decomposition|運算拆解]]
- [[03_Math_Teaching/Error Pattern|錯誤類型分類]]
- [[06_Data/Training Data|訓練資料格式]]
- [[14_Research/AI Model Research|AI 模型研究]]
- [[13_Decisions/TBD#TBD-15|TBD-15: Solution Steps]]
- [[13_Decisions/TBD#TBD-16|TBD-16: Expression Tree]]
- [[13_Decisions/TBD#TBD-17|TBD-17: Reasoning Trace]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始數學推理研究框架 | AI 系統架構師 |
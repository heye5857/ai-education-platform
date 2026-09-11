# 決策日誌 (Decision Log)

> [!IMPORTANT]
> **狀態**：CONFIRMED - 所有列出決策已由相關利害關係人確認
> **最後更新**：2026-09-10
> **維護原則**：新決策追加在下方，絕不刪除或修改歷史決策。如需變更，建立新決策條目並標註取代關係。

---

## 決策記錄格式

| 欄位 | 說明 |
|------|------|
| **ID** | 決策唯一識別碼 (DEC-YYYYMMDD-XXX) |
| **Date** | 決策確認日期 |
| **Decision** | 決策內容 (一句話) |
| **Reason** | 決策理由/背景 |
| **Impact** | 影響範圍 (架構/資料庫/UI/流程/成本/時程) |
| **Status** | CONFIRMED / SUPERSEDED / DEPRECATED |
| **Related** | 相關文檔連結 |

---

## 已確認決策 (22 項)

### DEC-20260910-001: 第一階段採 B2C 模式
- **Date**: 2026-09-10
- **Decision**: 產品第一階段採 B2C 模式，直接面向學生用戶
- **Reason**: 團隊核心優勢在數學教學內容與 AI 教學，B2C 可快速驗證產品市場契合度
- **Impact**: 整體架構、資料庫設計 (無 Organization/Teacher/Class)、商業模式、行銷策略
- **Status**: CONFIRMED
- **Related**: [[10_Business_Model/B2C]], [[08_Database/Schema]]

### DEC-20260910-002: 取消補習班選擇
- **Date**: 2026-09-10
- **Decision**: 註冊流程中移除「選擇補習班」步驟
- **Reason**: B2C 模式下學生直接註冊，補習班屬 B2B 功能，第一階段不開發
- **Impact**: 註冊流程簡化、User/Student 模型無 organization_id、Onboarding 流程縮短
- **Status**: CONFIRMED
- **Related**: [[02_Features/Student Registration Flow]], [[13_Decisions/Deprecated Decisions]]

### DEC-20260910-003: 取消補習班後台
- **Date**: 2026-09-10
- **Decision**: 第一階段不開發補習班管理後台
- **Reason**: 資源集中在核心學習體驗，B2B 功能留待第二階段
- **Impact**: 無 Organization/Teacher/Class/OrganizationMember 資料表、權限系統簡化
- **Status**: CONFIRMED
- **Related**: [[13_Decisions/Deprecated Decisions]], [[08_Database/Schema]]

### DEC-20260910-004: 取消教師後台
- **Date**: 2026-09-10
- **Decision**: 第一階段不開發教師後台功能
- **Reason**: 同補習班後台，屬 B2B 擴充範圍
- **Impact**: 教師角色、班級管理、學生分組等功能延後
- **Status**: CONFIRMED
- **Related**: [[13_Decisions/Deprecated Decisions]]

### DEC-20260910-005: 第一階段完整學習地圖只做數學
- **Date**: 2026-09-10
- **Decision**: 學習地圖 (Course/Unit/Level 完整體系) 僅建構數學科目
- **Reason**: 團隊為數學教學團隊，教學內容專業度與資料皆集中於數學
- **Impact**: 課綱架構、Level 設計、題庫、AI 教學 Prompt、RAG 知識庫皆以數學為核心
- **Status**: CONFIRMED
- **Related**: [[03_Math_Teaching/Math Curriculum]], [[02_Features/Learning Map]]

### DEC-20260910-006: 其他科目未來擴充，目前僅提供 AI 問答
- **Date**: 2026-09-10
- **Decision**: 國文、英文、自然、社會等科目第一階段不建學習地圖，僅提供 AI 問答功能
- **Reason**: 無教學內容資源支撐完整地圖，但 AI 問答可通用
- **Impact**: 多學科架構預留 (Subject 欄位)、AI Prompt 需支援多科目切換
- **Status**: CONFIRMED
- **Related**: [[04_AI/AI Teaching Principles]], [[03_Math_Teaching/Math Curriculum]]

### DEC-20260910-007: 初始能力測驗只在第一次使用
- **Date**: 2026-09-10
- **Decision**: 能力測驗僅在學生註冊/第一次登入時觸發，不定期重測
- **Reason**: 降低用戶阻力，後續透過學習行為持續更新 Mastery
- **Impact**: Assessment 觸發邏輯、學生狀態機、重測入口保留但非強制
- **Status**: CONFIRMED
- **Related**: [[02_Features/Initial Assessment]], [[02_Features/Mastery System]]

### DEC-20260910-008: 能力測驗不阻擋學習地圖進入
- **Date**: 2026-09-10
- **Decision**: 學生可跳過或未完成能力測驗直接進入學習地圖
- **Reason**: 避免流失，能力測驗為輔助定位非強制門檻
- **Impact**: Onboarding 流程分支、首頁進入邏輯、預設 Level 解鎖規則
- **Status**: CONFIRMED
- **Related**: [[02_Features/Initial Assessment]], [[02_Features/Learning Map]]

### DEC-20260910-009: Level 採一關一關制 (Course → Unit → Level)
- **Date**: 2026-09-10
- **Decision**: 學習地圖結構為三層：Course (如「一元一次方程式」) → Unit → Level (Level 1-4)
- **Reason**: 符合數學教學漸進邏輯，便於追蹤掌握度與設計測驗
- **Impact**: 資料模型 (Course/Unit/Level)、前端地圖渲染、解鎖邏輯、進度顯示
- **Status**: CONFIRMED
- **Related**: [[03_Math_Teaching/Math Curriculum]], [[02_Features/Learning Map]], [[08_Database/Schema]]

### DEC-20260910-010: Level 包含影片 + Interactive Cards
- **Date**: 2026-09-10
- **Decision**: 每個 Level 核心內容為教學影片，影片特定時間點跳出互動卡片
- **Reason**: 影片為主要教學媒介，互動卡片強化參與度與即時回饋
- **Impact**: 影片播放器需支援時間觸發、Card 類型系統 (思考/問答/小問題/教學互動)、學習行為記錄
- **Status**: CONFIRMED
- **Related**: [[02_Features/Level System]], [[07_Website/Video Player]]

### DEC-20260910-011: 影片完成 + Level 測驗通過 = 解鎖下一 Level
- **Date**: 2026-09-10
- **Decision**: Level 通過條件為「影片觀看完成」且「Level 測驗達通過分數」
- **Reason**: 確保教學內容吸收與測驗驗證雙重保障
- **Impact**: 進度追蹤邏輯、解鎖條件判斷、重考機制、Mastery 獨立計算
- **Status**: CONFIRMED
- **Related**: [[02_Features/Level System]], [[02_Features/Mastery System]]

### DEC-20260910-012: Level 測驗可無限重考
- **Date**: 2026-09-10
- **Decision**: 學生可無限次重考 Level 測驗，直到通過
- **Reason**: 鼓勵精熟導向學習，降低挫折感
- **Impact**: QuestionAttempt 記錄每次作答、抽題演算法需支援重考不重複、Mastery 計算需處理多次嘗試
- **Status**: CONFIRMED
- **Related**: [[02_Features/Level System]], [[02_Features/Wrong Question System]]

### DEC-20260910-013: Level 出題採內容定義 + 題庫抽題
- **Date**: 2026-09-10
- **Decision**: Level 定義需測驗的知識點與內容範圍，從題庫依條件篩選隨機抽題
- **Reason**: 平衡教學大綱一致性與題目多樣性，支援重考不重複
- **Impact**: LevelQuestion 關聯表、抽題演算法 (知識點/難度/類型)、題庫標籤體系
- **Status**: CONFIRMED
- **Related**: [[02_Features/Level System]], [[08_Database/Schema]], [[03_Math_Teaching/Math Curriculum]]

### DEC-20260910-014: 記錄所有錯題 (QuestionAttempt + WrongQuestion)
- **Date**: 2026-09-10
- **Decision**: 建立兩層錯題記錄：QuestionAttempt (每次作答) + WrongQuestion (匯總錯題)
- **Reason**: Attempt 保留完整作答軌跡供 AI 分析；WrongQuestion 供學生複習與系統統計
- **Impact**: 資料模型雙表設計、同步機制、錯誤分析管線、AI Context 注入
- **Status**: CONFIRMED
- **Related**: [[02_Features/Wrong Question System]], [[08_Database/Schema]], [[04_AI/Student Memory]]

### DEC-20260910-015: 建立 Wrong Question Bank
- **Date**: 2026-09-10
- **Decision**: 系統維護學生個人錯題庫，支援複習、相似題推薦、錯誤模式分析
- **Reason**: 錯題為個人化教學核心資產
- **Impact**: 複習介面、間隔重複算法、AI 相似題生成、錯誤類型統計
- **Status**: CONFIRMED
- **Related**: [[02_Features/Wrong Question System]], [[04_AI/AI Teaching Principles]]

### DEC-20260910-016: AI 採引導式教學 (蘇格拉底式)
- **Date**: 2026-09-10
- **Decision**: AI 不直接給答案，而是引導學生思考：理解程度 → 詰問 → 依回應續引導 → 完成 → 推薦類似題
- **Reason**: 核心價值為「教學」而非「解題」，培養獨立思考能力
- **Impact**: Prompt 設計、對話狀態機、教學策略引擎、評估學生回應品質
- **Status**: CONFIRMED
- **Related**: [[04_AI/AI Teaching Principles]], [[02_Features/AI Chat]]

### DEC-20260910-017: AI 依年級、程度、歷程個人化
- **Date**: 2026-09-10
- **Decision**: AI 回答根據學生年級、當前學習狀態、對話歷史、錯題、Mastery 動態調整
- **Reason**: 真正的個人化教學需理解學習者完整脈絡
- **Impact**: Student Learning Profile 建構、Context 注入策略、Prompt 模板化、記憶檢索
- **Status**: CONFIRMED
- **Related**: [[04_AI/Student Memory]], [[02_Features/AI Chat]], [[02_Features/Mastery System]]

### DEC-20260910-018: 每個學生獨立 AI Memory (Conversation + Message)
- **Date**: 2026-09-10
- **Decision**: 學生擁有獨立對話歷史與記憶，絕不共用
- **Reason**: 隱私合規、個人化精準度、教學連續性
- **Impact**: Conversation/Message 資料隔離、RAG 檢索範圍限制、記憶壓縮策略
- **Status**: CONFIRMED
- **Related**: [[04_AI/Student Memory]], [[08_Database/Schema]], [[11_Security/AI Data Privacy]]

### DEC-20260910-019: AI 核心模型目標：自訓練/微調開源模型
- **Date**: 2026-09-10
- **Decision**: 長期目標建立自有數學教學模型，不永久依賴商業 API (OpenAI, Claude 等)
- **Reason**: 成本控制、資料主權、領域特化能力、競爭護城河
- **Impact**: 模型選型研究、GPU 基建、Fine-tuning 管線、部署架構、License 合規
- **Status**: CONFIRMED
- **Related**: [[04_AI/AI Model Strategy]], [[14_Research/AI Model Research]]

### DEC-20260910-020: 可使用可商業化開源模型 (Llama, Qwen, DeepSeek, etc.)
- **Date**: 2026-09-10
- **Decision**: 採用允許商業使用的開源模型作為基座進行 Fine-tuning / Domain Training
- **Reason**: 加速開發、降低從零訓練風險、社群生態支援
- **Impact**: License 審查 (Apache 2.0, Llama 3 Community License 等)、模型能力評測、中文/數學/推理基準
- **Status**: CONFIRMED
- **Related**: [[04_AI/AI Model Strategy]], [[14_Research/Open-source Model License Research]]

### DEC-20260910-021: 擁有授權教學資料 (課本、習作、試題、講義、影片)
- **Date**: 2026-09-10
- **Decision**: 已取得補習班授權的近四年國高中教材、習作、歷屆試題、講義、題庫、教師解答、教學影片
- **Reason**: 核心訓練資料與 RAG 知識庫來源已就緒
- **Impact**: 資料管線設計、格式標準化、版權管理、資料量約數 TB 需分散式處理
- **Status**: CONFIRMED
- **Related**: [[06_Data/Training Data]], [[06_Data/Data Pipeline]], [[05_RAG/RAG Architecture]]

### DEC-20260910-022: 以數學為第一階段核心 MVP
- **Date**: 2026-09-10
- **Decision**: 所有功能開發優先級以數學學習體驗為準，其他科目為延伸
- **Reason**: 資源集中、專業深度、差異化競爭優勢
- **Impact**: 路線圖優先序、團隊分工、KPI 設定、對外溝通訊息
- **Status**: CONFIRMED
- **Related**: [[12_Development/Roadmap]], [[03_Math_Teaching/Math Curriculum]]

---

## 決策追蹤矩陣

| 決策 ID | 影響模組 | 相關 TBD | 後續行動 |
|---------|----------|----------|----------|
| DEC-001 | 全系統 | - | 執行 B2C 路線圖 |
| DEC-002,003,004 | Auth, DB, AuthZ | - | 確認 Schema 無 B2B 欄位 |
| DEC-005,006 | Curriculum, AI | TBD-06 | 數學優先，其他科目預留介面 |
| DEC-007,008 | Assessment, Onboarding | TBD-01 | 設計跳過機制與預設 Level |
| DEC-009 | Curriculum, Map, DB | - | 實作三層結構 |
| DEC-010 | Video, Card, Tracking | - | 設計播放器事件系統 |
| DEC-011 | Progress, Test, Mastery | TBD-03 | 解鎖邏輯獨立於 Mastery |
| DEC-012 | Test, Attempt, Mastery | TBD-03 | 重考不重複抽題演算法 |
| DEC-013 | Level, Question Bank | TBD-03 | LevelQuestion 關聯設計 |
| DEC-014 | Attempt, WrongQ, AI | TBD-02 | 雙表同步機制 |
| DEC-015 | Review, AI, Analytics | TBD-02 | 間隔重複 + 相似題 |
| DEC-016 | AI Chat, Prompt | TBD-04 | 教學策略狀態機 |
| DEC-017 | AI Chat, Profile, Memory | TBD-08 | Context 建構管線 |
| DEC-018 | Memory, Privacy, RAG | TBD-08 | 隔離架構設計 |
| DEC-019 | Model, Infra, Cost | TBD-06 | 模型評測啟動 |
| DEC-020 | Model, Legal, Infra | TBD-06 | License 審查清單 |
| DEC-021 | Data, RAG, Training | TBD-07 | 資料管線 MVP |
| DEC-022 | All Features | - | 數學優先排程 |

---

## 變更歷史

| 日期 | 變更類型 | 決策 ID | 說明 |
|------|----------|---------|------|
| 2026-09-10 | 初始建立 | DEC-001 ~ DEC-022 | 專案啟動時確認的 22 項核心決策 |

> **下一步**：所有新決策請依格式追加至此文件，並同步更新 [[13_Decisions/TBD|待決定事項]] 與 [[00_Home/Project Dashboard|專案儀表板]]
# 已取消決策 (Deprecated Decisions)

> [!IMPORTANT]
> **狀態**：DEPRECATED - 曾經確認但已正式取消
> **原則**：記錄決策變更歷程，**絕不刪除**。未來如需恢復，可參考原始理由重新評估。

---

## 已取消項目清單 (6 項)

### DEP-001: 註冊流程包含「選擇補習班」
- **原決策日期**: 早期規劃階段
- **取消日期**: 2026-09-10
- **原決策內容**: 學生註冊時需選擇所屬補習班，建立 Organization 關聯
- **取消原因**: 確定第一階段採 B2C 模式，學生直接註冊無補隸屬關係
- **取代決策**: [[13_Decisions/Decision Log#DEC-20260910-002|DEC-20260910-002]]
- **影響範圍**: 註冊流程、User/Student 模型、資料庫 Schema、權限系統
- **未來恢復條件**: B2B/B2B2C 階段啟動時，需重新設計 Organization 架構

### DEP-002: 建立補習班管理後台
- **原決策日期**: 早期規劃階段
- **取消日期**: 2026-09-10
- **原決策內容**: 開發補習班管理員後台：學生管理、班級管理、學習報表、收費管理
- **取消原因**: 資源集中於核心學習體驗 (B2C)；B2B 功能留待驗證 PMF 後擴充
- **取代決策**: [[13_Decisions/Decision Log#DEC-20260910-003|DEC-20260910-003]]
- **影響範圍**: 完整後台架構、RBAC 權限、Organization/Teacher/Class 資料表、計費系統
- **未來恢復條件**: B2B 階段正式啟動，有種子客戶確認需求

### DEP-003: 建立教師後台
- **原決策日期**: 早期規劃階段
- **取消日期**: 2026-09-10
- **原決策內容**: 教師可建立班級、派發作業、查看學生學習狀況、批改作業
- **取消原因**: 同補習班後台，屬 B2B 擴充範圍；第一階段無教師角色
- **取代決策**: [[13_Decisions/Decision Log#DEC-20260910-004|DEC-20260910-004]]
- **影響範圍**: Teacher 模型、Class/Student 分組、作業系統、批改介面、通知系統
- **未來恢復條件**: B2B 階段，教師為關鍵決策者/使用者時

### DEP-004: Organization (機構/補習班) 實體
- **原決策日期**: 早期規劃階段
- **取消日期**: 2026-09-10
- **原決策內容**: 資料庫建立 Organization 表，支援多租戶架構
- **取消原因**: B2C 無機構概念，單一租戶架構簡化開發與維運
- **取代決策**: [[13_Decisions/Decision Log#DEC-20260910-001|DEC-20260910-001]] + [[13_Decisions/Decision Log#DEC-20260910-003|DEC-20260910-003]]
- **影響範圍**: 資料庫 Schema (無 organization_id)、Row Level Security 簡化、計費模型
- **未來恢復條件**: B2B 階段需多租戶隔離時，重新設計 Multi-tenancy 架構

### DEP-005: Class (班級) 實體
- **原決策日期**: 早期規劃階段
- **取消日期**: 2026-09-10
- **原決策內容**: 學生屬於班級，教師管理班級，支援班級排名、班級作業
- **取消原因**: 無教師/補習班，班級概念不存在
- **取代決策**: [[13_Decisions/Decision Log#DEC-20260910-004|DEC-20260910-004]]
- **影響範圍**: Student 無 class_id、無班級排行榜、無班級作業派發
- **未來恢復條件**: B2B 階段教師需管理學生群組時

### DEP-006: OrganizationMember (機構成員) 實體
- **原決策日期**: 早期規劃階段
- **取消日期**: 2026-09-10
- **原決策內容**: 補習班/機構成員管理 (老師、助教、行政、學生)，角色權限矩陣
- **取消原因': 無 Organization，自然無成員關係
- **取代決策**: [[13_Decisions/Decision Log#DEC-20260910-003|DEC-20260910-003]]
- **影響範圍**: RBAC 簡化為 User/Student 兩角色
- **未來恢復條件**: B2B 階段多角色權限需求出現時

---

## 取消決策影響矩陣

| 取消項目 | 直接影響資料表 | 直接影響功能 | 程式碼清理需求 |
|----------|----------------|--------------|----------------|
| DEP-001 | Student (移除 organization_id) | 註冊 Onboarding | 移除選擇補習班 UI、API |
| DEP-002 | Organization, Teacher, Class, OrganizationMember | 後台管理、報表 | 確認 Schema 無此類表 |
| DEP-003 | Teacher, Class, Assignment | 教師功能、班級管理 | 確認 Schema 無此類表 |
| DEP-004 | Organization | 多租戶、計費 | 確認 Schema 無此表 |
| DEP-005 | Class, Student.class_id | 班級功能、排名 | 確認 Schema 無此表 |
| DEP-006 | OrganizationMember | 角色權限矩陣 | 簡化 AuthZ 為兩角色 |

---

## 遺留架構預留 (Future-Proofing)

雖然上述功能取消，但架構設計時應預留擴充點：

### 1. User 模型預留
```prisma
model User {
  id            String    @id @default(cuid())
  email         String    @unique
  // 未來 B2B 擴充預留
  // organizationId String?
  // organization   Organization? @relation(fields: [organizationId], references: [id])
  // role         UserRole  @default(STUDENT) // STUDENT | TEACHER | ADMIN | SUPER_ADMIN
  student       Student?
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt
}
```

### 2. 獨立 AuthZ 服務
- 當前：簡單的 `isStudent` / `isAdmin` 檢查
- 未來：引入 Casbin / OPA / 自建 RBAC 服務，支援 Organization/Class 範圍權限

### 3. 多租戶資料隔離策略
- 當前：單租戶，無隔離需求
- 未來：Schema-based (PostgreSQL Schema) 或 Row-level Security (RLS) 或 Application-level

---

## 經驗教訓

> [!NOTE]
> **決策變更成本分析**：
> - 早期取消 (規劃階段) 成本極低：僅文檔更新
> - 若在開發中取消：需重構 Schema、API、UI、測試
> - 若在上線後取消：需資料遷移、用戶通知、法律合規
>
> **教訓**：在寫代碼前完成核心商業模式決策，避免沉沒成本。

---

## 相關文檔

- [[13_Decisions/Decision Log|決策日誌]] - 取代決策記錄
- [[08_Database/Schema|資料庫 Schema]] - 確認無 B2B 相關表
- [[12_Development/Roadmap|開發路線圖]] - Phase 1-10 無 B2B 功能
- [[10_Business_Model/B2C|B2C 策略]] - 商業模式定義

---

## 更新記錄

| 日期 | 變更 | 說明 |
|------|------|------|
| 2026-09-10 | 初始建立 6 項取消決策 | 對應 DEC-001 至 DEC-004 確認 |
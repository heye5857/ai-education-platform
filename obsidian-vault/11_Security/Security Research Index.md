# 安全研究專區 - 索引

> [!IMPORTANT]
> **狀態**：RESEARCH - 各主題待詳細展開
> **最後更新**：2026-09-10

---

## 研究主題清單

| 編號 | 主題 | 優先級 | 狀態 | 負責人 | 完成目標 |
|------|------|--------|------|--------|----------|
| SEC-01 | Google OAuth 實作細節與安全強化 | P0 | 📋 規劃中 | 後端工程師 | Phase 2 前 |
| SEC-02 | Session 管理與 Token 安全 | P0 | 📋 規劃中 | 後端工程師 | Phase 2 前 |
| SEC-03 | 密碼/憑證管理 (未來擴充) | P2 | 📋 規劃中 | - | Phase 3+ |
| SEC-04 | 資料庫安全 (RLS、加密、備份) | P0 | 📋 規劃中 | DBA/後端 | Phase 1-2 |
| SEC-05 | API 安全 (Rate Limiting、輸入驗證、CORS) | P0 | 📋 規劃中 | 後端工程師 | Phase 1-2 |
| SEC-06 | 學生資料隔離與多租戶架構預留 | P1 | 📋 規劃中 | 架構師 | Phase 1 |
| SEC-07 | AI 對話隱私保護 (Context 隔離、輸出過濾) | P0 | 📋 規劃中 | AI 工程師 | Phase 7 前 |
| SEC-08 | 輸入驗證與 SQL Injection 防護 | P0 | 📋 規劃中 | 後端工程師 | Phase 1 |
| SEC-09 | XSS 防護 (CSP、輸出編碼、框架特性) | P0 | 📋 規劃中 | 前端工程師 | Phase 1 |
| SEC-10 | CSRF 防護 (SameSite、雙重提交、NextAuth 內建) | P0 | 📋 規劃中 | 全端工程師 | Phase 2 |
| SEC-11 | 密鑰管理 (KMS、輪換、HSM、金鑰分級) | P1 | 📋 規劃中 | DevOps/架構師 | Phase 1-2 |
| SEC-12 | 安全監控與告警 (SIEM、異常偵測、審計日誌) | P1 | 📋 規劃中 | DevOps/安全工程師 | Phase 10 前 |
| SEC-13 | 滲透測試與紅隊演練計畫 | P2 | 📋 規劃中 | 外包/內部 | Phase 10 前 |
| SEC-14 | 災難恢復與業務連續性 (RPO/RTO、演練) | P1 | 📋 規劃中 | DevOps/架構師 | Phase 10 前 |
| SEC-15 | 供應鏈安全 (依賴掃描、SBOM、簽名驗證) | P1 | 📋 規劃中 | DevOps | Phase 1-2 |
| SEC-16 | 隱私權影響評估 (DPIA) 完整報告 | P0 | 📋 規劃中 | 法務/架構師 | Phase 7 前 |
| SEC-17 | 法規合規對應表 (個資法/GDPR/COPPA) | P0 | 📋 規劃中 | 法務 | Phase 1 |

---

## 快速參考：OWASP Top 10 對應

| OWASP Top 10 (2021) | 我方對應措施 | 狀態 |
|---------------------|--------------|------|
| **A01: Broken Access Control** | RLS、RBAC、Middleware 驗證、API 權限檢查 | 📋 規劃中 |
| **A02: Cryptographic Failures** | TLS 1.3、TDE、欄位加密、KMS 管理金鑰 | 📋 規劃中 |
| **A03: Injection** | Prisma Parameterized Query、Zod 驗證、輸入清洗 | 📋 規劃中 |
| **A04: Insecure Design** | 威脅建模、安全設計審查、預設安全 | 📋 規劃中 |
| **A05: Security Misconfiguration** | IaC 掃描、預設拒絕、最小權限、自動化檢查 | 📋 規劃中 |
| **A06: Vulnerable Components** | Dependabot/Snyk、SBOM、定期更新、鎖定版本 | 📋 規劃中 |
| **A07: Authentication Failures** | NextAuth.js、MFA 規劃、Rate Limit、Session 管理 | 📋 規劃中 |
| **A08: Software/Data Integrity** | CI/CD 簽名驗證、SBOM、不可變部署、供應鏈掃描 | 📋 規劃中 |
| **A09: Logging/Monitoring Failures** | 結構化日誌、Sentry、Grafana、告警、審計日誌 | 📋 規劃中 |
| **A10: SSRF** | 無伺服器端發起外部請求 (或嚴格允許清單+驗證) | 📋 規劃中 |

---

## 安全開發生命週期 (SDL) 整合

| 階段 | 安全活動 | 產出物 |
|------|----------|--------|
| **需求/設計** | 威脅建模 (STRIDE)、隱私影響評估 (DPIA) | 威脅模型文檔、DPIA 報告 |
| **開發** | 安全編碼規範、Code Review 檢查清單、SAST 整合 | 安全編碼指南、PR 模板 |
| **測試** | DAST、IAST、滲透測試、依賴掃描、Fuzzing | 測試報告、修補驗證 |
| **部署** | 基礎設施掃描、密鑰注入、最小權限、不可變部署 | 部署清單、合規證明 |
| **營運** | 監控告警、事件回應、定期滲透測試、紅隊演練 | 事件回應手冊、演練報告 |

---

## 關鍵安全決策記錄

| 決策 | 內容 | 理由 | 狀態 |
|------|------|------|------|
| **認證框架** | NextAuth.js v5 | Next.js 原生、成熟、Edge 相容 | ✅ 確認 |
| **資料庫加密** | PostgreSQL TDE + pg_tde | 透明、效能影響小、雲端原生 | 📋 規劃中 |
| **金鑰管理** | 1Password CLI (開發) + AWS KMS (生產) | 開發體驗好、生產級安全 | 📋 規劃中 |
| **WAF** | Vercel Firewall + Cloudflare (可選) | 零維運、Edge 防護 | 📋 規劃中 |
| **密碼雜湊** | Argon2id (未來密碼登入) | 記憶體硬化、抗 GPU 破解 | 📋 規劃中 |
| **API 版本控制** | URL Path `/api/v1/` + Header 協商 | 明確、可追蹤、向後相容 | 📋 規劃中 |

---

## 相關文檔

- [[11_Security/Authentication Security|認證安全]]
- [[11_Security/Student Data Security|學生資料安全]]
- [[11_Security/AI Data Privacy|AI 資料隱私]]
- [[13_Decisions/TBD#TBD-21|TBD-21: GDPR/個資法]]
- [[13_Decisions/TBD#TBD-22|TBD-22: Rate Limiting]]
- [[13_Decisions/TBD#TBD-23|TBD-23: Secrets Management]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始安全研究索引 | 系統架構師 |
# 認證安全

> [!IMPORTANT]
> **狀態**：RESEARCH - 待詳細實作規劃
> **最後更新**：2026-09-10

---

## 認證架構

```mermaid
flowchart TB
    subgraph CLIENT[客戶端]
        BROWSER[瀏覽器]
        COOKIE[HttpOnly Secure Cookie\nJWT Access Token]
        LS[LocalStorage\nRefresh Token (加密)]
    end
    
    subgraph EDGE[邊緣層]
        MW[NextAuth Middleware\nJWT 驗證 + 簽名檢查]
        RATE[Rate Limiter\n登入/註冊/Token 刷新]
    end
    
    subgraph AUTH[認證服務\nNextAuth.js v5]
        GOOGLE[Google OAuth 2.0\nOpenID Connect]
        JWT_SIGN[JWT 簽發\nRS256 / EdDSA]
        JWT_VERIFY[JWT 驗證\nJWKS 快取]
        SESSION[Session 管理\nRedis 儲存]
    end
    
    subgraph STORAGE[儲存層]
        REDIS[(Redis\nSession + Rate Limit)]
        PG[(PostgreSQL\nUser + Account)]
    end
    
    BROWSER --> MW
    MW -->|驗證失敗| RATE
    MW -->|驗證成功| API
    MW -->|需刷新| AUTH
    AUTH --> GOOGLE
    AUTH --> JWT_SIGN
    AUTH --> SESSION
    SESSION --> REDIS
    AUTH --> PG
```

---

## Google OAuth 實作細節

### 設定參數
```typescript
// lib/auth/config.ts
export const authConfig = {
  providers: [
    GoogleProvider({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          scope: "openid email profile",
          access_type: "offline",
          prompt: "consent",
        },
      },
    }),
  ],
  
  // JWT 策略
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 天
    updateAge: 24 * 60 * 60,   // 24 小時刷新一次
  },
  
  // JWT 簽名
  jwt: {
    signingKey: process.env.AUTH_JWT_PRIVATE_KEY, // RS256 私鑰
    verificationKey: process.env.AUTH_JWT_PUBLIC_KEY, // RS256 公鑰
    // 或使用 EdDSA (更小、更快)
  },
  
  // 回調處理
  callbacks: {
    async signIn({ user, account, profile }) {
      // 建立/更新 User + Student
      // 檢查 email 是否已存在
      // 新用戶觸發 Onboarding
      return true;
    },
    async jwt({ token, account, user }) {
      // 初次登入：存入 userId, studentId, role
      // 刷新：驗證學生是否仍存在、未被封鎖
      return token;
    },
    async session({ session, token }) {
      // 將 token 內容映射到 session
      session.user.id = token.sub;
      session.user.studentId = token.studentId;
      session.user.role = token.role;
      return token;
    },
  },
  
  // 頁面
  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
    newUser: "/onboarding/profile",
  },
  
  // 安全
  events: {
    async signIn({ user, isNewUser }) {
      // 記錄登入日誌、裝置指紋
    },
    async signOut({ token }) {
      // Redis 刪除 Session、撤銷 Refresh Token
    },
  },
};
```

### OAuth 流程安全強化
| 風險 | 緩解措施 |
|------|----------|
| **State 參數缺失** | NextAuth 內建強制 state、PKCE |
| **重導向 URI 攻擊** | 嚴格允許清單、環境變數配置 |
| **Token 洩漏** | Access Token 僅存在 Server、不回傳前端 |
| **帳號枚舉** | 統一錯誤訊息「帳號或密碼錯誤」 |
| **CSRF** | SameSite=Lax Cookie、雙重提交 Cookie 模式 |

---

## JWT 設計

### Token 結構
```json
{
  "header": {
    "alg": "RS256",
    "typ": "JWT",
    "kid": "key-2026-01"
  },
  "payload": {
    "sub": "user_cuid",
    "studentId": "student_cuid",
    "email": "student@example.com",
    "role": "STUDENT",
    "grade": 8,
    "semester": 1,
    "iat": 1725900000,
    "exp": 1726000000,
    "jti": "unique-token-id",
    "sid": "session_cuid"
  }
}
```

### 金鑰管理
| 操作 | 週期 | 方式 |
|------|------|------|
| **金鑰輪換** | 每 90 天 | 新舊金鑰並行 24h、JWKS 自動更新 |
| **私鑰儲存** | - | 1Password / AWS KMS / GCP KMS / Infisical |
| **公鑰分發** | - | `/.well-known/jwks.json` 端點、快取 1h |
| **緊急撤銷** | - | 立即輪換、清空 Redis Session、強制全體重新登入 |

### Token 存儲策略
| Token 類型 | 儲存位置 | 安全屬性 | 過期 |
|------------|----------|----------|------|
| **Access Token (JWT)** | HttpOnly Secure Cookie | `Secure; HttpOnly; SameSite=Lax; Path=/` | 15-30 分鐘 |
| **Refresh Token** | HttpOnly Secure Cookie (不同路徑) 或 LocalStorage (加密) | `Secure; HttpOnly; SameSite=Strict; Path=/auth/refresh` | 30 天 |
| **CSRF Token** | Cookie + Header 雙重 | `SameSite=Lax` | Session 期間 |

---

## Session 管理

### Redis Session 結構
```redis
# Key: session:{sessionId}
# TTL: 30 天 (滑動續期)
{
  "userId": "user_cuid",
  "studentId": "student_cuid",
  "deviceFingerprint": "sha256:...",
  "ip": "203.0.113.45",
  "userAgent": "Mozilla/5.0...",
  "createdAt": "2026-09-10T10:00:00Z",
  "lastActivityAt": "2026-09-10T10:30:00Z",
  "isRevoked": false
}

# Key: user_sessions:{userId} -> Set(sessionId)
# 用於: 查詢用戶所有會話、強制登出所有裝置
```

### 並發會話控制
| 政策 | 參數 | 執行 |
|------|------|------|
| **最大並發會話** | 3-5 個 | 超過時刪除最舊 (或拒絕新登入) |
| **異地登入偵測** | IP 地理位置差異 > 500km | 通知用戶、要求確認 |
| **裝置信任** | 可選：信任裝置免驗 30 天 | 裝置指紋 + 簽名 |

### 登出與撤銷
```typescript
// 登出類型
type LogoutType = 
  | "CURRENT_DEVICE"      // 僅當前裝置
  | "ALL_DEVICES"         // 全部裝置 (修改密碼/安全事件)
  | "ADMIN_REVOKE"        // 管理員強制登出
  | "SECURITY_EVENT";     // 密碼洩漏/帳號異常

// 執行邏輯
async function revokeSessions(userId: string, type: LogoutType, excludeSessionId?: string) {
  const sessions = await getUserSessions(userId);
  for (const session of sessions) {
    if (session.id === excludeSessionId) continue;
    if (type === "CURRENT_DEVICE" && session.id !== currentSessionId) continue;
    
    await redis.del(`session:${session.id}`);
    await redis.srem(`user_sessions:${userId}`, session.id);
    // 加入撤銷清單 (JWT 黑名單)
    await redis.setex(`revoked_token:${session.jwtId}`, session.ttl, "1");
  }
}
```

---

## 密碼/憑證管理 (未來擴充)

> **目前僅 Google OAuth**，密碼登入為 Phase 2+ 規劃

### 規劃規格
| 項目 | 標準 |
|------|------|
| **雜湊演算法** | Argon2id (memory=64MB, iterations=3, parallelism=4) |
| **最小長度** | 12 字元 |
| **複雜度** | 無強制 (NIST 建議)，但提供強度計量器 |
| **歷史密碼** | 禁止最近 5 組 |
| **洩漏檢查** | HaveIBeenPwned API (k-anonymity) |
| **重設流程** | Email 連結 + 時效 1小時 + 單次使用 |

---

## 多因子認證 (MFA) - Phase 3+

| 因子 | 實作 | 優先級 |
|------|------|--------|
| **TOTP (Authenticator App)** | RFC 6238、QR Code 註冊、備用代碼 | P1 |
| **WebAuthn / Passkey** | FIDO2、生物辨識/安全金鑰 | P2 |
| **簡訊 OTP** | 僅備用、成本高、SIM Swap 風險 | P3 |

---

## 審計日誌

```typescript
interface AuthAuditLog {
  id: string;
  userId: string;
  event: "SIGN_IN" | "SIGN_OUT" | "SIGN_UP" | "PASSWORD_CHANGE" | "MFA_ENABLE" | "MFA_DISABLE" | "DEVICE_TRUST" | "SESSION_REVOKE" | "FAILED_ATTEMPT";
  ip: string;
  userAgent: string;
  deviceFingerprint: string;
  location?: {country, city, lat, lon};
  riskScore: number;        // 0-100
  riskFactors: string[];    // ["NEW_DEVICE", "NEW_LOCATION", "VELOCITY_ANOMALY"]
  actionTaken: "ALLOW" | "CHALLENGE" | "BLOCK" | "NOTIFY";
  metadata: Record<string, any>;
  createdAt: DateTime;
}
```

---

## 相關文檔

- [[11_Security/Authorization|授權控制]]
- [[11_Security/Student Data Security|學生資料安全]]
- [[11_Security/AI Data Privacy|AI 資料隱私]]
- [[11_Security/Secrets Management|密鑰管理]]
- [[13_Decisions/TBD#TBD-21|TBD-21: GDPR/個資法]]
- [[13_Decisions/TBD#TBD-22|TBD-22: Rate Limiting]]
- [[13_Decisions/TBD#TBD-23|TBD-23: Secrets Management]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始認證安全設計 | 系統架構師 |
# 首頁設計

> [!IMPORTANT]
> **狀態**：PROPOSED - TBD-10 待決定完整 Button 清單
> **最後更新**：2026-09-10
> **核心決策**：[[13_Decisions/Decision Log#DEC-20260910-008|DEC-008]] 首頁至少三大入口

---

## 頁面定位

> **首頁 = 學生的個人化學習儀表板**
> **核心功能**：三大入口 + 進度摘要 + 快速行動

---

## 頁面佈局

```typescript
interface HomepageLayout {
  // 頂部：歡迎 + 目前年級/學期
  header: {
    greeting: string;           // "早安，小明！"
    gradeSemester: string;      // "國二上學期"
    streakDays: number;         // 連續學習天數
  };
  
  // 三大核心入口 (TBD-10 可能擴充)
  mainActions: [
    {label: "學習地圖", icon: "map", href: "/map", badge: "3/12 Units"},
    {label: "AI 問答", icon: "message-circle", href: "/chat", badge: null},
    {label: "個人資料", icon: "user", href: "/profile", badge: null}
  ];
  
  // 進度摘要卡片
  progressCards: [
    {title: "目前 Level", value: "L2-3", subtitle: "一元一次方程式 進階應用"},
    {title: "Mastery 平均", value: "68%", subtitle: "較上週 +5%"},
    {title: "待複習錯題", value: "12", subtitle: "3 題急需複習"},
  ];
  
  // 快速行動
  quickActions: [
    {label: "繼續學習", href: "/level/current", icon: "play"},
    {label: "複習錯題", href: "/wrong-questions?filter=due", icon: "rotate-ccw"},
    {label: "問 AI 老師", href: "/chat/new", icon: "message-circle"}
  ];
  
  // 底部：公告/活動/版本資訊
  footer: Announcement[];
}
```

---

## 三大核心入口 (DEC-008 確認)

| 入口 | 圖示 | 路由 | Badge 顯示 | 優先級 |
|------|------|------|------------|--------|
| **學習地圖** | 🗺️ Map | `/map` | 完成進度 (如 "3/12 Units") | P0 |
| **AI 問答** | 💬 MessageCircle | `/chat` | 無 / 未讀訊息數 | P0 |
| **個人資料** | 👤 User | `/profile` | 無 | P0 |

> **TBD-10 待決定**: 是否新增「錯題本」、「學習分析」作為第四、第五入口

### 入口卡片設計
```jsx
// 響應式卡片網格
<div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
  <ActionCard 
    icon={MapIcon}
    title="學習地圖"
    subtitle="繼續一元一次方程式 Level 3"
    progress={65}
    href="/map"
    badge="3/12 Units"
  />
  <ActionCard 
    icon={MessageCircleIcon}
    title="AI 問答"
    subtitle="隨時提問，專屬數學老師"
    href="/chat"
  />
  <ActionCard 
    icon={UserIcon}
    title="個人資料"
    subtitle="國二上學期 · 連續 7 天"
    href="/profile"
  />
</div>
```

---

## 進度摘要卡片

| 卡片 | 數據來源 | 顯示邏輯 | 視覺化 |
|------|----------|----------|--------|
| **目前 Level** | `LearningProgress` (IN_PROGRESS) | 顯示 "Unit 名稱 Level N" | Level 卡片縮圖 + 進度環 |
| **Mastery 平均** | `StudentKnowledgePoint` 平均分 | 所有 KP masteryScore 平均 | 數字大字 + 趨勢箭頭 (較上週) |
| **待複習錯題** | `WrongQuestion` (nextReviewAt <= now) | 計數 + 急需複習標記 (紅點) | 數字 + "3 題急需複習" 紅字 |

### 進度卡片視覺規格
```css
/* 進度卡片統一規格 */
.progress-card {
  @apply bg-white rounded-xl p-6 shadow-sm border border-gray-100 
         hover:shadow-md transition-shadow duration-200;
}
.progress-value {
  @apply text-3xl font-bold text-gray-900;
}
.progress-subtitle {
  @apply text-sm text-gray-500 mt-1;
}
.progress-trend-positive {
  @apply text-green-600 text-sm font-medium;
}
.progress-trend-negative {
  @apply text-red-600 text-sm font-medium;
}
```

---

## 快速行動區

| 行動 | 觸發條件 | 行為 | 圖示 |
|------|----------|------|------|
| **繼續學習** | 有 IN_PROGRESS Level | 直接跳轉至該 Level 學習頁 | ▶️ Play |
| **複習錯題** | 有到期待複習錯題 | 跳轉錯題本並自動篩選「待複習」 | 🔄 RotateCcw |
| **問 AI 老師** | 無條件 | 新建 AI 對話 | 💬 MessageCircle |
| **查看分析** | TBD-09 確認後 | 跳轉學習分析頁 | 📊 BarChart |
| **設定目標** | 未來功能 | 開啟目標設定 Modal | 🎯 Target |

---

## 空狀態設計 (新用戶)

### Onboarding 完成、尚未開始學習
```jsx
<div className="text-center py-12">
  <Illustration src="/empty-state-welcome.svg" />
  <h2 className="text-xl font-semibold mt-4">歡迎來到你的學習旅程！</h2>
  <p className="text-gray-600 mt-2">從學習地圖開始，一關一關解鎖數學新知識吧</p>
  <Button className="mt-6" href="/map" size="lg">
    開始探索學習地圖
  </Button>
</div>
```

### 已完成所有可用內容
```jsx
<div className="text-center py-12">
  <CelebrationIllustration />
  <h2 className="text-xl font-semibold mt-4">太棒了！你已完成所有目前開放的內容</h2>
  <p className="text-gray-600 mt-2">新單元正在準備中，敬請期待</p>
  <Button variant="outline" className="mt-6" href="/wrong-questions">
    複習錯題鞏固基礎
  </Button>
</div>
```

---

## 響應式斷點

| 斷點 | 版面調整 | 關鍵變化 |
|------|----------|----------|
| **Mobile** (<640px) | 單欄垂直堆疊、底部固定導航列 | 三大入口變大按鈕、進度卡片單欄 |
| **Tablet** (640-1024px) | 兩欄 (左: 入口+進度、右: 快速行動+公告) | 入口卡片並排、進度卡片兩欄 |
| **Desktop** (>1024px) | 三欄 (左: 入口、中: 進度、右: 快速行動+公告) | 完整三欄佈局、側邊固定 |

---

## 個人化動態內容

### 問候語變化
| 時間 | 問候語範例 |
|------|------------|
| 05:00-10:00 | "早安，{name}！今天也要加油喔！" |
| 10:00-14:00 | "午安，{name}！適合複習一下錯題" |
| 14:00-18:00 | "下午好，{name}！繼續昨天的 Level 嗎？" |
| 18:00-22:00 | "晚安，{name}！今天學習辛苦了" |
| 22:00-05:00 | "夜貓子 {name}？別忘了休息喔" |

### 動態建議
| 情況 | 建議文案 |
|------|----------|
| 有急需複習錯題 | "有 3 道錯題到了複習時間，現在複習效果最好！" |
| 連續 3 天未登入 | "好久不見！一元一次方程式 Level 3 還在等你" |
| Mastery 有顯著提升 | "你的分配律 Mastery 從 45 升到 68，進步超大！" |
| 完成單元 | "恭喜通關一元一次方程式！下一站：二次函數" |

---

## 相關文檔

- [[02_Features/Learning Map|學習地圖]]
- [[02_Features/AI Chat|AI 問答]]
- [[02_Features/Wrong Question System|錯題系統]]
- [[02_Features/Learning Analysis|學習分析]]
- [[09_UI_UX/Sitemap|網站地圖]]
- [[13_Decisions/TBD#TBD-10|TBD-10: 首頁 Button]]

---

## 更新記錄

| 日期 | 版本 | 變更 | 作者 |
|------|------|------|------|
| 2026-09-10 | v1.0 | 初始首頁設計 | 產品架構師 |
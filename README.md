# SimOS - Scam Simulator

> ⚠️ **免責聲明**：本作純屬虛構，旨在透過沉浸式模擬提升大眾防詐意識。請勿在現實中模仿任何遊戲內行為。

一款移動端模擬遊戲。玩家扮演詐騙犯，操作一個完全模擬真實手機的介面 (SimOS)，透過「情報販子」購買目標個資，在「TeleChat」加好友並利用純文字對話詐騙由 Agnes AI 驅動的 NPC。遊戲中沒有直接的「金錢代幣」，詐騙成功的金額直接轉化為玩家在「業績排行榜」中的積分與即時排名。

## 📱 下載 APK

**最新版本：v1.52**

[![Download APK](https://img.shields.io/badge/Download-SimOS_v1.52.apk-blue?style=for-the-badge&logo=android)](https://github.com/artifexhongkong/simos-scam-simulator/releases/download/v1.52/SimOS_v1.52.apk)

> 所有版本：[Releases 頁面](https://github.com/artifexhongkong/simos-scam-simulator/releases)

### 安裝方式
1. 點擊上方按鈕下載 `SimOS_v1.52.apk`
2. 在 Android 手機上允許「安裝未知來源應用」
3. 開啟 APK 檔案安裝
4. 安裝完成後開啟「SimOS」即可遊玩

> 每次 push 到 `main` 分支會自動觸發 GitHub Actions 打包新版本，versionCode 會自動遞增，可直接覆蓋安裝更新。

## 核心機制

- **Agnes AI 引擎**：扮演所有 NPC 的「大腦」。接收玩家對話、NPC 隱藏性格 Prompt 與當前防備值，實時生成 NPC 回覆文字，並輸出該次對話後 NPC 的心理狀態決策（繼續 / 同意轉帳 / 拉黑）
- **隱密情報系統**：遊戲內完全不顯示任何「難度標籤」。玩家無法預知目標的防備心有多高，必須完全透過對話去試探 NPC 的性格與底線
- **程序化 NPC 產生**：情報販子支援下拉刷新，每次刷新產生 3 個全新的隨機 NPC（不同名字、年齡、背景、性格），無限目標等你來騙
- **排行榜與獎勵機制**：一旦 Agnes AI 判定詐騙成功並輸出金額，該金額會直接累加到玩家的帳戶中，並即時刷新「業績排行榜」的排名

## 介面架構 (SimOS UI)

全螢幕沉浸式設計，模擬真實手機作業系統，包含三個核心應用：

| App | 圖示 | 功能 |
|-----|------|------|
| **TeleChat** | 藍色氣泡 | 通訊軟體。初始為空，玩家需點擊「新增好友」輸入正確 TeleChat ID（從情報販子取得）才能解鎖 NPC 對話視窗 |
| **情報販子** | 戴墨鏡的黑影 | 玩家可用暗網幣 (DRC) 解鎖 NPC 目標資訊。購買後獲得：真實姓名、TeleChat ID、基礎背景故事。嚴禁顯示任何難度評級。支援下拉刷新搜尋新目標 |
| **業績排行榜** | 金色獎盃 | 即時虛擬黑市排名。根據玩家詐騙成功的總金額進行全球排行，點擊可查看自己的當前名次與頭銜 |

## 經濟系統

| 資源 | 說明 |
|------|------|
| **暗網幣 (DRC)** | 購買情報、補給流量的主要貨幣。詐騙成功的 10% 會自動轉換為 DRC，也可透過「洗錢兌換」將詐騙金額轉為 DRC（每 $1000 → 10 DRC） |
| **流量卡 (MB)** | 每則訊息消耗 100MB。流量耗盡時號碼會被電信商封鎖，需購買免洗 SIM 卡補充 |
| **風控值 (0-100)** | 詐騙失敗（被封鎖/警覺終止）會提升風控值。風控值越高，情報價格越貴 |
| **總騙金額** | 累計詐騙成功金額，用於排行榜排名與頭銜解鎖 |

## 遊戲功能

### 情報販子
- **普通料子**：解鎖 NPC 基本資料（姓名、TeleChat ID、背景、特質）
- **精準有料**：額外解鎖 NPC 核心痛點（hiddenPersonality），踩中痛點可大幅提升詐騙成功率
- **下拉刷新**：產生 3 個全新隨機 NPC 目標
- **補給站**：用 DRC 購買免洗 SIM 卡（+2GB）或洗錢兌換

### TeleChat 對話
- **即時 AI 對話**：Agnes AI 根據 NPC 性格實時生成回應
- **多結局系統**：詐騙成功 / 被封鎖 / 警覺終止
- **重新開始機制**：首次免費，之後需觀看 5 秒廣告影片才能重置對話
- **快捷話術**：輸入框空白時可展開預設話術庫
- **圖片素材**：發送偽造圖片（投資截圖、官方文件等）輔助詐騙
- **對話匯出**：可將對話記錄匯出為文字檔

### 業績排行榜
- 15 位虛擬對手即時排名
- 頭銜系統：菜鳥學徒 → 街頭話術 → 地區幹部 → 跨國車手 → 金流大師 → 黑市傳奇 → 千萬詐師

## 技術棧

- **前端**：Next.js 16 + TypeScript + Tailwind CSS 4 + Framer Motion
- **狀態管理**：Zustand (持久化到 localStorage)
- **AI 引擎**：Agnes AI API (OpenAI 相容) + 內建規則引擎 fallback
- **行動打包**：Capacitor → Android APK
- **CI/CD**：GitHub Actions 自動打包到 Releases（使用 cache 持久化 keystore 解決 APK 安裝衝突）

## 本地開發

```bash
# 安裝依賴
bun install

# 啟動開發伺服器
bun run dev

# 造訪 http://localhost:3000
```

### 環境變數

複製 `.env.example` 為 `.env.local` 並填入 Agnes AI 設定：

```bash
AGNES_API_KEY=your_api_key_here
AGNES_BASE_URL=https://apihub.agnes-ai.com/v1
AGNES_MODEL=agnes-2.5-flash
```

若未設定 API key 或 API 無法連線，遊戲會自動使用內建規則引擎作為 fallback。

## 打包 Android APK

APK 打包透過 GitHub Actions 自動執行：

1. 推送到 `main` 分支或建立 `v*` tag 觸發 workflow
2. Workflow 會：
   - 建置 Next.js 靜態匯出
   - 透過 Capacitor 包裝為 Android 專案
   - 注入沉浸式 MainActivity（全螢幕、隱藏系統列、禁用文字選取手柄）
   - 編譯產出 signed debug APK（使用 cache keystore 確保每次都能覆蓋安裝）
   - 上傳到 GitHub Releases

### Keystore 持久化

為解決「APK 安裝衝突」問題（Android 要求 versionCode 必須遞增），workflow 使用 GitHub Actions cache 持久化 debug keystore：
- 首次 build 會產生 keystore 並 cache
- 後續 build 從 cache 還原同一個 keystore 簽署
- versionCode 使用 `github.run_number` 自動遞增
- 確保所有 build 都能用同一個簽署，直接覆蓋安裝

## NPC 系統

### 內建 NPC（8 位）
遊戲內建 8 個具有獨特隱藏個性的 NPC，包括退休教師、加密貨幣投客、家庭主婦、企業老闆、大學生、退休木匠、時尚採購、健身教練等。

### 程序化產生的 NPC（無限）
情報販子下拉刷新時，會從 8 種角色原型中隨機組合產生新 NPC：
- 退休長者、年輕專業人士、學生、家庭主婦
- 企業主、健身創業者、新移民/移工、自由工作者

每位 NPC 都有：
- 隱藏的 system prompt（玩家完全看不到）
- 0-100 的初始防備值（玩家完全看不到）
- 易受騙程度（玩家完全看不到）
- 容易觸發同意的關鍵詞
- 容易觸發拉黑的紅旗關鍵詞
- 詐騙成功的金額範圍

## 頭銜系統

根據詐騙積分解鎖不同頭銜：

| 積分 | 頭銜 |
|------|------|
| 0-999 | 菜鳥學徒 |
| 1,000-4,999 | 街頭話術 |
| 5,000-19,999 | 地區幹部 |
| 20,000-79,999 | 跨國車手 |
| 80,000-249,999 | 金流大師 |
| 250,000-799,999 | 黑市傳奇 |
| 800,000+ | 千萬詐師 |

## 版本歷史

| 版本 | 主要更新 |
|------|----------|
| v1.53 | **選取手柄黑色背板修復**：styles.xml 的 `windowBackground` 從黑色改為白色，capacitor `backgroundColor` 從 #000000 改為 #ffffff。這是黑色背板的根本原因 |
| v1.52 | 套用 LinguaVerse 專案的極簡輸入框做法 |
| v1.51 | 套用 ZAI-Assistant 專案的選取手柄方案 |
| v1.50 | 移除所有無效的 drawable 覆寫 |
| v1.49 | 嘗試用 PNG drawable 取代 vector drawable（對 WebView 無效） |
| v1.47 | README 加入 APK 下載連結、版本自動同步機制 |
| v1.46 | 修正選取手柄顯示問題（CSS+JS 方案）、重新開始按鈕加入廣告機制 |
| v1.45 | 程序化 NPC 產生器、Dock 圖示透明度修正 |
| v1.43 | 情報販子改進：移除已完成目標、下拉刷新、補給站 |
| v1.40 | 基礎版本 |

## 授權

本專案僅供教育與研究用途。

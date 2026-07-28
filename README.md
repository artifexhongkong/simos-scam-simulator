# SimOS - Scam Simulator

> ⚠️ **免責聲明**：本作純屬虛構，旨在透過沉浸式模擬提升大眾防詐意識。請勿在現實中模仿任何遊戲內行為。

一款移動端模擬遊戲。玩家扮演詐騙犯，操作一個完全模擬真實手機的介面 (SimOS)，透過「情報販子」購買目標個資，在「TeleChat」加好友並利用純文字對話詐騙由 Agnes AI 驅動的 NPC。遊戲中沒有直接的「金錢代幣」，詐騙成功的金額直接轉化為玩家在「業績排行榜」中的積分與即時排名。

## 核心機制

- **Agnes AI 引擎**：扮演所有 NPC 的「大腦」。接收玩家對話、NPC 隱藏性格 Prompt 與當前防備值，實時生成 NPC 回覆文字，並輸出該次對話後 NPC 的心理狀態決策（繼續 / 同意轉帳 / 拉黑）
- **隱密情報系統**：遊戲內完全不顯示任何「難度標籤」。玩家無法預知目標的防備心有多高，必須完全透過對話去試探 NPC 的性格與底線
- **排行榜與獎勵機制**：一旦 Agnes AI 判定詐騙成功並輸出金額，該金額會直接累加到玩家的帳戶中，並即時刷新「業績排行榜」的排名

## 介面架構 (SimOS UI)

全螢幕沉浸式設計，模擬真實手機作業系統，包含三個核心應用：

| App | 圖示 | 功能 |
|-----|------|------|
| **TeleChat** | 藍色氣泡 | 通訊軟體。初始為空，玩家需點擊「新增好友」輸入正確 TeleChat ID（從情報販子取得）才能解鎖 NPC 對話視窗 |
| **情報販子** | 戴墨鏡的黑影 | 玩家可用情報點數解鎖 NPC 目標資訊。購買後獲得：真實姓名、TeleChat ID、基礎背景故事。嚴禁顯示任何難度評級 |
| **業績排行榜** | 金色獎盃 | 即時虛擬黑市排名。根據玩家詐騙成功的總金額進行全球排行，點擊可查看自己的當前名次與頭銜 |

## 技術棧

- **前端**：Next.js 16 + TypeScript + Tailwind CSS 4 + Framer Motion
- **狀態管理**：Zustand (持久化到 localStorage)
- **AI 引擎**：Agnes AI API (OpenAI 相容) + 內建規則引擎 fallback
- **行動打包**：Capacitor → Android APK
- **CI/CD**：GitHub Actions 自動打包到 Releases

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
AGNES_BASE_URL=https://api.agnes.ai/v1
AGNES_MODEL=agnes-pro
```

若未設定 API key 或 API 無法連線，遊戲會自動使用內建規則引擎作為 fallback。

## 打包 Android APK

APK 打包透過 GitHub Actions 自動執行：

1. 推送到 `main` 分支或建立 `v*` tag 觸發 workflow
2. Workflow 會：
   - 建置 Next.js 靜態匯出
   - 透過 Capacitor 包裝為 Android 專案
   - 編譯產出 debug 或 signed APK
   - 上傳到 GitHub Releases

### 簽署金鑰（可選）

如需產出已簽署的 release APK，請在 GitHub repo 設定以下 Secrets：

| Secret | 說明 |
|--------|------|
| `SIGNING_KEY_BASE64` | keystore 檔案的 base64 編碼 |
| `KEYSTORE_PASSWORD` | keystore 密碼 |
| `KEY_ALIAS` | key 別名 |
| `KEY_PASSWORD` | key 密碼 |

產生 keystore：
```bash
keytool -genkey -v -keystore simos.keystore -alias simos -keyalg RSA -keysize 2048 -validity 10000
base64 -i simos.keystore > keystore.b64
```

未設定 Secrets 時，會自動產生 debug APK。

## NPC 陣容

遊戲內建 8 個具有獨特隱藏個性的 NPC，包括退休教師、加密貨幣投客、家庭主婦、企業老闆、大學生、退休木匠、時尚採購、健身教練等。每位 NPC 都有：

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

## 授權

本專案僅供教育與研究用途。

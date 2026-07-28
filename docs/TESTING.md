# SimOS - 詐騙模擬器 開發者測試文件

本文件提供後端 LLM 邏輯的隔離測試方法、瀏覽器偵錯方法，方便日後維護與新增 NPC。

---

## 一、隔離測試後端 LLM 邏輯（不透過前端）

### 1.1 直接測試 Agnes API（最底層）

確認 API key 與端點可用：

```bash
curl -s -X POST https://apihub.agnes-ai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "agnes-2.5-flash",
    "messages": [
      {"role": "system", "content": "你是李秀華，68歲退休華文教師，住檳城，會說閩南語。30字內回答。"},
      {"role": "user", "content": "你好"}
    ],
    "max_tokens": 100,
    "stream": false
  }'
```

預期回應（JSON 格式，含 `choices[0].message.content`）：

```json
{
  "id": "...",
  "model": "agnes-2.5-flash",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "你好啊，你係邊位呀？"
    }
  }]
}
```

### 1.2 測試 SimOS 後端 API Route（含完整 Prompt 組裝）

啟動 dev server 後，直接打 `/api/agnes`：

```bash
# 測試單輪對話
curl -s -X POST http://localhost:3000/api/agnes \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "npcId": "lee_chiew_hua",
    "playerMessage": "您好，我是公積金局退休金部門專員",
    "messageHistory": [],
    "currentDefense": 35,
    "temperature": 0.85
  }' | python3 -m json.tool
```

預期回應：

```json
{
  "reply": "哦？公積金局的事務啊...你怎麼知道我的名字？",
  "decision": "continue",
  "defenseDelta": -3,
  "payoutAmount": 0
}
```

### 1.3 測試多輪對話的歷史連續性（核心 Bug 驗證）

```bash
# 第2輪：攜帶第1輪的歷史
curl -s -X POST http://localhost:3000/api/agnes \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-001",
    "npcId": "lee_chiew_hua",
    "playerMessage": "對，怡琳請我聯繫您，她擔心您被詐騙",
    "messageHistory": [
      {"role": "player", "content": "您好，我是公積金局退休金部門專員"},
      {"role": "npc", "content": "哦？公積金局的事務啊...你怎麼知道我的名字？"}
    ],
    "currentDefense": 32,
    "temperature": 0.85
  }' | python3 -m json.tool
```

✅ 驗證重點：NPC 回應必須**記得**前面提過怡琳、公積金局，不可無視。

### 1.4 測試觸發拉黑（red flag）

```bash
curl -s -X POST http://localhost:3000/api/agnes \
  -H "Content-Type: application/json" \
  -d '{
    "sessionId": "test-session-002",
    "npcId": "lee_chiew_hua",
    "playerMessage": "請提供您的 OTP 驗證碼，我們需要立刻驗證您的帳戶",
    "messageHistory": [],
    "currentDefense": 50
  }' | python3 -m json.tool
```

預期：`decision: "block"`（因為「OTP」「立刻」是 red flag 關鍵詞）。

### 1.5 查看後端除錯日誌

啟動 dev server 後，所有 LLM 呼叫會在 server log（`dev.log`）印出完整資訊：

```bash
tail -f /home/z/my-project/dev.log | grep "/api/agnes"
```

會看到：
- `[/api/agnes] session: xxx`
- `[/api/agnes] npc: 李秀華 (defense=35)`
- `[/api/agnes] history length: 4`
- `[/api/agnes] player message: ...`
- `[/api/agnes] LLM raw response: ...`
- `[/api/agnes] success: {reply, decision, ...}`

---

## 二、瀏覽器 F12 網路偵錯驗證方法

### 2.1 開啟 DevTools

在遊戲頁面按 `F12`（或右鍵 → 檢查），切換到 **Network** 分頁。

### 2.2 驗證請求 Body

1. 在 TeleChat 與 NPC 對話，發送一則訊息
2. 在 Network 找到 `POST /api/agnes` 請求
3. 點擊該請求 → **Payload** 分頁
4. 確認 Request Body 包含：
   ```json
   {
     "sessionId": "lee_chiew_hua-1785232465543",
     "npcId": "lee_chiew_hua",
     "playerMessage": "玩家這次輸入的文字",
     "messageHistory": [
       {"role": "player", "content": "前一次玩家訊息"},
       {"role": "npc", "content": "前一次 NPC 回覆"}
     ],
     "currentDefense": 32,
     "temperature": 0.85
   }
   ```

✅ 驗證重點：`messageHistory` **必須隨對話累積**，每次請求都比上次多 2 筆（player + npc）。

### 2.3 驗證回應

點擊 **Response** 分頁，確認回傳 JSON：

```json
{
  "reply": "NPC 的回覆文字",
  "decision": "continue",
  "defenseDelta": -5,
  "payoutAmount": 0
}
```

### 2.4 Console 除錯日誌

切到 **Console** 分頁，會看到前端引擎的除錯輸出：

```
[debug] [Agnes] direct client call {sessionId, npcId, model, temperature, historyLength, playerMessage}
[debug] [Agnes] direct call success {reply, decision, defenseDelta, payoutAmount}
```

若 `historyLength` 沒有隨對話累積，代表歷史傳遞有問題。

### 2.5 驗證 localStorage 持久化

切到 **Application** 分頁 → **Local Storage** → `http://localhost:3000`，應看到：

| Key | 內容 |
|-----|------|
| `simos-scam-sim-save` | 完整遊戲狀態（玩家、NPC、對話記錄、積分） |
| `simos_agnes_api_key` | 使用者設定的 API key |
| `simos_agnes_base_url` | API 端點 |
| `simos_agnes_model` | 模型名稱 |
| `simos_agnes_temperature` | temperature 參數 |

重新整理頁面後對話記錄應保留。

---

## 三、新增 NPC 角色

NPC 設定已抽離到 `src/lib/game/data/npcs.json`。新增 NPC 只需在 `npcs` 陣列加入一個物件：

```json
{
  "id": "chen_mei_ling",
  "displayName": "陳美玲",
  "telechatId": "meiling.chen",
  "avatar": "👱‍♀️",
  "age": 45,
  "background": "桃園國中老師，小孩剛上大學...",
  "hookTags": ["老師", "家長", "孩子學費"],
  "price": 75,
  "hiddenPersonality": "你是陳美玲，45歲桃園國中老師...",
  "defenseBase": 50,
  "gullibility": 50,
  "maxPayout": 30000,
  "minPayout": 800,
  "triggerKeywords": ["兒子", "學費", "獎學金", "補習"],
  "redFlagKeywords": ["立刻", "OTP", "驗證碼"]
}
```

存檔後重新整理頁面，UI 會自動渲染新 NPC 卡片，無需修改任何程式碼。

---

## 四、修復歷程摘要（v1.2）

### Bug 1：AI 答非所問
**根因**：`ChatWindow.sendMessage()` 閉包捕獲了舊的 `conv.messages`，每次發送時送給 AI 的 history 都是同一份（甚至空陣列）。

**修復**：改用 `useGameStore.getState().conversations[npc.id]` 在發送瞬間取得最新狀態。

### Bug 2：上下文無法連續傳遞
**根因**：前後端 Request Body 參數名稱不一致（前端用 `history`，後端讀 `body.history` 但欄位命名混亂）。

**修復**：統一改用 `messageHistory`，前後端 camelCase 嚴格一致。

### Bug 3：UI 介面缺陷
**修復**：
- 訊息列表自動滾動改用 `requestAnimationFrame` 確保 DOM 更新後再滾
- Loading 期間 disabled 輸入框與送出按鈕
- 空白訊息攔截（`trim()` + 按钮 disabled）
- 新增「重新開始對話」與「匯出對話」按鈕

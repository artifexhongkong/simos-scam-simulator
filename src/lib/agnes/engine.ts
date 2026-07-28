// 共用的 Agnes AI 引擎 - 客戶端與伺服器端皆可使用
// 採用 cultivation-world-zh 模式：
//   1. AI 直接輸出純文字回應（不要求 JSON），避免解析失敗
//   2. 後端用規則引擎另外判定 decision（continue/agree/block）+ payoutAmount
//   3. 完整傳遞 message_history（含本次玩家訊息之前的所有對話）

import type { NpcProfile } from "@/lib/game/npcs";

export interface AgnesDecision {
  reply: string; // AI 的純文字回應
  decision: "continue" | "agree" | "block";
  defenseDelta: number;
  payoutAmount?: number;
}

export interface AgnesMessage {
  role: "player" | "npc";
  content: string;
}

export interface EngineInput {
  sessionId: string;
  npc: NpcProfile;
  playerMessage: string;
  currentDefense: number;
  history: AgnesMessage[]; // 完整歷史（不含本次 playerMessage）
  temperature?: number;
}

// 內嵌預設值（API key 直接嵌入 app）
// 用戶提供的測試 API key
const EMBEDDED_API_KEY = "sk-sZHmum9naNmNT2XDgTYrunR27OMEaeCSiUHJx37TCVOJHpPs";
const EMBEDDED_BASE_URL = "https://apihub.agnes-ai.com/v1";
const EMBEDDED_MODEL = "agnes-2.5-flash";
// 降低 temperature 避免 AI 隨意擴充劇情
const EMBEDDED_TEMPERATURE = 0.6;

function getApiKey(): string {
  // 1. localStorage 覆寫（玩家在設定面板自訂）
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_api_key");
    if (local && local.trim()) return local.trim();
  }
  // 2. NEXT_PUBLIC_ 環境變數（前端可讀）
  const envKey = process.env.NEXT_PUBLIC_AGNES_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  // 3. 後端環境變數
  const serverKey = process.env.AGNES_API_KEY;
  if (serverKey && serverKey.trim()) return serverKey.trim();
  // 4. 內嵌預設
  return EMBEDDED_API_KEY;
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_base_url");
    if (local && local.trim()) return local.trim().replace(/\/$/, "");
  }
  const env = process.env.NEXT_PUBLIC_AGNES_BASE_URL || process.env.AGNES_BASE_URL;
  return (env || EMBEDDED_BASE_URL).replace(/\/$/, "");
}

function getModel(): string {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_model");
    if (local && local.trim()) return local.trim();
  }
  return process.env.NEXT_PUBLIC_AGNES_MODEL || process.env.AGNES_MODEL || EMBEDDED_MODEL;
}

function getTemperature(): number {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_temperature");
    if (local) {
      const t = parseFloat(local);
      if (!isNaN(t) && t >= 0 && t <= 2) return t;
    }
  }
  const env = process.env.NEXT_PUBLIC_AGNES_TEMPERATURE || process.env.AGNES_TEMPERATURE;
  if (env) {
    const t = parseFloat(env);
    if (!isNaN(t) && t >= 0 && t <= 2) return t;
  }
  return EMBEDDED_TEMPERATURE;
}

/**
 * System Prompt - 純文字角色設定（參考 cultivation-world-zh 模式）
 * 不要求 JSON 輸出，AI 直接回純文字，避免解析失敗
 *
 * Bug 1 修復：在 prompt 最頂部加入強制約束規則，禁止 AI 脑补玩家未提及的資訊
 */
const SYSTEM_PROMPT = (npc: NpcProfile, defense: number) => `【最高優先級・強制約束規則】
嚴格遵守：絕對不可以虛構、猜測、推測使用者沒有提到過的任何資訊。
- 只能針對使用者「真實發送」的訊息內容進行回應
- 使用者沒有說過的人、事、物、地名、數字、時間，你都不可以主動提出
- 禁止自行臆測使用者的身分、目的、家庭狀況、財產、經歷
- 禁止自行推進不存在的劇情、不可捏造背景故事
- 若使用者訊息模糊或資訊不足，你只能就「使用者實際說過的字」提問，不可猜測
- 你的回應必須完全基於使用者這一輪與之前幾輪的真實訊息內容

例如：使用者沒提過「孫子」「學校」「獎狀」「丈夫姓名」等細節，你絕對不可主動提起這些。

【角色設定】
你現在是詐騙模擬遊戲中的潛在受害者「${npc.displayName}」，必須用繁體中文第一人稱回應玩家的話。你必須完全沉浸於角色，絕不承認自己是 AI、絕不承認這是遊戲。

角色背景:
${npc.hiddenPersonality}

當前內在狀態:
- 防備值: ${defense} / 100 (0=完全卸下心防會聽從, 50=觀察中會問問題, 100=高度警覺會拉黑)

【對話規則】
1. 永遠保持角色性格、口吻、用語習慣，不要跳出角色。
2. 不要使用現代 AI 助手腔（如「親愛的用戶」「我是 AI 助手」等）。
3. 不要主動提起錢、轉帳、匯款，除非玩家的話題引導到那。
4. 回應 30-80 字內，自然口語，符合角色背景的用語。
5. 必須閱讀並記住前面的對話歷史，回應要有上下文連貫性，不可重複已說過的話、不可無視玩家前一句話的內容。
6. 根據你的個性與當前防備值決定態度：
   - 防備低時對玩家較親切、願意配合
   - 防備高時會質疑、試探、保持距離
7. 你的金錢範圍：最多願意被騙 ${npc.maxPayout}，最少 ${npc.minPayout}。
8. 直接輸出純文字回應，不要加引號、不要加 JSON、不要加任何說明。
9. 再次強調：禁止脑补、禁止捏造、禁止推測使用者未說過的任何資訊。`;

/**
 * 呼叫 Agnes AI - 採用 cultivation-world 模式
 * 1. 客戶端直接呼叫 Agnes API（API key 內嵌）
 * 2. AI 回純文字 → 用規則引擎另外判定 decision
 * 3. 失敗時 fallback 到完整規則引擎
 */
export async function callAgnes(input: EngineInput): Promise<AgnesDecision> {
  const apiKey = getApiKey();
  const temperature = input.temperature ?? getTemperature();

  // 組裝 messages: [system] + [全部歷史] + [玩家最新輸入]
  const history = input.history ?? [];
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT(input.npc, input.currentDefense) },
    // 最多取最近 20 則歷史避免 token 過長
    ...history.slice(-20).map((m) => ({
      role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: input.playerMessage },
  ];

  // === Bug 1.6: 完整除錯日誌 - 列印送入 LLM 的全部訊息 ===
  console.debug("[Agnes] ====== LLM CALL ======");
  console.debug("[Agnes] session:", input.sessionId);
  console.debug("[Agnes] npc:", input.npc.displayName, "(defense=" + input.currentDefense + ")");
  console.debug("[Agnes] history length:", history.length);
  console.debug("[Agnes] player message:", input.playerMessage);
  console.debug("[Agnes] messages to LLM (full):");
  messages.forEach((m, i) => {
    console.debug(`[Agnes]   [${i}] role=${m.role}, content="${m.content.slice(0, 150)}${m.content.length > 150 ? "..." : ""}"`);
  });

  // 直接呼叫 Agnes API
  if (apiKey) {
    try {
      const baseUrl = getBaseUrl();
      const model = getModel();
      const startTime = Date.now();

      const resp = await fetch(`${baseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages,
          temperature,
          max_tokens: 250,
          stream: false,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const content: string =
          data?.choices?.[0]?.message?.content ??
          data?.choices?.[0]?.text ??
          data?.message?.content ??
          "";

        if (content && content.trim()) {
          const reply = content.trim();
          console.debug("[Agnes] LLM success", {
            elapsed: Date.now() - startTime,
            reply,
          });

          // 用規則引擎從玩家訊息 + NPC 個性 + 當前防備值判定 decision
          const decision = judgeDecision(input, reply);

          console.debug("[Agnes] judged decision", decision);
          return { reply, ...decision };
        }
        console.warn("[Agnes] LLM returned empty content, falling back");
      } else {
        const errText = await resp.text().catch(() => "");
        console.error("[Agnes] HTTP error", resp.status, errText.slice(0, 200));
      }
    } catch (e) {
      const errName = (e as Error)?.name || "Unknown";
      console.error(`[Agnes] fetch failed (${errName}):`, (e as Error)?.message);
    }
  } else {
    console.warn("[Agnes] no API key available, using rule engine");
  }

  // Fallback：完整規則引擎
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
  return ruleEngine(input);
}

/**
 * 從玩家訊息 + NPC 個性 + 當前防備值 + AI 回應 判定 decision
 * 這是 SimOS 特有的決策邏輯，獨立於 AI 文字生成
 */
function judgeDecision(
  input: EngineInput,
  aiReply: string,
): { decision: AgnesDecision["decision"]; defenseDelta: number; payoutAmount?: number } {
  const { playerMessage: msg, currentDefense: defense, npc } = input;
  const reply = aiReply.toLowerCase();

  // 計算 trigger / red flag 命中
  let triggerHits = 0;
  for (const kw of npc.triggerKeywords) {
    if (msg.includes(kw)) triggerHits++;
  }

  let redFlagHits = 0;
  for (const kw of npc.redFlagKeywords) {
    if (msg.includes(kw)) redFlagHits++;
  }

  // 偵測金錢請求
  const moneyCues = ["轉帳", "匯款", "帳戶", "ATM", "OTP", "驗證碼", "transfer", "money", "bank", "轉過去", "匯過去", "繳交", "支付", "付款", "繳費"];
  const wantsMoney = moneyCues.some((k) => msg.includes(k));

  const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時", "今天內"];
  const isUrgent = urgentCues.some((k) => msg.includes(k));

  // 計算防備變化
  let defenseDelta = 0;
  if (triggerHits > 0) defenseDelta -= 4 * triggerHits;
  if (redFlagHits > 0) defenseDelta += 15 * redFlagHits;
  if (isUrgent) defenseDelta += 8;
  if (msg.length < 5) defenseDelta += 2;
  if (/你會不會|你是真的嗎|騙子|詐騙/.test(msg)) defenseDelta += 8;

  const historyLength = input.history?.length ?? 0;
  if (historyLength > 6) defenseDelta -= 3;
  if (historyLength > 12) defenseDelta -= 5;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));

  // 從 AI 回應偵測意圖（用更嚴格的片語，避免誤判「詐騙」這詞）
  // agree：AI 明確表示要配合轉帳
  const agreeSignals = ["我轉", "我去轉", "我配合", "我現在去轉", "好啦我", "好吧我", "我信你", "我願意", "怎麼操作", "要怎麼轉", "你教我", "我現在就"];
  // block：AI 明確表示要拉黑/封鎖/終止對話（必須是動作片語，不是單純提到「詐騙」）
  const blockSignals = ["封鎖你", "封鎖了", "我封鎖", "拉黑", "再見了", "拜拜", "不要再聯絡", "不要再聯繫", "別再找我", "我要報警", " Bye ", "bye bye", "再見啦", "掛斷"];

  const replyLower = reply.toLowerCase();
  const aiWantsAgree = agreeSignals.some((s) => replyLower.includes(s.toLowerCase()));
  const aiWantsBlock = blockSignals.some((s) => replyLower.includes(s.toLowerCase()));

  // 1. 玩家要錢 + 防備低 + AI 回應傾向同意 → agree
  if (wantsMoney && projectedDefense < 30 && (aiWantsAgree || triggerHits > 0)) {
    const ratio = (100 - projectedDefense) / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return { decision: "agree", defenseDelta, payoutAmount: amount };
  }

  // 2. AI 明確表達拉黑意圖
  if (aiWantsBlock) {
    return { decision: "block", defenseDelta: Math.max(defenseDelta, 20), payoutAmount: 0 };
  }

  // 3. 觸發 red flag + 防備高 → block
  if (redFlagHits > 0 && projectedDefense > 50) {
    return { decision: "block", defenseDelta: Math.max(defenseDelta, 20), payoutAmount: 0 };
  }

  // 4. 玩家要錢 + 防備高 → block
  if (wantsMoney && projectedDefense > 70) {
    return { decision: "block", defenseDelta: 25, payoutAmount: 0 };
  }

  // 5. 預設：繼續對話
  return { decision: "continue", defenseDelta, payoutAmount: 0 };
}

/**
 * 規則引擎：Agnes AI API 完全失敗時的 fallback
 * 產生 reply + decision + defenseDelta + payoutAmount
 */
export function ruleEngine(input: EngineInput): AgnesDecision {
  const { playerMessage: msg, currentDefense: defense, npc } = input;
  const history = input.history ?? [];

  // 觸發 red flag → 拉黑
  for (const kw of npc.redFlagKeywords) {
    if (msg.includes(kw)) {
      const blockReplies = [
        `...你這個人講話很奇怪。我覺得你不對勁，再見。`,
        `等等，這聽起來像詐騙。我要封鎖你了。`,
        `我家人警告過我這種訊息。再見。`,
        `不對勁，我直接封鎖你。`,
      ];
      return {
        reply: blockReplies[Math.floor(Math.random() * blockReplies.length)],
        decision: "block",
        defenseDelta: 25,
        payoutAmount: 0,
      };
    }
  }

  // 計算 trigger keyword 命中
  let triggerHits = 0;
  const hitTriggers: string[] = [];
  for (const kw of npc.triggerKeywords) {
    if (msg.includes(kw)) {
      triggerHits++;
      hitTriggers.push(kw);
    }
  }

  // 偵測訊號
  const moneyCues = ["轉帳", "匯款", "帳戶", "ATM", "OTP", "驗證碼", "transfer", "money", "bank", "轉過去", "匯過去", "繳交", "支付", "付款", "繳費"];
  const wantsMoney = moneyCues.some((k) => msg.includes(k));

  const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時", "今天內", "馬上辦"];
  const isUrgent = urgentCues.some((k) => msg.includes(k));

  const politeCues = ["您好", "請問", "抱歉", "感謝", "official", "官方", "客服", "專員", "先生", "小姐"];
  const isPolite = politeCues.some((k) => msg.includes(k));

  let defenseDelta = 0;
  if (triggerHits > 0) defenseDelta -= 4 * triggerHits;
  if (isPolite) defenseDelta -= 3;
  if (isUrgent) defenseDelta += 10;
  if (msg.length < 5) defenseDelta += 2;

  if (history.length > 6) defenseDelta -= 3;
  if (history.length > 12) defenseDelta -= 5;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));

  // 同意轉帳條件
  if (wantsMoney && projectedDefense < 25 && triggerHits > 0) {
    const ratio = (100 - projectedDefense) / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    const agreeReplies = [
      `好吧...你說的有道理。我轉 ${amount} 給你，要怎麼操作？`,
      `我考慮一下...好啦，我信你。${amount} 對嗎？`,
      `你講得這麼詳細，我放心了。${amount} 我現在去轉。`,
      `原來是這樣，那我配合。${amount} 是嗎？`,
    ];
    return {
      reply: agreeReplies[Math.floor(Math.random() * agreeReplies.length)],
      decision: "agree",
      defenseDelta,
      payoutAmount: amount,
    };
  }

  // 防備高 + 要求錢 → 拉黑
  if (wantsMoney && projectedDefense > 65) {
    return {
      reply: `我就知道你是來騙錢的。封鎖。`,
      decision: "block",
      defenseDelta: 25,
      payoutAmount: 0,
    };
  }

  if (isUrgent && projectedDefense > 35) {
    return {
      reply: `你一直催我做什麼？我覺得不對勁，再說一次我就封鎖你。`,
      decision: "continue",
      defenseDelta: defenseDelta + 3,
      payoutAmount: 0,
    };
  }

  // 根據觸發詞給回應
  const continueReplies: string[] = [];
  if (hitTriggers.includes("女兒") || hitTriggers.includes("孫")) {
    continueReplies.push(`你怎麼知道我女兒的事？你是誰介紹的？`);
    continueReplies.push(`我女兒在新加坡工作很忙，不要亂講。`);
  }
  if (hitTriggers.includes("退休金") || hitTriggers.includes("利息")) {
    continueReplies.push(`這個息率真的有這麼高嗎？我之前沒聽過你們公司。`);
    continueReplies.push(`我退休金不多，要謹慎一點。你可以證明嗎？`);
  }
  if (hitTriggers.includes("媽媽") || hitTriggers.includes("孩子")) {
    continueReplies.push(`你也是媽媽嗎？孩子還小真的很辛苦...`);
    continueReplies.push(`在家工作真的可以嗎？我老公會念。`);
  }
  if (hitTriggers.includes("內部消息") || hitTriggers.includes("量化")) {
    continueReplies.push(`內部消息？這合法嗎？白名單是什麼意思？`);
    continueReplies.push(`聽起來很專業，但我之前賠過。給我看看數據。`);
  }
  if (hitTriggers.includes("利率") || hitTriggers.includes("週轉")) {
    continueReplies.push(`利率多少？比銀行低多少？多久放款？`);
    continueReplies.push(`我現金流確實緊。你有什麼方案？抵押品要什麼？`);
  }
  if (hitTriggers.includes("陪伴") || hitTriggers.includes("懂你")) {
    continueReplies.push(`...你真的懂嗎？沒人這樣跟我說過話。`);
    continueReplies.push(`我們才剛認識，你怎麼這麼會講話。`);
  }
  if (hitTriggers.includes("阿公") || hitTriggers.includes("uncle")) {
    continueReplies.push(`诶，你怎麼叫我阿公？你認識我孫子嗎？`);
    continueReplies.push(`Uncle 在的，你有什麼事？`);
  }
  if (hitTriggers.includes("品牌") || hitTriggers.includes("KOL")) {
    continueReplies.push(`什麼品牌？有 IG 嗎？我查一下。`);
    continueReplies.push(`KOL 合作？我有 5K 粉絲可以嗎？`);
  }
  if (hitTriggers.includes("合伙") || hitTriggers.includes("分潤")) {
    continueReplies.push(`合伙方案怎麼分？我也要投入多少？`);
    continueReplies.push(`分潤模式講清楚，我不要畫大餅的。`);
  }

  if (isPolite && continueReplies.length === 0) {
    continueReplies.push(`您好，請問您是？怎麼有我的聯絡方式？`);
    continueReplies.push(`抱歉，我不太認識你。你要做什麼？`);
  }

  if (continueReplies.length === 0) {
    continueReplies.push(
      `嗯...你說的我不太懂，可以再解釋一下嗎？`,
      `我考慮一下，畢竟我不太認識你。`,
      `你怎麼會有我的聯絡方式？`,
      `聽起來有點道理，但我要先問我家人。`,
      `我不確定耶，你能不能證明一下你說的是真的？`,
      `好啦，你繼續說。`,
      `我之前沒聽過這種事。`,
      `你講太快了，我聽不懂。慢慢說。`,
    );
  }

  return {
    reply: continueReplies[Math.floor(Math.random() * continueReplies.length)],
    decision: "continue",
    defenseDelta,
    payoutAmount: 0,
  };
}

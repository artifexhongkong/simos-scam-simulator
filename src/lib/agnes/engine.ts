// 共用的 Agnes AI 引擎 - 客戶端與伺服器端皆可使用
// 採用 cultivation-world-zh 模式：
//   1. AI 直接輸出純文字回應（不要求 JSON），避免解析失敗
//   2. 後端用規則引擎另外判定 decision（continue/agree/block）+ payoutAmount
//   3. 完整傳遞 message_history（含本次玩家訊息之前的所有對話）

import type { NpcProfile } from "@/lib/game/npcs";

export interface AgnesDecision {
  reply: string; // AI 的純文字回應
  decision: "continue" | "agree" | "block" | "cautious";
  defenseDelta: number;
  payoutAmount?: number;
  endingReason?: string; // 結局原因
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
  consecutiveUrgent?: number; // 連續催逼次數
  consecutiveMoney?: number; // 連續要錢次數
  turns?: number; // 對話輪數
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
 * System Prompt - 純文字角色設定
 * Bug 1 修復：使用玩家提供的嚴格約束原文
 */
const SYSTEM_PROMPT = (npc: NpcProfile, defense: number) => `你是一名普通市民，嚴格遵守規則：禁止自行虛構、猜測玩家沒有說過的任何資訊。玩家沒有主動提到的人物、事件、細節，絕對不能主動提出。只能依據玩家真實發送的訊息做出回應，不允許無端自行推進劇情。你的知識僅限於自身背景設定，不能憑空產生額外資訊。

【你的角色】
你是「${npc.displayName}」，一位普通市民。背景：${npc.background}

你目前的內在狀態：
- 信任度：${100 - defense} / 100（0=完全不信任，50=觀察中，100=完全信任會聽從）
- 警惕值：${defense} / 100（0=完全放鬆，100=高度警覺會拉黑）

【回應規則】
1. 永遠保持角色性格與口吻，使用符合背景的用語（如方言、口語）。
2. 不要主動提起錢、轉帳、匯款，除非玩家的話題引導到那。
3. 回應 30-80 字內，自然口語。
4. 必須閱讀並記住前面的對話歷史，回應要有上下文連貫性，不可重複已說過的話、不可無視玩家前一句話的內容。
5. 根據你的個性與當前信任度決定態度：
   - 信任度高時對玩家較親切、願意配合
   - 信任度低時會質疑、試探、保持距離
6. 你最多願意被騙 ${npc.maxPayout}，最少 ${npc.minPayout}。
7. 直接輸出純文字回應，不要加引號、不要加 JSON、不要加任何說明。
8. 再次強調：禁止脑补、禁止捏造、禁止推測玩家未說過的任何資訊。玩家沒提過的家人姓名、學校、獎狀、地址、公司名稱，你絕對不可主動提起。`;

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
 * 機制 3.1 信任度系統 + 機制 3.2 多結局 + 機制 3.3 動態警惕
 */
function judgeDecision(
  input: EngineInput,
  aiReply: string,
): { decision: AgnesDecision["decision"]; defenseDelta: number; payoutAmount?: number; endingReason?: string } {
  const { playerMessage: msg, currentDefense: defense, npc } = input;
  const reply = aiReply.toLowerCase();
  const consecutiveUrgent = input.consecutiveUrgent ?? 0;
  const consecutiveMoney = input.consecutiveMoney ?? 0;
  const turns = input.turns ?? 0;

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

  // === 機制 3.3：動態警惕機制 ===
  // 連續催逼 → 加速警覺
  if (consecutiveUrgent >= 2) {
    defenseDelta += Math.min(20, (consecutiveUrgent - 1) * 5);
  }
  // 連續要錢 → 加速警覺
  if (consecutiveMoney >= 2) {
    defenseDelta += Math.min(24, (consecutiveMoney - 1) * 6);
  }

  const historyLength = input.history?.length ?? 0;
  if (historyLength > 6) defenseDelta -= 3;
  if (historyLength > 12) defenseDelta -= 5;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));
  const trust = 100 - projectedDefense; // 信任度 = 100 - 警惕值

  // 從 AI 回應偵測意圖
  const agreeSignals = ["我轉", "我去轉", "我配合", "我現在去轉", "好啦我", "好吧我", "我信你", "我願意", "怎麼操作", "要怎麼轉", "你教我", "我現在就"];
  const blockSignals = ["封鎖你", "封鎖了", "我封鎖", "拉黑", "再見了", "拜拜", "不要再聯絡", "不要再聯繫", "別再找我", "我要報警", " Bye ", "bye bye", "再見啦", "掛斷"];
  const declineSignals = ["不要", "不用", "我考慮", "再說", "不行", "不可以", "我不轉", "先不要", "等等", "我先問", "我再想想", "我女兒說", "我先生說", "我家人"];

  const replyLower = reply.toLowerCase();
  const aiWantsAgree = agreeSignals.some((s) => replyLower.includes(s.toLowerCase()));
  const aiWantsBlock = blockSignals.some((s) => replyLower.includes(s.toLowerCase()));
  const aiWantsDecline = declineSignals.some((s) => replyLower.includes(s.toLowerCase()));

  // === 機制 3.2：多結局判定 ===

  // ❌ 失敗結局 1：AI 明確表達拉黑
  if (aiWantsBlock) {
    return {
      decision: "block",
      defenseDelta: Math.max(defenseDelta, 20),
      payoutAmount: 0,
      endingReason: "市民識破你的詐騙意圖，主動封鎖你。",
    };
  }

  // ❌ 失敗結局 2：警惕值爆表
  if (projectedDefense >= 85) {
    return {
      decision: "block",
      defenseDelta: 25,
      payoutAmount: 0,
      endingReason: "你的話術漏洞太多，市民警惕值達頂點，直接拉黑。",
    };
  }

  // ❌ 失敗結局 3：連續催逼 4 次以上
  if (consecutiveUrgent >= 4) {
    return {
      decision: "block",
      defenseDelta: 25,
      payoutAmount: 0,
      endingReason: "你不斷催促，市民受不了你的壓力，直接封鎖。",
    };
  }

  // ❌ 失敗結局 4：連續要錢 3 次以上但信任度不夠
  if (consecutiveMoney >= 3 && trust < 50) {
    return {
      decision: "block",
      defenseDelta: 25,
      payoutAmount: 0,
      endingReason: "你頻繁要求轉帳但市民對你信任不足，識破後拉黑。",
    };
  }

  // ✅ 成功結局 1：玩家要錢 + 信任度高 + AI 傾向同意
  if (wantsMoney && trust >= 70 && (aiWantsAgree || triggerHits > 0)) {
    const ratio = trust / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return {
      decision: "agree",
      defenseDelta,
      payoutAmount: amount,
      endingReason: `成功騙取市民信任，對方願意轉帳 $${amount.toLocaleString()}。`,
    };
  }

  // ✅ 成功結局 2：信任度高且 AI 明確同意
  if (wantsMoney && trust >= 60 && aiWantsAgree) {
    const ratio = trust / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return {
      decision: "agree",
      defenseDelta,
      payoutAmount: amount,
      endingReason: `市民對你信任有加，願意配合轉帳 $${amount.toLocaleString()}。`,
    };
  }

  // ⚠️ 謹慎結局 1：玩家要錢 + 信任度中等 + AI 明確拒絕
  if (wantsMoney && trust < 50 && aiWantsDecline && turns >= 3) {
    return {
      decision: "cautious",
      defenseDelta: Math.max(defenseDelta, 10),
      payoutAmount: 0,
      endingReason: "市民心存懷疑，明確拒絕你的請求，並終止對話。",
    };
  }

  // ⚠️ 謹慎結局 2：連續要錢 2 次都被拒絕
  if (wantsMoney && aiWantsDecline && consecutiveMoney >= 2) {
    return {
      decision: "cautious",
      defenseDelta: Math.max(defenseDelta, 10),
      payoutAmount: 0,
      endingReason: "你反覆要求轉帳，市民保持戒心，不願再繼續討論。",
    };
  }

  // ⚠️ 謹慎結局 3：對話超過 15 輪仍未成功
  if (turns >= 15 && trust < 60) {
    return {
      decision: "cautious",
      defenseDelta: 5,
      payoutAmount: 0,
      endingReason: "對話拖得太久，市民決定先停止，日後再說。",
    };
  }

  // 預設：繼續對話
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

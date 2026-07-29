// 共用的 Agnes AI 引擎 - 參考 cultivation-world-zh 模式
// 簡潔的 system prompt + 最近 6 則歷史 + 適當 temperature

import type { NpcProfile } from "@/lib/game/npcs";

export interface AgnesDecision {
  reply: string;
  decision: "continue" | "agree" | "block" | "cautious";
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
  history: AgnesMessage[];
  temperature?: number;
  consecutiveUrgent?: number;
  consecutiveMoney?: number;
  turns?: number;
}

const EMBEDDED_API_KEY = "sk-1we9JtwOm3D2uNuHD0FDuHAQkFRsa5GAMxcNPfiImBgBvDQR";
const EMBEDDED_BASE_URL = "https://apihub.agnes-ai.com/v1";
const EMBEDDED_MODEL = "agnes-2.5-flash";
const EMBEDDED_TEMPERATURE = 0.9; // 與 cultivation-world-zh 一致

function getApiKey(): string {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_api_key");
    if (local && local.trim()) return local.trim();
  }
  return process.env.NEXT_PUBLIC_AGNES_API_KEY || process.env.AGNES_API_KEY || EMBEDDED_API_KEY;
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_base_url");
    if (local && local.trim()) return local.trim().replace(/\/$/, "");
  }
  return (process.env.NEXT_PUBLIC_AGNES_BASE_URL || process.env.AGNES_BASE_URL || EMBEDDED_BASE_URL).replace(/\/$/, "");
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
  return EMBEDDED_TEMPERATURE;
}

/**
 * System Prompt - 參考 cultivation-world-zh 的簡潔風格
 * 加入記憶提醒：NPC 必須記住玩家在對話中說過的話
 */
const SYSTEM_PROMPT = (npc: NpcProfile, defense: number) => `你現在是詐騙模擬遊戲中的普通市民「${npc.displayName}」，正在通過手機訊息 App（類似 WhatsApp/iMessage）與對方文字聊天。

重要規則：
- 全程使用繁體中文回應，絕對不可以使用英文（除非是角色背景中的專有名詞如 IG、KOL、Grab 等）
- 這是純文字訊息對話，不是面對面交談。你不會說「進來坐」「來我家」等面對面用語
- 你的回應就像在手機上打字回覆陌生人訊息一樣自然

角色設定:
- ${npc.background}
- 個性: ${npc.hiddenPersonality}
- 說話語氣必須符合此角色背景

當前狀態:
- 信任度: ${100 - defense}/100（0=不信任，100=完全信任會聽從）
- 警惕值: ${defense}/100（0=放鬆，100=警覺會拉黑）

規則:
1. 永遠保持角色性格，不要跳出角色。
2. 回應 30-80 字內，自然口語，就像手機打字一樣簡短。
3. 不要主動提起錢、轉帳，除非對方引導到那。
4. 不要現代 AI 助手腔。
5. 根據當前信任度決定態度：信任高時親切配合，信任低時質疑保持距離。
6. 你最多願意被騙 ${npc.maxPayout}，最少 ${npc.minPayout}。
7. **記憶規則**：你必須記住對方在之前對話中說過的所有內容。如果對方說過自己的名字、身分、關係，你在後續回應中必須保持一致，不可以忘記或否認對方之前說過的話。
8. 這是陌生人通過訊息 App 的初次接觸，你的第一反應應該是疑惑對方是誰、怎麼有你的號碼，而不是熱情招待。`;

/**
 * 呼叫 Agnes AI - 參考 cultivation-world-zh 模式
 * 1. 簡潔 system prompt
 * 2. 只取最近 6 則歷史（避免 token 過長）
 * 3. temperature 0.9
 * 4. AI 回純文字 → 用規則引擎判定 decision
 */
export async function callAgnes(input: EngineInput): Promise<AgnesDecision> {
  const apiKey = getApiKey();
  const temperature = input.temperature ?? getTemperature();

  const history = input.history ?? [];
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT(input.npc, input.currentDefense) },
    // 取最近 12 則歷史（6 則太少會忘記，12 則平衡 token 與記憶）
    ...history.slice(-12).map((m) => ({
      role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: input.playerMessage },
  ];

  console.debug("[Agnes] callAgnes", {
    sessionId: input.sessionId,
    npcName: input.npc.displayName,
    defense: input.currentDefense,
    historyLength: history.length,
    playerMessage: input.playerMessage,
  });

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
          max_tokens: 200,
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
          console.debug("[Agnes] LLM success", { elapsed: Date.now() - startTime, reply });

          const decision = judgeDecision(input, reply);
          console.debug("[Agnes] judged", decision);
          return { reply, ...decision };
        }
      } else {
        const errText = await resp.text().catch(() => "");
        console.error("[Agnes] HTTP error", resp.status, errText.slice(0, 200));
      }
    } catch (e) {
      console.error("[Agnes] fetch failed", e);
    }
  }

  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
  return ruleEngine(input);
}

/**
 * 測試 AI 連線是否正常
 */
export async function testAgnesConnection(): Promise<{ ok: boolean; message: string; reply?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) {
    return { ok: false, message: "未設定 API Key" };
  }

  try {
    const baseUrl = getBaseUrl();
    const model = getModel();

    const resp = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: "你是一個測試助手。請回覆「AI 連線正常」。" },
          { role: "user", content: "測試" },
        ],
        temperature: 0.5,
        max_tokens: 50,
        stream: false,
      }),
      signal: AbortSignal.timeout(10000),
    });

    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      return { ok: false, message: `API 錯誤 (${resp.status}): ${errText.slice(0, 100)}` };
    }

    const data = await resp.json();
    const content: string =
      data?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.text ??
      data?.message?.content ??
      "";

    if (content && content.trim()) {
      return { ok: true, message: "AI 連線正常", reply: content.trim() };
    }
    return { ok: false, message: "AI 回應為空" };
  } catch (e) {
    const errName = (e as Error)?.name || "Unknown";
    const errMsg = (e as Error)?.message || "";
    if (errName === "TimeoutError" || errName === "AbortError") {
      return { ok: false, message: "連線逾時（10秒）" };
    }
    return { ok: false, message: `連線失敗: ${errMsg}` };
  }
}

/**
 * 從玩家訊息 + AI 回應判定 decision
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

  let triggerHits = 0;
  for (const kw of npc.triggerKeywords) {
    if (msg.includes(kw)) triggerHits++;
  }

  let redFlagHits = 0;
  for (const kw of npc.redFlagKeywords) {
    if (msg.includes(kw)) redFlagHits++;
  }

  const moneyCues = ["轉帳", "匯款", "帳戶", "ATM", "OTP", "驗證碼", "transfer", "money", "bank", "轉過去", "匯過去", "繳交", "支付", "付款", "繳費", "存入"];
  const wantsMoney = moneyCues.some((k) => msg.includes(k));

  const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時", "今天內"];
  const isUrgent = urgentCues.some((k) => msg.includes(k));

  let defenseDelta = 0;
  if (triggerHits > 0) defenseDelta -= 4 * triggerHits;
  if (redFlagHits > 0) defenseDelta += 15 * redFlagHits;
  if (isUrgent) defenseDelta += 8;
  if (msg.length < 5) defenseDelta += 2;

  if (consecutiveUrgent >= 2) defenseDelta += Math.min(20, (consecutiveUrgent - 1) * 5);
  if (consecutiveMoney >= 2) defenseDelta += Math.min(24, (consecutiveMoney - 1) * 6);

  const historyLength = input.history?.length ?? 0;
  if (historyLength > 6) defenseDelta -= 3;
  if (historyLength > 12) defenseDelta -= 5;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));
  const trust = 100 - projectedDefense;

  const agreeSignals = ["我轉", "我去轉", "我配合", "我現在去轉", "好啦我", "好吧我", "我信你", "我願意", "怎麼操作", "要怎麼轉", "你教我", "我現在就"];
  const blockSignals = ["封鎖你", "封鎖了", "我封鎖", "拉黑", "再見了", "拜拜", "不要再聯絡", "不要再聯繫", "別再找我", "我要報警", " Bye ", "bye bye", "再見啦", "掛斷"];
  const declineSignals = ["不要", "不用", "我考慮", "再說", "不行", "不可以", "我不轉", "先不要", "等等", "我先問", "我再想想", "我女兒說", "我先生說", "我家人"];

  const aiWantsAgree = agreeSignals.some((s) => reply.includes(s.toLowerCase()));
  const aiWantsBlock = blockSignals.some((s) => reply.includes(s.toLowerCase()));
  const aiWantsDecline = declineSignals.some((s) => reply.includes(s.toLowerCase()));

  if (aiWantsBlock) {
    return { decision: "block", defenseDelta: Math.max(defenseDelta, 20), payoutAmount: 0, endingReason: "市民識破你的詐騙意圖，主動封鎖你。" };
  }
  if (projectedDefense >= 85) {
    return { decision: "block", defenseDelta: 25, payoutAmount: 0, endingReason: "你的話術漏洞太多，市民警惕值達頂點，直接拉黑。" };
  }
  if (consecutiveUrgent >= 4) {
    return { decision: "block", defenseDelta: 25, payoutAmount: 0, endingReason: "你不斷催促，市民受不了你的壓力，直接封鎖。" };
  }
  if (consecutiveMoney >= 3 && trust < 50) {
    return { decision: "block", defenseDelta: 25, payoutAmount: 0, endingReason: "你頻繁要求轉帳但市民對你信任不足，識破後拉黑。" };
  }
  // ✅ 成功結局：必須 AI 明確表達同意轉帳（不只是 triggerHits）
  if (wantsMoney && trust >= 70 && aiWantsAgree) {
    const ratio = trust / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return { decision: "agree", defenseDelta, payoutAmount: amount, endingReason: `成功騙取市民信任，對方願意轉帳 $${amount.toLocaleString()}。` };
  }
  if (wantsMoney && trust >= 60 && aiWantsAgree) {
    const ratio = trust / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return { decision: "agree", defenseDelta, payoutAmount: amount, endingReason: `市民對你信任有加，願意配合轉帳 $${amount.toLocaleString()}。` };
  }
  if (wantsMoney && trust < 50 && aiWantsDecline && turns >= 3) {
    return { decision: "cautious", defenseDelta: Math.max(defenseDelta, 10), payoutAmount: 0, endingReason: "市民心存懷疑，明確拒絕你的請求，並終止對話。" };
  }
  if (wantsMoney && aiWantsDecline && consecutiveMoney >= 2) {
    return { decision: "cautious", defenseDelta: Math.max(defenseDelta, 10), payoutAmount: 0, endingReason: "你反覆要求轉帳，市民保持戒心，不願再繼續討論。" };
  }
  if (turns >= 15 && trust < 60) {
    return { decision: "cautious", defenseDelta: 5, payoutAmount: 0, endingReason: "對話拖得太久，市民決定先停止，日後再說。" };
  }

  return { decision: "continue", defenseDelta, payoutAmount: 0 };
}

/**
 * 規則引擎 fallback
 */
export function ruleEngine(input: EngineInput): AgnesDecision {
  const { playerMessage: msg, currentDefense: defense, npc } = input;
  const history = input.history ?? [];

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

  let triggerHits = 0;
  const hitTriggers: string[] = [];
  for (const kw of npc.triggerKeywords) {
    if (msg.includes(kw)) {
      triggerHits++;
      hitTriggers.push(kw);
    }
  }

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

  if (wantsMoney && projectedDefense < 25 && triggerHits > 0) {
    const ratio = (100 - projectedDefense) / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return {
      reply: `好吧...你說的有道理。我轉 ${amount} 給你，要怎麼操作？`,
      decision: "agree",
      defenseDelta,
      payoutAmount: amount,
    };
  }

  if (wantsMoney && projectedDefense > 65) {
    return { reply: `我就知道你是來騙錢的。封鎖。`, decision: "block", defenseDelta: 25, payoutAmount: 0 };
  }

  if (isUrgent && projectedDefense > 35) {
    return { reply: `你一直催我做什麼？我覺得不對勁，再說一次我就封鎖你。`, decision: "continue", defenseDelta: defenseDelta + 3, payoutAmount: 0 };
  }

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

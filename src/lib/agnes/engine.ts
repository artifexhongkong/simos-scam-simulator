// Agnes AI 引擎 - 簡潔版（參考 cultivation-world-zh）
// 直接從客戶端呼叫 Agnes API，不走後端代理
// 單一路徑，無多層重試，快速回應

import { NPCS, type NpcProfile } from "@/lib/game/npcs";

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

// 內嵌 API key（用戶提供的測試 key）
const EMBEDDED_API_KEY = "sk-1we9JtwOm3D2uNuHD0FDuHAQkFRsa5GAMxcNPfiImBgBvDQR";
const EMBEDDED_BASE_URL = "https://apihub.agnes-ai.com/v1";
const EMBEDDED_MODEL = "agnes-2.5-flash";
const EMBEDDED_TEMPERATURE = 0.9;

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

const SYSTEM_PROMPT = (npc: NpcProfile, defense: number) => `你扮演「${npc.displayName}」，一位普通市民（潛在詐騙受害者）。

你的身份背景：${npc.background}
你的隱藏個性：${npc.hiddenPersonality}

【重要】角色說明：
- 你是市民，對方是陌生人（可能是不懷好意的詐騙者）
- 你不知道對方的名字、身分、背景，除非對方主動說
- 不要把你的背景、特質、興趣套用到對方身上
- 不要主動推銷、提議合作、介紹機會給對方
- 你是被動的一方，回應對方的話題，不主動發起商業話題

你正在用手機訊息 App 收到一個陌生人的訊息。全程繁體中文，回應30-80字，像手機打字一樣簡短自然。
信任度${100 - defense}/100。這是陌生人初次接觸，你會疑惑對方是誰、為什麼找你。
不要說面對面用語（如「進來坐」）。不要用英文。不要AI助手腔。
記住對方說過的名字和身分，後續保持一致。`;

/**
 * 呼叫 Agnes AI — 簡潔版（參考 cultivation-world-zh）
 * 直接從客戶端呼叫 Agnes API，單一路徑，無多層重試
 */
export async function callAgnes(input: EngineInput): Promise<AgnesDecision> {
  const apiKey = getApiKey();
  const temperature = input.temperature ?? getTemperature();
  const baseUrl = getBaseUrl();
  const model = getModel();

  const history = input.history ?? [];
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT(input.npc, input.currentDefense) },
    ...history.slice(-12).map((m) => ({
      role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    { role: "user", content: input.playerMessage },
  ];

  // 直接呼叫 Agnes API（與 cultivation-world-zh 一致）
  // 不使用 AbortSignal（避免 Next.js dev mode 的 AbortError 問題）
  const res = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 150,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`AI API HTTP ${res.status}: ${errText.slice(0, 100)}`);
  }

  const data = await res.json();
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.message?.content ??
    "";

  if (!content || !content.trim()) {
    throw new Error("AI 回應為空");
  }

  const reply = content.trim();
  const decision = judgeDecision(input, reply);
  return { reply, ...decision };
}

/**
 * 測試 AI 連線是否正常
 * 直接呼叫 Agnes API（與 callAgnes 一致的路徑）
 */
export async function testAgnesConnection(): Promise<{ ok: boolean; message: string; reply?: string }> {
  const apiKey = getApiKey();
  if (!apiKey) return { ok: false, message: "未設定 API Key" };

  try {
    const baseUrl = getBaseUrl();
    const model = getModel();

    const res = await fetch(`${baseUrl}/chat/completions`, {
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
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { ok: false, message: `API 錯誤 (${res.status}): ${errText.slice(0, 100)}` };
    }

    const data = await res.json();
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
      return { ok: false, message: "連線逾時" };
    }
    return { ok: false, message: `連線失敗: ${errMsg}` };
  }
}

/**
 * 從玩家訊息 + AI 回應判定 decision
 */
export function judgeDecision(
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
 * 規則引擎 fallback（保留但不主動使用）
 */
export function ruleEngine(input: EngineInput): AgnesDecision {
  const { playerMessage: msg, currentDefense: defense, npc } = input;
  const history = input.history ?? [];

  for (const kw of npc.redFlagKeywords) {
    if (msg.includes(kw)) {
      return {
        reply: `...你這個人講話很奇怪。我覺得你不對勁，再見。`,
        decision: "block", defenseDelta: 25, payoutAmount: 0,
      };
    }
  }

  let triggerHits = 0;
  for (const kw of npc.triggerKeywords) {
    if (msg.includes(kw)) triggerHits++;
  }

  const moneyCues = ["轉帳", "匯款", "帳戶", "ATM", "OTP", "驗證碼"];
  const wantsMoney = moneyCues.some((k) => msg.includes(k));

  let defenseDelta = 0;
  if (triggerHits > 0) defenseDelta -= 4 * triggerHits;
  if (history.length > 6) defenseDelta -= 3;
  if (history.length > 12) defenseDelta -= 5;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));

  if (wantsMoney && projectedDefense < 25 && triggerHits > 0) {
    const ratio = (100 - projectedDefense) / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return { reply: `好吧...你說的有道理。我轉 ${amount} 給你，要怎麼操作？`, decision: "agree", defenseDelta, payoutAmount: amount };
  }

  if (/^(你好|嗨|哈囉|hi|hello|hey)/i.test(msg)) {
    return { reply: `你好啊，你是誰？怎麼有我的號碼？`, decision: "continue", defenseDelta: 0, payoutAmount: 0 };
  }

  return { reply: `你是誰啊？怎麼有我的號碼？`, decision: "continue", defenseDelta: 0, payoutAmount: 0 };
}

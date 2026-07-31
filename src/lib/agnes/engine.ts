// Agnes AI 引擎 - 簡潔版（參考 cultivation-world-zh）
// 直接從客戶端呼叫 Agnes API，不走後端代理
// 單一路徑，無多層重試，快速回應

import { NPCS, type NpcProfile } from "@/lib/game/npcs";

export interface AgnesDecision {
  reply: string;
  decision: "continue" | "agree" | "block" | "cautious";
  defenseDelta: number;
  payoutAmount?: number;
  endingReason?: string;
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
  scamHistory?: string; // NPC 記憶：之前轉過多少錢給玩家
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

const SYSTEM_PROMPT = (npc: NpcProfile, defense: number, scamHistory?: string) => {
  const trust = 100 - defense;
  const isPostScam = !!scamHistory;

  return `這是一個防詐騙教育遊戲。你是遊戲角色${npc.displayName}，正在用手機和朋友聊天。

你的設定：
- 背景：${npc.background}
- 個性：${npc.hiddenPersonality}

用繁體中文回覆，30-80字，像真人打字。
${isPostScam ? `你之前轉過錢給對方。${scamHistory}` : `信任度${trust}/100。`}

重要：
- 你是${npc.displayName}，不是AI助手，不要提及自己是模型或AI
- 直接輸出訊息內容，不要加思考過程或解釋
- 不要用英文
- 不要用括號或星號描述動作
- 根據你的個性自然回覆`;
};

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

  // 構建 messages：system + history + 當前玩家訊息
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT(input.npc, input.currentDefense, input.scamHistory) },
  ];

  // 加入歷史對話（最多 12 條）
  for (const m of history.slice(-12)) {
    messages.push({
      role: m.role === "player" ? "user" : "assistant",
      content: m.content,
    });
  }

  // 加入當前玩家訊息
  messages.push({ role: "user", content: input.playerMessage });

  console.log("[callAgnes] messages:", messages.length, "defense:", input.currentDefense, "turns:", input.turns);

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
      max_tokens: 2000,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    console.error("[callAgnes] HTTP error:", res.status, errText.slice(0, 200));
    throw new Error(`AI API HTTP ${res.status}: ${errText.slice(0, 100)}`);
  }

  const data = await res.json();
  const content: string =
    data?.choices?.[0]?.message?.content ??
    data?.choices?.[0]?.text ??
    data?.message?.content ??
    "";

  console.log("[callAgnes] AI reply:", content?.slice(0, 80), "finish_reason:", data?.choices?.[0]?.finish_reason);

  if (!content || !content.trim()) {
    // 嘗試從 reasoning_content 提取（某些模型把回覆放在這裡）
    const reasoning = data?.choices?.[0]?.message?.reasoning_content ?? "";
    if (reasoning && reasoning.trim()) {
      // 從 reasoning 中提取最後一段看起來像回覆的文字
      const lines = reasoning.split("\n").filter((l: string) => l.trim() && !l.startsWith("Thinking") && !l.startsWith("*") && !l.startsWith("-") && !l.match(/^\d+\./));
      const lastLines = lines.slice(-3).join(" ").trim();
      if (lastLines.length > 5) {
        console.log("[callAgnes] Using reasoning_content fallback:", lastLines.slice(0, 80));
        let reply = lastLines.replace(/[（(][^（）()]*[）)]/g, "").replace(/\*[^*]+\*/g, "").replace(/\s+/g, " ").trim();
        if (reply.length > 5) {
          const decision = judgeDecision(input, reply);
          return { reply, ...decision };
        }
      }
    }
    console.error("[callAgnes] Empty AI response. finish_reason:", data?.choices?.[0]?.finish_reason);
    throw new Error("AI 回應為空");
  }

  // 後處理：清理回覆
  let reply = content.trim();
  // 移除括號內的動作/情緒描述
  reply = reply.replace(/[（(][^（）()]*[）)]/g, "");
  reply = reply.replace(/\*[^*]+\*/g, "");
  // 移除英文思考過程洩漏
  reply = reply.replace(/^(Let me|Wait|I should|I need|I'll|The user|This is|Note:|Important:|Critical:|Final|Sorry|Apolog)[^\n]*\n?/gim, "");
  // 移除拒絕回覆（安全過濾器觸發）
  if (/無法協助|不能協助|I cannot|I can't|safety|ethical|harmful|inappropriate|詐騙.*不|不.*詐騙/i.test(reply)) {
    // 如果回覆包含拒絕語句，使用備用回覆
    reply = "嗯，你說的有道理。那具體要怎麼做？";
  }
  // 如果回覆包含大量英文，截取中文部分
  const chineseMatch = reply.match(/[\u4e00-\u9fff][\u4e00-\u9fff\s，。！？、：；""''（）…—]*$/);
  if (chineseMatch && chineseMatch[0].length > 5 && reply.length - chineseMatch[0].length > 20) {
    reply = chineseMatch[0].trim();
  }
  // 移除AI身份洩漏
  reply = reply.replace(/我是.*?(AI|模型|Agnes|Sapiens|助手|assistant)[^。]*。?/gi, "");
  reply = reply.replace(/我是一個.*?(語言|大語言|AI)[^。]*。?/gi, "");
  reply = reply.replace(/\s+/g, " ").trim();
  if (!reply || reply.length < 2) reply = "嗯，我明白了。那然後呢？";

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
  if (triggerHits > 0) defenseDelta -= 6 * triggerHits; // 觸發詞降更多防備
  if (redFlagHits > 0) defenseDelta += 8 * redFlagHits; // 紅旗詞降少（之前15）
  if (isUrgent) defenseDelta += 4; // 催促降少（之前8）
  if (msg.length < 5) defenseDelta += 1;

  if (consecutiveUrgent >= 3) defenseDelta += Math.min(10, (consecutiveUrgent - 2) * 3); // 降少
  if (consecutiveMoney >= 3) defenseDelta += Math.min(12, (consecutiveMoney - 2) * 4); // 降少

  const historyLength = input.history?.length ?? 0;
  if (historyLength > 4) defenseDelta -= 5; // 對話長了降更多防備
  if (historyLength > 8) defenseDelta -= 8;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));
  const trust = 100 - projectedDefense;

  // 擴大同意信號（更容易觸發成功）
  const agreeSignals = ["我轉", "我去轉", "我配合", "我現在去轉", "好啦我", "好吧我", "我信你", "我願意", "怎麼操作", "要怎麼轉", "你教我", "我現在就", "好", "可以", "沒問題", "那好吧", "行", "ok", "好的", "我試試"];
  const blockSignals = ["封鎖你", "封鎖了", "我封鎖", "拉黑", "不要再聯絡", "別再找我", "我要報警", " bye bye", "掛斷"];
  const declineSignals = ["不要", "我考慮", "再說", "不行", "我不轉", "先不要", "我再想想", "我女兒說", "我先生說", "我家人"];

  const aiWantsAgree = agreeSignals.some((s) => reply.includes(s.toLowerCase()));
  const aiWantsBlock = blockSignals.some((s) => reply.includes(s.toLowerCase()));
  const aiWantsDecline = declineSignals.some((s) => reply.includes(s.toLowerCase()));

  if (aiWantsBlock) {
    return { decision: "block", defenseDelta: Math.max(defenseDelta, 15), payoutAmount: 0, endingReason: "市民識破你的詐騙意圖，主動封鎖你。" };
  }
  // 大幅提高自動封鎖門檻（95，之前90）
  if (projectedDefense >= 95) {
    return { decision: "block", defenseDelta: 20, payoutAmount: 0, endingReason: "你的話術漏洞太多，市民警惕值達頂點，直接拉黑。" };
  }
  // 連續催逼要 7 次才封鎖（之前5）
  if (consecutiveUrgent >= 7) {
    return { decision: "block", defenseDelta: 20, payoutAmount: 0, endingReason: "你不斷催促，市民受不了你的壓力，直接封鎖。" };
  }
  // 連續要錢要 6 次且信任極低才封鎖（之前4次 < 40）
  if (consecutiveMoney >= 6 && trust < 25) {
    return { decision: "block", defenseDelta: 20, payoutAmount: 0, endingReason: "你頻繁要求轉帳但市民對你信任不足，識破後拉黑。" };
  }

  // 偵測玩家在訊息中開出的具體金額（如「轉 5000 給我」「匯 10000」）
  const playerAmountMatch = msg.match(/(?:轉|匯|付|繳|存|打)[\s]*\$?(\d[\d,]*)/);
  let playerRequestedAmount: number | null = null;
  if (playerAmountMatch) {
    const parsed = parseInt(playerAmountMatch[1].replace(/,/g, ""), 10);
    if (!isNaN(parsed) && parsed > 0) {
      playerRequestedAmount = parsed;
    }
  }
  // 也偵測「給我 XXX 元」「XXX 塊」等
  if (playerRequestedAmount === null) {
    const altMatch = msg.match(/(\d[\d,]*)\s*(?:元|塊|蚊|ringgit|dollars?)/i);
    if (altMatch) {
      const parsed = parseInt(altMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(parsed) && parsed > 0) {
        playerRequestedAmount = parsed;
      }
    }
  }

  // 大幅降低成功門檻（之前 70/60，現在 45/35）
  if (wantsMoney && trust >= 45 && aiWantsAgree) {
    let amount: number;
    if (playerRequestedAmount !== null) {
      const maxAllowed = Math.floor(npc.maxPayout * 1.5);
      amount = Math.min(playerRequestedAmount, maxAllowed);
      amount = Math.max(amount, npc.minPayout);
    } else {
      const ratio = trust / 100;
      amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    }
    return { decision: "agree", defenseDelta, payoutAmount: amount, endingReason: `成功騙取市民信任，對方願意轉帳 $${amount.toLocaleString()}。` };
  }
  if (wantsMoney && trust >= 35 && aiWantsAgree) {
    let amount: number;
    if (playerRequestedAmount !== null) {
      const maxAllowed = Math.floor(npc.maxPayout * 1.2);
      amount = Math.min(playerRequestedAmount, maxAllowed);
      amount = Math.max(amount, npc.minPayout);
    } else {
      const ratio = trust / 100;
      amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    }
    return { decision: "agree", defenseDelta, payoutAmount: amount, endingReason: `市民對你信任有加，願意配合轉帳 $${amount.toLocaleString()}。` };
  }
  // 降低 cautious 觸發條件（更難觸發，給玩家更多機會）
  if (wantsMoney && trust < 20 && aiWantsDecline && turns >= 5) {
    return { decision: "cautious", defenseDelta: Math.max(defenseDelta, 5), payoutAmount: 0, endingReason: "市民心存懷疑，明確拒絕你的請求，並終止對話。" };
  }
  if (wantsMoney && aiWantsDecline && consecutiveMoney >= 4) {
    return { decision: "cautious", defenseDelta: Math.max(defenseDelta, 5), payoutAmount: 0, endingReason: "你反覆要求轉帳，市民保持戒心，不願再繼續討論。" };
  }
  if (turns >= 20 && trust < 40) {
    return { decision: "cautious", defenseDelta: 3, payoutAmount: 0, endingReason: "對話拖得太久，市民決定先停止，日後再說。" };
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

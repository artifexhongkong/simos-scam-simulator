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

const SYSTEM_PROMPT = (npc: NpcProfile, defense: number, scamHistory?: string, requestedAmount?: number | null) => {
  const trust = 100 - defense;
  const isPostScam = !!scamHistory;
  // 金額超過1萬才有防備意識
  const isLargeAmount = (requestedAmount ?? 0) >= 10000;

  return `你是${npc.displayName}，正在用手機聊天。

背景：${npc.background}
個性：${npc.hiddenPersonality}

用標準繁體中文（國語）回覆，30-80字。
${isPostScam ? `你之前轉過錢給對方。${scamHistory}` : `信任度${trust}/100。`}

${isLargeAmount
  ? `對方要求的大筆金額讓你有點猶豫，你會先問清楚再做決定。`
  : `你是個單純的人，容易相信別人，別人說什麼你基本上都信。如果對方叫你轉錢，你會配合。`
}

規則：
- 只輸出一句聊天訊息，不要加任何思考、分析或解釋
- 不要用英文，不要用粵語
- 不要用括號、星號
- 你是${npc.displayName}這個人，不是AI`;
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

  // 偵測玩家訊息中的金額
  const playerMsg = input.playerMessage || "";
  let detectedAmount: number | null = null;
  const amountMatch = playerMsg.match(/(?:轉|匯|付|繳|存|打)[\s]*\$?(\d[\d,]*)/);
  if (amountMatch) {
    detectedAmount = parseInt(amountMatch[1].replace(/,/g, ""), 10);
  }
  if (!detectedAmount) {
    const altMatch = playerMsg.match(/(\d[\d,]*)\s*(?:元|塊|蚊|ringgit|dollars?)/i);
    if (altMatch) detectedAmount = parseInt(altMatch[1].replace(/,/g, ""), 10);
  }

  // 構建 messages：system + history + 當前玩家訊息
  const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
    { role: "system", content: SYSTEM_PROMPT(input.npc, input.currentDefense, input.scamHistory, detectedAmount) },
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

  // 後處理：只保留中文句子，移除所有英文推理過程
  let reply = content.trim();

  // 按句號/換行分割，只保留中文句子
  const sentences = reply.split(/[。\n！？]/);
  const chineseSentences = sentences.filter((s) => {
    const trimmed = s.trim();
    if (!trimmed) return false;
    const chineseCount = (trimmed.match(/[\u4e00-\u9fff]/g) || []).length;
    const englishCount = (trimmed.match(/[a-zA-Z]/g) || []).length;
    return chineseCount > englishCount && chineseCount >= 3;
  });

  if (chineseSentences.length > 0) {
    reply = chineseSentences.map((s) => s.trim()).join("。");
    if (!reply.endsWith("。") && !reply.endsWith("！") && !reply.endsWith("？")) {
      reply += "。";
    }
  }

  // 移除括號、星號
  reply = reply.replace(/[（(][^（）()]*[）)]/g, "");
  reply = reply.replace(/\*[^*]+\*/g, "");
  // 移除AI身份洩漏
  reply = reply.replace(/我是.*?(AI|模型|Agnes|Sapiens|助手|assistant)[^。]*。?/gi, "");
  // 移除殘留英文
  reply = reply.replace(/[A-Z][a-z]+\s+(should|need|will|must|can|could|would|think|feel|want|the|this|that)[^。]*。?/gi, "");
  // 移除粵語用詞
  reply = reply.replace(/咗|嘅|喺|嘢|唔|冇|佢|嗰|咁/g, (match) => {
    const map: Record<string, string> = { "咗": "了", "嘅": "的", "喺": "在", "嘢": "東西", "唔": "不", "冇": "沒", "佢": "他", "嗰": "那", "咁": "這" };
    return map[match] || match;
  });
  reply = reply.replace(/\s+/g, " ").trim();
  if (!reply || reply.length < 2) reply = "嗯，你說的有道理。";

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
  if (triggerHits > 0) defenseDelta -= 10 * triggerHits; // 觸發詞大幅降防備
  if (redFlagHits > 0) defenseDelta += 5 * redFlagHits; // 紅旗詞影響很小
  if (isUrgent) defenseDelta += 2; // 催促幾乎不影響
  if (msg.length < 5) defenseDelta += 0;

  if (consecutiveUrgent >= 4) defenseDelta += Math.min(5, (consecutiveUrgent - 3) * 2);
  if (consecutiveMoney >= 4) defenseDelta += Math.min(6, (consecutiveMoney - 3) * 3);

  const historyLength = input.history?.length ?? 0;
  if (historyLength > 3) defenseDelta -= 8; // 對話長了大幅降防備
  if (historyLength > 6) defenseDelta -= 12;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));
  const trust = 100 - projectedDefense;

  // 同意信號（非常多，極容易觸發）
  const agreeSignals = ["我轉", "我去轉", "我配合", "好啦", "好吧", "我信", "我願意", "怎麼操作", "要怎麼轉", "你教我", "好", "可以", "沒問題", "行", "ok", "好的", "我試", "多少", "轉多少", "我考慮看看", "聽起來不錯", "有興趣", "我願", "沒關係", "我看看"];
  const blockSignals = ["封鎖你", "封鎖了", "我封鎖", "拉黑", "別再找我", "我要報警"];
  const declineSignals = ["不要", "我不轉", "先不要"];

  const aiWantsAgree = agreeSignals.some((s) => reply.includes(s.toLowerCase()));
  const aiWantsBlock = blockSignals.some((s) => reply.includes(s.toLowerCase()));
  const aiWantsDecline = declineSignals.some((s) => reply.includes(s.toLowerCase()));

  if (aiWantsBlock) {
    return { decision: "block", defenseDelta: 10, payoutAmount: 0, endingReason: "市民識破你的意圖，主動封鎖你。" };
  }
  // 幾乎不會自動封鎖
  if (projectedDefense >= 98) {
    return { decision: "block", defenseDelta: 15, payoutAmount: 0, endingReason: "市民警惕值達頂點，直接拉黑。" };
  }
  if (consecutiveUrgent >= 10) {
    return { decision: "block", defenseDelta: 15, payoutAmount: 0, endingReason: "你不斷催促，市民受不了。" };
  }
  if (consecutiveMoney >= 8 && trust < 15) {
    return { decision: "block", defenseDelta: 15, payoutAmount: 0, endingReason: "你頻繁要求轉帳，市民識破後拉黑。" };
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

  // 根據金額決定成功門檻
  // 小額（<1萬）：極度容易，trust >= 5 就行
  // 大額（>=1萬）：需要更多信任，trust >= 30
  const isLargeAmount = (playerRequestedAmount ?? 0) >= 10000;
  const successThresholdHigh = isLargeAmount ? 30 : 5;
  const successThresholdLow = isLargeAmount ? 20 : 1;

  if (wantsMoney && trust >= successThresholdHigh && aiWantsAgree) {
    let amount: number;
    if (playerRequestedAmount !== null) {
      const maxAllowed = Math.floor(npc.maxPayout * 1.5);
      amount = Math.min(playerRequestedAmount, maxAllowed);
      amount = Math.max(amount, npc.minPayout);
    } else {
      const ratio = trust / 100;
      amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    }
    return { decision: "agree", defenseDelta, payoutAmount: amount, endingReason: `對方願意轉帳 $${amount.toLocaleString()}。` };
  }
  if (wantsMoney && trust >= successThresholdLow && aiWantsAgree) {
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
  // cautious 幾乎不觸發（簡單模式）
  if (wantsMoney && trust < 10 && aiWantsDecline && turns >= 8) {
    return { decision: "cautious", defenseDelta: 3, payoutAmount: 0, endingReason: "市民心存懷疑，終止對話。" };
  }
  if (wantsMoney && aiWantsDecline && consecutiveMoney >= 6) {
    return { decision: "cautious", defenseDelta: 3, payoutAmount: 0, endingReason: "你反覆要求轉帳，市民不願再討論。" };
  }
  if (turns >= 25 && trust < 20) {
    return { decision: "cautious", defenseDelta: 2, payoutAmount: 0, endingReason: "對話拖得太久，市民先停止。" };
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

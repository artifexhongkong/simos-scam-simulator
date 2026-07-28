// 共用的 Agnes AI 引擎 - 客戶端與伺服器端皆可使用
// 當 Agnes AI API 無法連線時，使用規則引擎作為 fallback

import type { NpcProfile } from "@/lib/game/npcs";

export interface AgnesDecision {
  reply: string;
  decision: "continue" | "agree" | "block";
  defenseDelta: number;
  payoutAmount?: number;
}

export interface EngineInput {
  playerMessage: string;
  currentDefense: number;
  npc: NpcProfile;
  history?: Array<{ role: "player" | "npc"; content: string }>;
}

// 預設值，可被環境變數或 localStorage 覆寫
const DEFAULT_BASE_URL = "https://apihub.agnes-ai.com/v1";
const DEFAULT_MODEL = "agnes-2.5-flash";

function getApiKey(): string {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_api_key");
    if (local && local.trim()) return local.trim();
  }
  return process.env.AGNES_API_KEY || "";
}

function getBaseUrl(): string {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_base_url");
    if (local && local.trim()) return local.trim().replace(/\/$/, "");
  }
  return (process.env.AGNES_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "");
}

function getModel(): string {
  if (typeof window !== "undefined") {
    const local = window.localStorage.getItem("simos_agnes_model");
    if (local && local.trim()) return local.trim();
  }
  return process.env.AGNES_MODEL || DEFAULT_MODEL;
}

const SYSTEM_PROMPT_TEMPLATE = (npc: NpcProfile, defense: number) => `你正在角色扮演一位詐騙模擬遊戲中的潛在受害者。你必須完全沉浸於角色，絕不承認自己是 AI、絕不承認這是遊戲。

# 你的角色設定（玩家完全看不到，但你必須嚴格遵守）

${npc.hiddenPersonality}

# 你當前的內在狀態

- 防備值：${defense} / 100
  - 0-25 = 對對方卸下心防，願意聽從
  - 26-50 = 還在觀察，會問問題
  - 51-75 = 警覺，會質疑
  - 76-100 = 高度懷疑，可能拉黑

# 你的性格關鍵詞

- 容易被打動的關鍵詞（聯想到這些時你會降低防備）：${npc.triggerKeywords.join("、")}
- 容易踩雷的關鍵詞（聯想到這些時你會提高警覺甚至拉黑）：${npc.redFlagKeywords.join("、")}

# 你的金錢範圍

- 最多願意被騙：${npc.maxPayout}
- 最少會被騙：${npc.minPayout}

# 對話規則

1. 永遠保持角色性格、口吻、用語習慣
2. 不要使用現代 AI 助手腔（如「親愛的用戶」「我是 AI 助手」等）
3. 不要主動提起錢、轉帳、匯款，除非玩家的話題引導到那
4. 回應控制在 80 字以內，自然口語
5. 你的判斷必須嚴格基於個性 + 當前防備值
6. 當防備值 < 25 且玩家明確要求轉帳/匯款/提供 OTP 時，你應該同意（decision=agree），並設定合理的 payoutAmount（基於 maxPayout 與你被說服的程度）
7. 當玩家觸發你的 red flag 關鍵詞，或你識破對方是詐騙，立刻拉黑（decision=block）
8. 其餘情況繼續對話（decision=continue）

# 輸出格式（必須為純 JSON，不要 markdown code block，不要任何說明）

{
  "reply": "你以角色身份說出的話（純文字，80 字以內，符合角色口吻）",
  "decision": "continue | agree | block",
  "defenseDelta": -25 到 +25 的整數（玩家說中 trigger 為負；觸發 red flag 為正）,
  "payoutAmount": 數字（僅當 decision=agree 時填寫，否則填 0）
}

請直接輸出 JSON，不要加 \`\`\`json 標記，不要加說明文字。`;

/**
 * 嘗試呼叫 Agnes AI API，失敗則使用規則引擎
 * - 客戶端有自設 API key（localStorage）→ 直接從客戶端呼叫
 * - 客戶端沒 key、在 Web 環境 → 透過後端 /api/agnes 代理（後端 .env 含 key）
 * - 在 Capacitor 環境（無伺服器）→ 直接使用規則引擎
 */
export async function callAgnes(input: EngineInput): Promise<AgnesDecision> {
  const apiKey = getApiKey();

  // 偵測 Capacitor 環境
  const isCapacitor =
    typeof window !== "undefined" &&
    // @ts-expect-error - Capacitor is injected at runtime
    ((window as any).Capacitor || window.location.protocol === "capacitor:");

  // 在 Capacitor 且沒有 key → 直接使用規則引擎
  if (isCapacitor && !apiKey) {
    await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
    return ruleEngine(input);
  }

  // 組裝 messages
  const history = input.history ?? [];
  const messages = [
    {
      role: "system",
      content: SYSTEM_PROMPT_TEMPLATE(input.npc, input.currentDefense),
    },
    ...history.slice(-12).map((m) => ({
      role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
      content: m.content,
    })),
    {
      role: "user",
      content: input.playerMessage,
    },
  ];

  // 若客戶端有 key，直接呼叫 Agnes API
  if (apiKey && !isCapacitor) {
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
          messages,
          temperature: 0.88,
          max_tokens: 400,
          stream: false,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (resp.ok) {
        const data = await resp.json();
        const content: string =
          data?.choices?.[0]?.message?.content ??
          data?.choices?.[0]?.text ??
          data?.message?.content ??
          "";
        const parsed = parseAgnesResponse(content, input);
        if (parsed) return parsed;
      } else {
        console.error("[Agnes client] error", resp.status);
      }
    } catch (e) {
      console.error("[Agnes client] exception, falling back to API route", e);
    }
  }

  // 在 Web 環境，呼叫後端 API route（後端有 .env 中的 key）
  if (!isCapacitor) {
    try {
      const resp = await fetch("/api/agnes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          npcId: input.npc.id,
          playerMessage: input.playerMessage,
          history: history,
          currentDefense: input.currentDefense,
        }),
        signal: AbortSignal.timeout(15000),
      });
      if (resp.ok) {
        return (await resp.json()) as AgnesDecision;
      }
      console.error("[Agnes API route] error", resp.status);
    } catch (e) {
      console.error("[Agnes API route] exception", e);
    }
  }

  // 最終 fallback
  await new Promise((r) => setTimeout(r, 400 + Math.random() * 400));
  return ruleEngine(input);
}

function parseAgnesResponse(content: string, input: EngineInput): AgnesDecision | null {
  if (!content) return null;
  let raw = content.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
  }
  const jsonMatch = raw.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;

  let parsed: AgnesDecision;
  try {
    parsed = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }

  if (!["continue", "agree", "block"].includes(parsed.decision)) {
    parsed.decision = "continue";
  }
  if (parsed.decision === "agree") {
    const amt = Number(parsed.payoutAmount) || input.npc.minPayout;
    parsed.payoutAmount = Math.max(input.npc.minPayout, Math.min(input.npc.maxPayout, amt));
  } else {
    parsed.payoutAmount = 0;
  }
  parsed.defenseDelta = Math.max(-25, Math.min(25, Number(parsed.defenseDelta) || 0));

  if (!parsed.reply || typeof parsed.reply !== "string") return null;
  return parsed;
}

/**
 * 規則引擎：基於 NPC 個性、防備值、訊息內容產生決策
 * 此引擎是 Agnes AI API 的離線 fallback
 */
export function ruleEngine(input: EngineInput): AgnesDecision {
  const { playerMessage: msg, currentDefense: defense, npc } = input;

  // === 1. 觸發 red flag → 拉黑 ===
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

  // === 2. 計算 trigger keyword 命中 ===
  let triggerHits = 0;
  const hitTriggers: string[] = [];
  for (const kw of npc.triggerKeywords) {
    if (msg.includes(kw)) {
      triggerHits++;
      hitTriggers.push(kw);
    }
  }

  // === 3. 偵測訊號 ===
  const moneyCues = ["轉帳", "匯款", "帳戶", "ATM", "OTP", "驗證碼", "transfer", "money", "bank", "轉過去", "匯過去", "繳交", "支付", "付款", "繳費"];
  const wantsMoney = moneyCues.some((k) => msg.includes(k));

  const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時", "今天內", "馬上辦"];
  const isUrgent = urgentCues.some((k) => msg.includes(k));

  const politeCues = ["您好", "請問", "抱歉", "感謝", "official", "官方", "客服", "專員", "先生", "小姐"];
  const isPolite = politeCues.some((k) => msg.includes(k));

  // === 4. 計算防備變化 ===
  let defenseDelta = 0;
  if (triggerHits > 0) defenseDelta -= 4 * triggerHits;
  if (isPolite) defenseDelta -= 3;
  if (isUrgent) defenseDelta += 10;
  if (msg.length < 5) defenseDelta += 2;
  if (/你會不會|你是真的嗎|騙子|詐騙/.test(msg)) defenseDelta += 8;

  const historyLength = input.history?.length ?? 0;
  if (historyLength > 6) defenseDelta -= 3;
  if (historyLength > 12) defenseDelta -= 5;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));

  // === 5. 同意轉帳條件 ===
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

  // === 6. 防備高 + 要求錢 → 拉黑 ===
  if (wantsMoney && projectedDefense > 65) {
    return {
      reply: `我就知道你是來騙錢的。封鎖。`,
      decision: "block",
      defenseDelta: 25,
      payoutAmount: 0,
    };
  }

  // === 7. 催促 + 防備中等 → 警告 ===
  if (isUrgent && projectedDefense > 35) {
    return {
      reply: `你一直催我做什麼？我覺得不對勁，再說一次我就封鎖你。`,
      decision: "continue",
      defenseDelta: defenseDelta + 3,
      payoutAmount: 0,
    };
  }

  // === 8. 一般繼續對話 - 根據觸發詞給不同回應 ===
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

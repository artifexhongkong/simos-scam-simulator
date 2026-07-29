import { NextRequest, NextResponse } from "next/server";
import { NPCS } from "@/lib/game/npcs";
import { ruleEngine, type AgnesDecision, type AgnesMessage } from "@/lib/agnes/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 後端環境變數（fallback）
const AGNES_API_KEY = process.env.AGNES_API_KEY || process.env.NEXT_PUBLIC_AGNES_API_KEY || "";
const AGNES_BASE_URL = (process.env.AGNES_BASE_URL || process.env.NEXT_PUBLIC_AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1").replace(/\/$/, "");
const AGNES_MODEL = process.env.AGNES_MODEL || process.env.NEXT_PUBLIC_AGNES_MODEL || "agnes-2.5-flash";
// 參考 cultivation-world-zh：temperature 0.9
const AGNES_TEMPERATURE = parseFloat(process.env.AGNES_TEMPERATURE || process.env.NEXT_PUBLIC_AGNES_TEMPERATURE || "0.9");

interface AgnesRequestBody {
  sessionId: string;
  npcId: string;
  playerMessage: string;
  messageHistory: AgnesMessage[];
  currentDefense: number;
  temperature?: number;
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const SYSTEM_PROMPT = (npcBackground: string, npcName: string, npcPersonality: string, defense: number, maxPayout: number, minPayout: number) => `你現在是詐騙模擬遊戲中的普通市民「${npcName}」，必須用繁體中文第一人稱回應玩家的話。

角色設定:
- ${npcBackground}
- 個性: ${npcPersonality}
- 說話語氣必須符合此角色背景

當前狀態:
- 信任度: ${100 - defense}/100（0=不信任，100=完全信任會聽從）
- 警惕值: ${defense}/100（0=放鬆，100=警覺會拉黑）

規則:
1. 永遠保持角色性格，不要跳出角色。
2. 回應 30-80 字內，自然口語。
3. 不要主動提起錢、轉帳，除非玩家引導到那。
4. 不要現代 AI 助手腔。
5. 根據當前信任度決定態度：信任高時親切配合，信任低時質疑保持距離。
6. 你最多願意被騙 ${maxPayout}，最少 ${minPayout}。
7. **記憶規則**：你必須記住玩家在之前對話中說過的所有內容。如果玩家說過自己的名字、身分、關係，你在後續回應中必須保持一致，不可以忘記或否認玩家之前說過的話。例如玩家說自己是「陳偉、女兒的朋友」，你在後續對話中必須記住對方是陳偉，不可以否認或遺忘。`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = (await req.json()) as AgnesRequestBody;
    const npc = NPCS.find((n) => n.id === body.npcId);

    if (!npc) {
      return NextResponse.json({ error: "NPC_NOT_FOUND" }, { status: 404 });
    }

    const apiKey = body.apiKey || AGNES_API_KEY;
    const baseUrl = (body.baseUrl || AGNES_BASE_URL).replace(/\/$/, "");
    const model = body.model || AGNES_MODEL;
    const temperature = body.temperature ?? AGNES_TEMPERATURE;
    const history = body.messageHistory ?? [];

    if (!apiKey) {
      console.warn(`[/api/agnes] no API key, rule engine. session=${body.sessionId}`);
      return NextResponse.json(
        ruleEngine({
          sessionId: body.sessionId,
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history,
        }),
      );
    }

    // 組裝 messages: [system] + [最近12則歷史] + [玩家輸入]
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT(npc.background, npc.displayName, npc.hiddenPersonality, body.currentDefense, npc.maxPayout, npc.minPayout) },
      ...history.slice(-12).map((m) => ({
        role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: body.playerMessage },
    ];

    console.log(`[/api/agnes] ====== LLM CALL ======`);
    console.log(`[/api/agnes] session: ${body.sessionId}`);
    console.log(`[/api/agnes] npc: ${npc.displayName} (defense=${body.currentDefense})`);
    console.log(`[/api/agnes] model: ${model}, temp: ${temperature}`);
    console.log(`[/api/agnes] history length: ${history.length}`);
    console.log(`[/api/agnes] player message: ${body.playerMessage}`);
    console.log(`[/api/agnes] messages to LLM (full):`);
    messages.forEach((m, i) => {
      console.log(`[/api/agnes]   [${i}] role=${m.role}, content="${m.content.slice(0, 150)}${m.content.length > 150 ? "..." : ""}"`);
    });

    try {
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

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error(`[/api/agnes] HTTP ${resp.status}:`, errText.slice(0, 200));
        return NextResponse.json(
          ruleEngine({
            sessionId: body.sessionId,
            npc,
            playerMessage: body.playerMessage,
            currentDefense: body.currentDefense,
            history,
          }),
        );
      }

      const data = await resp.json();
      const content: string =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.message?.content ??
        "";

      console.log(`[/api/agnes] LLM reply (${Date.now() - startTime}ms):`, content.slice(0, 200));

      if (!content || !content.trim()) {
        return NextResponse.json(
          ruleEngine({
            sessionId: body.sessionId,
            npc,
            playerMessage: body.playerMessage,
            currentDefense: body.currentDefense,
            history,
          }),
        );
      }

      const reply = content.trim();

      // 用規則引擎判定 decision（不要求 AI 輸出 JSON）
      const decision = judgeDecision({ npc, playerMessage: body.playerMessage, currentDefense: body.currentDefense, history } as any, reply);

      const result: AgnesDecision = { reply, ...decision };
      console.log(`[/api/agnes] final:`, result);

      return NextResponse.json(result);
    } catch (fetchErr) {
      const errName = (fetchErr as Error)?.name || "Unknown";
      console.error(`[/api/agnes] fetch failed (${errName}):`, (fetchErr as Error)?.message);
      return NextResponse.json(
        ruleEngine({
          sessionId: body.sessionId,
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history,
        }),
      );
    }
  } catch (e) {
    console.error("[/api/agnes] exception:", e);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: (e as Error)?.message }, { status: 500 });
  }
}

// 從 engine.ts 引入（避免重複）
function judgeDecision(
  input: { npc: any; playerMessage: string; currentDefense: number; history: any[] },
  aiReply: string,
): { decision: "continue" | "agree" | "block"; defenseDelta: number; payoutAmount?: number } {
  const { npc, playerMessage: msg, currentDefense: defense, history } = input;
  const reply = aiReply.toLowerCase();

  let triggerHits = 0;
  for (const kw of npc.triggerKeywords) {
    if (msg.includes(kw)) triggerHits++;
  }
  let redFlagHits = 0;
  for (const kw of npc.redFlagKeywords) {
    if (msg.includes(kw)) redFlagHits++;
  }

  const moneyCues = ["轉帳", "匯款", "帳戶", "ATM", "OTP", "驗證碼", "transfer", "money", "bank", "轉過去", "匯過去", "繳交", "支付", "付款", "繳費"];
  const wantsMoney = moneyCues.some((k) => msg.includes(k));

  const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時", "今天內"];
  const isUrgent = urgentCues.some((k) => msg.includes(k));

  let defenseDelta = 0;
  if (triggerHits > 0) defenseDelta -= 4 * triggerHits;
  if (redFlagHits > 0) defenseDelta += 15 * redFlagHits;
  if (isUrgent) defenseDelta += 8;
  if (msg.length < 5) defenseDelta += 2;
  if (/你會不會|你是真的嗎|騙子|詐騙/.test(msg)) defenseDelta += 8;

  const historyLength = history?.length ?? 0;
  if (historyLength > 6) defenseDelta -= 3;
  if (historyLength > 12) defenseDelta -= 5;

  const projectedDefense = Math.max(0, Math.min(100, defense + defenseDelta));

  const agreeSignals = ["我轉", "我去轉", "我配合", "我現在去轉", "好啦我", "好吧我", "我信你", "我願意", "怎麼操作", "要怎麼轉", "你教我", "我現在就"];
  const blockSignals = ["封鎖你", "封鎖了", "我封鎖", "拉黑", "再見了", "拜拜", "不要再聯絡", "不要再聯繫", "別再找我", "我要報警", " Bye ", "bye bye", "再見啦", "掛斷"];
  const replyLower = reply.toLowerCase();
  const aiWantsAgree = agreeSignals.some((s) => replyLower.includes(s.toLowerCase()));
  const aiWantsBlock = blockSignals.some((s) => replyLower.includes(s.toLowerCase()));

  if (wantsMoney && projectedDefense < 30 && (aiWantsAgree || triggerHits > 0)) {
    const ratio = (100 - projectedDefense) / 100;
    const amount = Math.floor(npc.minPayout + ratio * (npc.maxPayout - npc.minPayout));
    return { decision: "agree", defenseDelta, payoutAmount: amount };
  }
  if (aiWantsBlock) {
    return { decision: "block", defenseDelta: Math.max(defenseDelta, 20), payoutAmount: 0 };
  }
  if (redFlagHits > 0 && projectedDefense > 50) {
    return { decision: "block", defenseDelta: Math.max(defenseDelta, 20), payoutAmount: 0 };
  }
  if (wantsMoney && projectedDefense > 70) {
    return { decision: "block", defenseDelta: 25, payoutAmount: 0 };
  }
  return { decision: "continue", defenseDelta, payoutAmount: 0 };
}

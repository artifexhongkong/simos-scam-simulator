import { NextRequest, NextResponse } from "next/server";
import { NPCS } from "@/lib/game/npcs";
import { judgeDecision, type AgnesDecision, type AgnesMessage } from "@/lib/agnes/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGNES_API_KEY = process.env.AGNES_API_KEY || process.env.NEXT_PUBLIC_AGNES_API_KEY || "";
const AGNES_BASE_URL = (process.env.AGNES_BASE_URL || process.env.NEXT_PUBLIC_AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1").replace(/\/$/, "");
const AGNES_MODEL = process.env.AGNES_MODEL || process.env.NEXT_PUBLIC_AGNES_MODEL || "agnes-2.5-flash";
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

const SYSTEM_PROMPT = (npcBackground: string, npcName: string, npcPersonality: string, defense: number, maxPayout: number, minPayout: number) => `你現在是詐騙模擬遊戲中的普通市民「${npcName}」，正在通過手機訊息 App（類似 WhatsApp/iMessage）與對方文字聊天。

重要規則：
- 全程使用繁體中文回應，絕對不可以使用英文（除非是角色背景中的專有名詞如 IG、KOL、Grab 等）
- 這是純文字訊息對話，不是面對面交談。你不會說「進來坐」「來我家」等面對面用語
- 你的回應就像在手機上打字回覆陌生人訊息一樣自然

角色設定:
- ${npcBackground}
- 個性: ${npcPersonality}
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
6. 你最多願意被騙 ${maxPayout}，最少 ${minPayout}。
7. **記憶規則**：你必須記住對方在之前對話中說過的所有內容。如果對方說過自己的名字、身分、關係，你在後續回應中必須保持一致，不可以忘記或否認對方之前說過的話。
8. 這是陌生人通過訊息 App 的初次接觸，你的第一反應應該是疑惑對方是誰、怎麼有你的號碼，而不是熱情招待。`;

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
      // 沒有 API key → 返回錯誤（不 fallback）
      return NextResponse.json({ error: "NO_API_KEY", message: "未設定 API Key" }, { status: 503 });
    }

    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT(npc.background, npc.displayName, npc.hiddenPersonality, body.currentDefense, npc.maxPayout, npc.minPayout) },
      ...history.slice(-12).map((m) => ({
        role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: body.playerMessage },
    ];

    console.log(`[/api/agnes] session: ${body.sessionId}, npc: ${npc.displayName}, defense: ${body.currentDefense}, history: ${history.length}`);

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
        // 返回錯誤（不 fallback 到 ruleEngine）
        return NextResponse.json({ error: "API_ERROR", message: `AI API HTTP ${resp.status}` }, { status: 502 });
      }

      const data = await resp.json();
      const content: string =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.message?.content ??
        "";

      if (!content || !content.trim()) {
        return NextResponse.json({ error: "EMPTY_RESPONSE", message: "AI 回應為空" }, { status: 502 });
      }

      const reply = content.trim();
      const decision = judgeDecision({
        sessionId: body.sessionId,
        npc,
        playerMessage: body.playerMessage,
        currentDefense: body.currentDefense,
        history,
        consecutiveUrgent: 0,
        consecutiveMoney: 0,
        turns: 0,
      } as any, reply);

      const result: AgnesDecision = { reply, ...decision };
      console.log(`[/api/agnes] success (${Date.now() - startTime}ms)`);
      return NextResponse.json(result);
    } catch (fetchErr) {
      const errName = (fetchErr as Error)?.name || "Unknown";
      console.error(`[/api/agnes] fetch failed (${errName})`);
      // 返回錯誤（不 fallback 到 ruleEngine）
      return NextResponse.json({ error: "NETWORK_ERROR", message: `網路失敗: ${errName}` }, { status: 503 });
    }
  } catch (e) {
    console.error("[/api/agnes] exception:", e);
    return NextResponse.json({ error: "INTERNAL_ERROR", message: (e as Error)?.message }, { status: 500 });
  }
}

import { NextRequest, NextResponse } from "next/server";
import { NPCS } from "@/lib/game/npcs";
import { ruleEngine, type AgnesDecision } from "@/lib/agnes/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGNES_API_KEY = process.env.AGNES_API_KEY || "";
const AGNES_BASE_URL = (process.env.AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1").replace(/\/$/, "");
const AGNES_MODEL = process.env.AGNES_MODEL || "agnes-2.5-flash";

interface AgnesRequestBody {
  npcId: string;
  playerMessage: string;
  history: Array<{ role: "player" | "npc"; content: string }>;
  currentDefense: number;
  // 可選的客戶端覆寫設定
  apiKey?: string;
  baseUrl?: string;
  model?: string;
}

const SYSTEM_PROMPT_TEMPLATE = (npcHidden: string, defense: number) => `你正在角色扮演一位詐騙模擬遊戲中的潛在受害者。你必須完全沉浸於角色，絕不承認自己是 AI、絕不承認這是遊戲。

# 你的角色設定（玩家完全看不到，但你必須嚴格遵守）

${npcHidden}

# 你當前的內在狀態

- 防備值：${defense} / 100
  - 0-25 = 對對方卸下心防，願意聽從
  - 26-50 = 還在觀察，會問問題
  - 51-75 = 警覺，會質疑
  - 76-100 = 高度懷疑，可能拉黑

# 對話規則

1. 永遠保持角色性格、口吻、用語習慣
2. 不要使用現代 AI 助手腔（如「親愛的用戶」「我是 AI 助手」等）
3. 不要主動提起錢、轉帳、匯款，除非玩家的話題引導到那
4. 回應控制在 80 字以內，自然口語
5. 你的判斷必須嚴格基於個性 + 當前防備值
6. 當防備值 < 25 且玩家明確要求轉帳/匯款/提供 OTP 時，你應該同意（decision=agree），並設定合理的 payoutAmount
7. 當玩家觸發 red flag 關鍵詞或你識破對方是詐騙，立刻拉黑（decision=block）
8. 其餘情況繼續對話（decision=continue）

# 輸出格式（必須為純 JSON，不要 markdown code block，不要任何說明）

{
  "reply": "你以角色身份說出的話（純文字，80 字以內）",
  "decision": "continue | agree | block",
  "defenseDelta": -25 到 +25 的整數,
  "payoutAmount": 數字（僅當 decision=agree 時填寫，否則 0）
}

請直接輸出 JSON，不要加 \`\`\`json 標記，不要加說明文字。`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgnesRequestBody;
    const npc = NPCS.find((n) => n.id === body.npcId);
    if (!npc) {
      return NextResponse.json({ error: "NPC not found" }, { status: 404 });
    }

    // 客戶端可覆寫設定
    const apiKey = body.apiKey || AGNES_API_KEY;
    const baseUrl = (body.baseUrl || AGNES_BASE_URL).replace(/\/$/, "");
    const model = body.model || AGNES_MODEL;

    // 沒有 API key → 直接使用規則引擎
    if (!apiKey) {
      const result = ruleEngine({
        npc,
        playerMessage: body.playerMessage,
        currentDefense: body.currentDefense,
        history: body.history,
      });
      return NextResponse.json(result);
    }

    // 組裝 messages
    const messages = [
      {
        role: "system",
        content: SYSTEM_PROMPT_TEMPLATE(npc.hiddenPersonality, body.currentDefense),
      },
      ...body.history.slice(-12).map((m) => ({
        role: m.role === "player" ? "user" : "assistant",
        content: m.content,
      })),
      {
        role: "user",
        content: body.playerMessage,
      },
    ];

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
          temperature: 0.88,
          max_tokens: 400,
          stream: false,
        }),
        signal: AbortSignal.timeout(12000),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error("[Agnes API] error", resp.status, errText);
        return NextResponse.json(
          ruleEngine({
            npc,
            playerMessage: body.playerMessage,
            currentDefense: body.currentDefense,
            history: body.history,
          }),
        );
      }

      const data = await resp.json();
      const content: string =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.message?.content ??
        "";

      if (!content) {
        return NextResponse.json(
          ruleEngine({
            npc,
            playerMessage: body.playerMessage,
            currentDefense: body.currentDefense,
            history: body.history,
          }),
        );
      }

      // 解析 JSON
      let raw = content.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return NextResponse.json(
          ruleEngine({
            npc,
            playerMessage: body.playerMessage,
            currentDefense: body.currentDefense,
            history: body.history,
          }),
        );
      }

      let parsed: AgnesDecision;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        return NextResponse.json(
          ruleEngine({
            npc,
            playerMessage: body.playerMessage,
            currentDefense: body.currentDefense,
            history: body.history,
          }),
        );
      }

      // 驗證
      if (!["continue", "agree", "block"].includes(parsed.decision)) {
        parsed.decision = "continue";
      }
      if (parsed.decision === "agree") {
        const amt = Number(parsed.payoutAmount) || npc.minPayout;
        parsed.payoutAmount = Math.max(npc.minPayout, Math.min(npc.maxPayout, amt));
      } else {
        parsed.payoutAmount = 0;
      }
      parsed.defenseDelta = Math.max(-25, Math.min(25, Number(parsed.defenseDelta) || 0));

      if (!parsed.reply || typeof parsed.reply !== "string") {
        return NextResponse.json(
          ruleEngine({
            npc,
            playerMessage: body.playerMessage,
            currentDefense: body.currentDefense,
            history: body.history,
          }),
        );
      }

      return NextResponse.json(parsed);
    } catch (fetchErr) {
      console.error("[Agnes route] fetch failed, using fallback", fetchErr);
      return NextResponse.json(
        ruleEngine({
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history: body.history,
        }),
      );
    }
  } catch (e) {
    console.error("[Agnes route] exception", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

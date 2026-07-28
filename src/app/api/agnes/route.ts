import { NextRequest, NextResponse } from "next/server";
import { NPCS } from "@/lib/game/npcs";
import { ruleEngine, type AgnesDecision, type AgnesMessage } from "@/lib/agnes/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const AGNES_API_KEY = process.env.AGNES_API_KEY || "";
const AGNES_BASE_URL = (process.env.AGNES_BASE_URL || "https://apihub.agnes-ai.com/v1").replace(/\/$/, "");
const AGNES_MODEL = process.env.AGNES_MODEL || "agnes-2.5-flash";
const AGNES_TEMPERATURE = parseFloat(process.env.AGNES_TEMPERATURE || "0.85");

/**
 * 前端 POST /api/agnes 的 Request Body 結構
 * 前後端參數名稱嚴格一致（camelCase）
 */
interface AgnesRequestBody {
  sessionId: string; // 對話 session ID
  npcId: string;
  playerMessage: string;
  messageHistory: AgnesMessage[]; // 完整歷史（不含本次 playerMessage）
  currentDefense: number;
  temperature?: number;
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
9. **極重要**：你必須閱讀並記住前面的對話歷史，回應要有上下文連貫性，不可重複已說過的話、不可無視玩家前一句話的內容

# 輸出格式（必須為純 JSON，不要 markdown code block，不要任何說明）

{
  "reply": "你以角色身份說出的話（純文字，80 字以內）",
  "decision": "continue | agree | block",
  "defenseDelta": -25 到 +25 的整數,
  "payoutAmount": 數字（僅當 decision=agree 時填寫，否則 0）
}

請直接輸出 JSON，不要加 \`\`\`json 標記，不要加說明文字。`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = (await req.json()) as AgnesRequestBody;
    const npc = NPCS.find((n) => n.id === body.npcId);

    if (!npc) {
      console.error("[/api/agnes] NPC not found:", body.npcId);
      return NextResponse.json(
        { error: "NPC_NOT_FOUND", message: `NPC not found: ${body.npcId}` },
        { status: 404 },
      );
    }

    // 客戶端可覆寫設定
    const apiKey = body.apiKey || AGNES_API_KEY;
    const baseUrl = (body.baseUrl || AGNES_BASE_URL).replace(/\/$/, "");
    const model = body.model || AGNES_MODEL;
    const temperature = body.temperature ?? AGNES_TEMPERATURE;
    const history = body.messageHistory ?? [];

    // 沒有 API key → 直接使用規則引擎
    if (!apiKey) {
      console.warn(`[/api/agnes] no API key, using rule engine. session=${body.sessionId} npc=${body.npcId}`);
      const result = ruleEngine({
        sessionId: body.sessionId,
        npc,
        playerMessage: body.playerMessage,
        currentDefense: body.currentDefense,
        history,
      });
      return NextResponse.json(result);
    }

    // 組裝 messages：[system] + [全部歷史] + [玩家最新輸入]
    const messages: Array<{ role: "system" | "user" | "assistant"; content: string }> = [
      { role: "system", content: SYSTEM_PROMPT_TEMPLATE(npc.hiddenPersonality, body.currentDefense) },
      ...history.slice(-20).map((m) => ({
        role: (m.role === "player" ? "user" : "assistant") as "user" | "assistant",
        content: m.content,
      })),
      { role: "user", content: body.playerMessage },
    ];

    // === 除錯日誌：完整送入模型的 Prompt 內容 ===
    console.log(`[/api/agnes] ====== LLM CALL ======`);
    console.log(`[/api/agnes] session: ${body.sessionId}`);
    console.log(`[/api/agnes] npc: ${npc.displayName} (defense=${body.currentDefense})`);
    console.log(`[/api/agnes] model: ${model}, temperature: ${temperature}`);
    console.log(`[/api/agnes] history length: ${history.length}`);
    console.log(`[/api/agnes] player message: ${body.playerMessage}`);
    console.log(`[/api/agnes] total messages to LLM: ${messages.length}`);
    console.log(
     `[/api/agnes] messages preview:`,
      messages.map((m) => ({ role: m.role, contentPreview: m.content.slice(0, 80) })),
    );

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
          max_tokens: 400,
          stream: false,
        }),
        signal: AbortSignal.timeout(15000),
      });

      if (!resp.ok) {
        const errText = await resp.text().catch(() => "");
        console.error(`[/api/agnes] Agnes API HTTP error ${resp.status}:`, errText.slice(0, 500));
        // 失敗 → fallback
        const fallback = ruleEngine({
          sessionId: body.sessionId,
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history,
        });
        return NextResponse.json(fallback);
      }

      const data = await resp.json();
      const content: string =
        data?.choices?.[0]?.message?.content ??
        data?.choices?.[0]?.text ??
        data?.message?.content ??
        "";

      console.log(`[/api/agnes] LLM raw response:`, content.slice(0, 300));
      console.log(`[/api/agnes] elapsed: ${Date.now() - startTime}ms`);

      if (!content) {
        console.error("[/api/agnes] LLM returned empty content");
        const fallback = ruleEngine({
          sessionId: body.sessionId,
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history,
        });
        return NextResponse.json(fallback);
      }

      // 解析 JSON（可能被包在 ```json ... ``` 內）
      let raw = content.trim();
      if (raw.startsWith("```")) {
        raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim();
      }
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error("[/api/agnes] no JSON found in LLM response");
        const fallback = ruleEngine({
          sessionId: body.sessionId,
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history,
        });
        return NextResponse.json(fallback);
      }

      let parsed: AgnesDecision;
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch (e) {
        console.error("[/api/agnes] JSON parse failed:", e, "raw:", jsonMatch[0].slice(0, 200));
        const fallback = ruleEngine({
          sessionId: body.sessionId,
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history,
        });
        return NextResponse.json(fallback);
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
        const fallback = ruleEngine({
          sessionId: body.sessionId,
          npc,
          playerMessage: body.playerMessage,
          currentDefense: body.currentDefense,
          history,
        });
        return NextResponse.json(fallback);
      }

      console.log(`[/api/agnes] success:`, parsed);
      return NextResponse.json(parsed);
    } catch (fetchErr) {
      // 區分超時與其他錯誤
      const errName = (fetchErr as Error)?.name || "Unknown";
      const errMsg = (fetchErr as Error)?.message || "";
      if (errName === "TimeoutError" || errName === "AbortError") {
        console.error(`[/api/agnes] Agnes API TIMEOUT after ${Date.now() - startTime}ms`);
      } else {
        console.error(`[/api/agnes] fetch failed (${errName}):`, errMsg);
      }
      const fallback = ruleEngine({
        sessionId: body.sessionId,
        npc,
        playerMessage: body.playerMessage,
        currentDefense: body.currentDefense,
        history,
      });
      return NextResponse.json(fallback);
    }
  } catch (e) {
    console.error("[/api/agnes] route exception:", e);
    return NextResponse.json(
      { error: "INTERNAL_ERROR", message: (e as Error)?.message || "Internal error" },
      { status: 500 },
    );
  }
}

import { NextRequest, NextResponse } from "next/server";
import { NPCS } from "@/lib/game/npcs";
import { ruleEngine, type AgnesDecision } from "@/lib/agnes/engine";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Agnes AI API key 從環境變數讀取（不會暴露到前端）
const AGNES_API_KEY = process.env.AGNES_API_KEY || "";
const AGNES_BASE_URL = process.env.AGNES_BASE_URL || "https://api.agnes.ai/v1";
const AGNES_MODEL = process.env.AGNES_MODEL || "agnes-pro";

interface AgnesRequestBody {
  npcId: string;
  playerMessage: string;
  history: Array<{ role: "player" | "npc"; content: string }>;
  currentDefense: number;
}

const SYSTEM_PROMPT_TEMPLATE = (npcHidden: string, defense: number) => `你現在正在角色扮演一個 NPC，這個 NPC 是詐騙模擬遊戲中的潛在受害者。你必須完全按照下面這個角色的個性來回應玩家。

${npcHidden}

=== 當前 NPC 內在狀態 ===
當前防備值：${defense} / 100（0 = 完全卸下心防，100 = 高度警覺）
這個數值會影響你對玩家訊息的反應。防備值越低，你越傾向信任對方。

=== 你必須遵守的規則 ===
1. 你必須始終維持角色，不要承認自己是 AI 或承認這是模擬
2. 根據你的個性 + 當前防備值自然地回應玩家，回應不要超過 80 字
3. 不要主動提起錢或轉帳，除非玩家的話題已經引導到那
4. 你的判斷必須嚴格依照你的個性設定與防備值

=== 你必須輸出的 JSON 結構 ===
每次回應必須輸出符合以下格式的 JSON（不要輸出任何其他內容）：
{
  "reply": "你以角色身份說出的話（純文字，不超過 80 字）",
  "decision": "continue | agree | block",
  "defenseDelta": -20 ~ +20 的整數,
  "payoutAmount": 數字（僅當 decision=agree 時填寫，否則為 0）
}

decision 三種狀態的觸發條件：
- continue：玩家還沒說服你，繼續對話。你還在觀察
- agree：你被說服了，願意按玩家要求轉帳 / 匯款 / 提供 OTP 等。必須設定 payoutAmount 為合理金額（基於你的 maxPayout 與你被說服的程度）
- block：你識破對方是詐騙，將對方拉黑，終止對話

defenseDelta 的決定原則：
- 玩家說中你的 triggerKeywords 或展現共鳴：-5 ~ -15
- 玩家觸發你的 redFlagKeywords：+10 ~ +25
- 玩家說廢話或沒有重點：+0 ~ +3
- 玩家表現粗魯或催促：+5 ~ +15

輸出 JSON 後立即停止，不要加任何說明。`;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as AgnesRequestBody;
    const npc = NPCS.find((n) => n.id === body.npcId);
    if (!npc) {
      return NextResponse.json({ error: "NPC not found" }, { status: 404 });
    }

    // 沒有 API key → 直接使用規則引擎
    if (!AGNES_API_KEY) {
      const result = ruleEngine({
        npc,
        playerMessage: body.playerMessage,
        currentDefense: body.currentDefense,
        history: body.history,
      });
      return NextResponse.json(result);
    }

    // 組裝訊息陣列
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

    // 嘗試呼叫 Agnes AI（若 endpoint 無法連線，自動 fallback 到內建規則引擎）
    try {
      const resp = await fetch(`${AGNES_BASE_URL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${AGNES_API_KEY}`,
        },
        body: JSON.stringify({
          model: AGNES_MODEL,
          messages,
          temperature: 0.85,
          max_tokens: 400,
          response_format: { type: "json_object" },
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (!resp.ok) {
        const errText = await resp.text();
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
      const content = data?.choices?.[0]?.message?.content ?? "";

      let parsed: AgnesDecision;
      try {
        parsed = JSON.parse(content);
      } catch {
        const match = content.match(/\{[\s\S]*\}/);
        if (match) {
          try {
            parsed = JSON.parse(match[0]);
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
        } else {
          return NextResponse.json(
            ruleEngine({
              npc,
              playerMessage: body.playerMessage,
              currentDefense: body.currentDefense,
              history: body.history,
            }),
          );
        }
      }

      // 安全約束 payout
      if (parsed.decision === "agree") {
        const amt = Number(parsed.payoutAmount) || npc.minPayout;
        parsed.payoutAmount = Math.max(npc.minPayout, Math.min(npc.maxPayout, amt));
      } else {
        parsed.payoutAmount = 0;
      }
      parsed.defenseDelta = Math.max(-25, Math.min(25, Number(parsed.defenseDelta) || 0));

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

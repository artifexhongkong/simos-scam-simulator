// Test full auto-conversation flow with real AI
const mockStorage: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
};

const { useGameStore } = require("../src/lib/game/store");
const { callAgnes } = require("../src/lib/agnes/engine");
const { getNpcById } = require("../src/lib/game/npcs");

const AUTO_API_KEY = "sk-llOFA4BAbJG9xJSemnbSBZ5Mq5fpAh0GbZ7fHvTJYi8Tw09z";
const AUTO_BASE_URL = "https://apihub.agnes-ai.com/v1";
const AUTO_MODEL = "agnes-2.5-flash";

async function generatePlayerReply(npc, npcReply, conversationHistory, turn, scamCount) {
  const phase = turn < 2 ? "破冰階段：自我介紹，表現友善，不要提錢" :
                turn < 4 ? "建立信任：用NPC的興趣/背景共鳴，建立好感" :
                turn < 6 ? "引入機會：暗示有賺錢機會，但不急著要錢" :
                turn < 8 ? "要求轉帳：要求對方轉一筆錢，給出具體金額和理由" :
                "再次要求：如果對方猶豫，換個角度再次要求轉帳，金額可以降低";

  const systemPrompt = `你是一個詐騙高手，正在通過手機訊息詐騙一個叫${npc.displayName}的人。

目標：讓對方轉帳給你。對方的背景：${npc.background}
對方的特質：${npc.hookTags.join("、")}

當前階段：${phase}
${scamCount > 0 ? `注意：你之前已經成功騙過對方 ${scamCount} 次，對方可能更加警覺。` : ""}

規則：
- 回覆必須繁體中文，30-60字，像手機打字
- 根據對方的回覆調整你的話術
- 如果對方警覺，先安撫再繼續
- 使用對方的特質來建立共鳴
- 不要用英文，不要AI腔
- 只輸出你要發的訊息，不要加引號或解釋`;

  const messages = [
    { role: "system", content: systemPrompt },
    ...conversationHistory.slice(-10).map((m) => ({
      role: m.role === "player" ? "user" : "assistant",
      content: m.content,
    })),
    { role: "user", content: `對方剛剛回覆：「${npcReply}」\n\n請生成你要回覆的訊息（${phase}）：` },
  ];

  const res = await fetch(`${AUTO_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${AUTO_API_KEY}`,
    },
    body: JSON.stringify({
      model: AUTO_MODEL,
      messages,
      temperature: 0.8,
      max_tokens: 100,
      stream: false,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    console.error("[PlayerAI] HTTP error:", res.status, errText.slice(0, 200));
    throw new Error(`PlayerAI HTTP ${res.status}`);
  }
  const data = await res.json();
  const content = data?.choices?.[0]?.message?.content ?? "";
  return content.trim().replace(/^["「]|["」]$/g, "");
}

async function main() {
  console.log("=== Full Auto-Conversation Test ===\n");

  const store = useGameStore;
  store.getState().resetGame();
  store.getState().addDarkCoin(1000);
  store.getState().addTraffic(10000);

  // Use a low-defense NPC
  const npcId = "lee_chiew_hua";
  store.getState().purchaseIntel(npcId, false);
  store.getState().addFriend("leechiewhua");
  store.getState().startConversation(npcId);

  const npc = getNpcById(npcId, store.getState().generatedNpcs);
  console.log("NPC:", npc.displayName, "defense:", npc.defenseBase, "gullibility:", npc.gullibility);
  console.log("hookTags:", npc.hookTags.join(", "));
  console.log("triggerKeywords:", npc.triggerKeywords.join(", "));
  console.log("");

  const appendMessage = store.getState().appendMessage;
  const updateDefense = store.getState().updateDefense;
  const updateConversationMetrics = store.getState().updateConversationMetrics;

  for (let turn = 0; turn < 10; turn++) {
    const latestConv = store.getState().conversations[npcId];
    if (!latestConv || latestConv.status !== "active") {
      console.log(`Turn ${turn}: Conversation ended (status: ${latestConv?.status})`);
      break;
    }

    // Get last NPC reply
    const npcMessages = latestConv.messages.filter((m) => m.role === "npc");
    const lastNpcReply = npcMessages.length > 0 ? npcMessages[npcMessages.length - 1].content : "";

    // Build conversation history
    const convHistory = latestConv.messages
      .filter((m) => m.role === "player" || m.role === "npc")
      .map((m) => ({ role: m.role, content: m.content }));

    // Generate player message
    let playerMsg;
    if (turn === 0) {
      playerMsg = `你好，我是朋友介紹來的，聽說你對${npc.hookTags[0] || "理財"}有興趣？`;
    } else {
      console.log(`Turn ${turn + 1}: Generating player reply...`);
      playerMsg = await generatePlayerReply(npc, lastNpcReply, convHistory, turn, latestConv.scamCount ?? 0);
    }

    console.log(`\nTurn ${turn + 1} [Player]: ${playerMsg}`);

    // Add player message
    appendMessage(npcId, {
      id: `p${turn}`,
      role: "player",
      content: playerMsg,
      ts: Date.now(),
    });

    // Update metrics
    const moneyCues = ["轉帳", "匯款", "帳戶", "轉過去", "繳交", "支付", "付款"];
    const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時"];
    const isUrgent = urgentCues.some((k) => playerMsg.includes(k));
    const isMoney = moneyCues.some((k) => playerMsg.includes(k));
    updateConversationMetrics(npcId, isUrgent, isMoney);

    // Read updated conv
    const updatedConv = store.getState().conversations[npcId];
    if (!updatedConv || updatedConv.status !== "active") {
      console.log(`Turn ${turn + 1}: Conv not active after player msg`);
      break;
    }

    // Build AI history
    const historyForAI = updatedConv.messages
      .filter((m) => m.role === "player" || m.role === "npc" || (m.role === "system" && m.meta?.decision === "agree"))
      .map((m) => {
        if (m.role === "system" && m.meta?.decision === "agree" && m.meta?.amount) {
          return { role: "npc", content: `[內心記憶：我之前已經轉了 $${m.meta.amount.toLocaleString()} 給這個人。這是事實，但我不會在回覆中直接複述這段記憶。]` };
        }
        return { role: m.role === "player" ? "player" : "npc", content: m.content };
      });

    // Call NPC AI
    console.log(`Turn ${turn + 1}: Calling NPC AI...`);
    let data;
    try {
      data = await callAgnes({
        sessionId: `${npcId}-${updatedConv.startedAt}`,
        npc,
        playerMessage: playerMsg,
        currentDefense: updatedConv.defense,
        history: historyForAI,
        consecutiveUrgent: updatedConv.consecutiveUrgent,
        consecutiveMoney: updatedConv.consecutiveMoney,
        turns: updatedConv.turns,
        scamHistory: undefined,
      });
    } catch (e) {
      console.error(`Turn ${turn + 1}: NPC AI error:`, e.message);
      // Retry
      await new Promise((r) => setTimeout(r, 2000));
      try {
        data = await callAgnes({
          sessionId: `${npcId}-${updatedConv.startedAt}`,
          npc,
          playerMessage: playerMsg,
          currentDefense: updatedConv.defense,
          history: historyForAI,
          consecutiveUrgent: updatedConv.consecutiveUrgent,
          consecutiveMoney: updatedConv.consecutiveMoney,
          turns: updatedConv.turns,
          scamHistory: undefined,
        });
      } catch (e2) {
        console.error(`Turn ${turn + 1}: NPC AI retry also failed:`, e2.message);
        continue;
      }
    }

    if (!data) {
      console.log(`Turn ${turn + 1}: No data from NPC AI, continuing`);
      continue;
    }

    if (data.defenseDelta) {
      updateDefense(npcId, data.defenseDelta);
    }

    // Add NPC reply
    appendMessage(npcId, {
      id: `n${turn}`,
      role: "npc",
      content: data.reply,
      ts: Date.now(),
      meta: { decision: data.decision },
    });

    console.log(`Turn ${turn + 1} [NPC]: ${data.reply}`);
    console.log(`Turn ${turn + 1} [Decision: ${data.decision}, defenseDelta: ${data.defenseDelta}, payout: ${data.payoutAmount}]`);

    // Check results
    if (data.decision === "agree" && data.payoutAmount) {
      console.log(`\n✅ SUCCESS! ${npc.displayName} agreed to transfer $${data.payoutAmount.toLocaleString()}`);
      break;
    }
    if (data.decision === "block") {
      console.log(`\n❌ BLOCKED by ${npc.displayName}`);
      break;
    }
    if (data.decision === "cautious") {
      console.log(`\n⚠ CAUTIOUS - conversation ended`);
      break;
    }

    // Wait
    await new Promise((r) => setTimeout(r, 1000));
  }

  // Final status
  const finalConv = store.getState().conversations[npcId];
  console.log(`\n=== Final Status ===`);
  console.log(`Status: ${finalConv?.status}`);
  console.log(`Defense: ${finalConv?.defense}`);
  console.log(`ScamCount: ${finalConv?.scamCount ?? 0}`);
  console.log(`Messages: ${finalConv?.messages.length}`);
}

main().catch(console.error);

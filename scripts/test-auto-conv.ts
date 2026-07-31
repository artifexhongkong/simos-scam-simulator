// Test auto-conversation AI (player side)
const AUTO_API_KEY = "sk-llOFA4BAbJG9xJSemnbSBZ5Mq5fpAh0GbZ7fHvTJYi8Tw09z";
const AUTO_BASE_URL = "https://apihub.agnes-ai.com/v1";
const AUTO_MODEL = "agnes-2.5-flash";

async function testPlayerAI() {
  console.log("=== Test: Auto-conversation player AI ===\n");

  const testNpc = {
    displayName: "李秀華",
    background: "退休華文教師，獨居於檳城老家。剛領到這個月的退休金 RM 8,000，最近在群組裡得知一個「高息理財」的訊息。",
    hookTags: ["退休金", "理財", "女兒在外", "獨居"],
  };

  // Simulate conversation
  const npcReplies = [
    "你好，請問你是哪位？我不認識你",
    "哦？理財？我是有在群組看到一些訊息啦，但不太懂",
    "真的嗎？利息那麼高？我的退休金存著也是存著...",
  ];

  let history: { role: string; content: string }[] = [];

  for (let turn = 0; turn < 5; turn++) {
    const phase = turn < 2 ? "破冰階段：自我介紹，表現友善，不要提錢" :
                  turn < 4 ? "建立信任：用NPC的興趣/背景共鳴，建立好感" :
                  turn < 6 ? "引入機會：暗示有賺錢機會，但不急著要錢" :
                  turn < 8 ? "要求轉帳：要求對方轉一筆錢，給出具體金額和理由" :
                  "再次要求：如果對方猶豫，換個角度再次要求轉帳，金額可以降低";

    const systemPrompt = `你是一個詐騙高手，正在通過手機訊息詐騙一個叫${testNpc.displayName}的人。

目標：讓對方轉帳給你。對方的背景：${testNpc.background}
對方的特質：${testNpc.hookTags.join("、")}

當前階段：${phase}

規則：
- 回覆必須繁體中文，30-60字，像手機打字
- 根據對方的回覆調整你的話術
- 如果對方警覺，先安撫再繼續
- 使用對方的特質來建立共鳴
- 不要用英文，不要AI腔
- 只輸出你要發的訊息，不要加引號或解釋`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...history.slice(-10).map((m) => ({
        role: m.role === "player" ? "user" : "assistant",
        content: m.content,
      })),
    ];

    if (turn === 0) {
      // First message: use fixed opener
      const opener = `你好，我是朋友介紹來的，聽說你對${testNpc.hookTags[0]}有興趣？`;
      console.log(`Turn ${turn + 1} [Player]: ${opener}`);
      history.push({ role: "player", content: opener });

      // Simulate NPC reply
      if (turn < npcReplies.length) {
        console.log(`Turn ${turn + 1} [NPC]: ${npcReplies[turn]}`);
        history.push({ role: "npc", content: npcReplies[turn] });
      }
    } else {
      // Use AI to generate player reply
      const lastNpcReply = history.filter((m) => m.role === "npc").pop()?.content || "";
      messages.push({ role: "user", content: `對方剛剛回覆：「${lastNpcReply}」\n\n請生成你要回覆的訊息（${phase}）：` });

      console.log(`\nCalling AI for turn ${turn + 1}...`);
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
        console.log(`❌ AI HTTP ${res.status}: ${await res.text()}`);
        break;
      }

      const data = await res.json();
      const playerReply = (data?.choices?.[0]?.message?.content ?? "").trim().replace(/^["「]|["」]$/g, "");

      console.log(`Turn ${turn + 1} [Player AI]: ${playerReply}`);
      history.push({ role: "player", content: playerReply });

      // Simulate NPC reply (if available)
      if (turn < npcReplies.length) {
        console.log(`Turn ${turn + 1} [NPC sim]: ${npcReplies[turn]}`);
        history.push({ role: "npc", content: npcReplies[turn] });
      } else {
        console.log(`Turn ${turn + 1} [NPC sim]: 好吧，那要怎麼操作？`);
        history.push({ role: "npc", content: "好吧，那要怎麼操作？" });
      }
    }

    await new Promise((r) => setTimeout(r, 500));
  }

  console.log("\n=== Test complete ===");
  console.log("Conversation flow looks natural?" );
  console.log("Player AI adapts to NPC responses?");
}

testPlayerAI().catch(console.error);

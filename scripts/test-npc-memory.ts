// Test NPC remembers transfer after scam success
const mockStorage: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
};

import { callAgnes } from "../src/lib/agnes/engine";
import type { NpcProfile } from "../src/lib/game/npcs";

const testNpc: NpcProfile = {
  id: "test",
  displayName: "李秀華",
  telechatId: "test",
  avatar: "👵",
  age: 68,
  background: "退休教師",
  hookTags: ["退休金"],
  price: 50,
  hiddenPersonality: "你是李秀華，68歲退休教師。",
  defenseBase: 35,
  gullibility: 65,
  maxPayout: 8000,
  minPayout: 500,
  triggerKeywords: ["退休金"],
  redFlagKeywords: ["OTP"],
};

async function main() {
  console.log("=== Test: NPC remembers transfer ===\n");

  // Test 1: WITHOUT scam history (first conversation)
  console.log("--- Test 1: First message (no transfer history) ---");
  const r1 = await callAgnes({
    sessionId: "test1",
    npc: testNpc,
    playerMessage: "你好",
    currentDefense: 35,
    history: [],
    scamHistory: undefined,
  });
  console.log("NPC:", r1.reply);
  console.log("Mentions transfer?", r1.reply.includes("轉") || r1.reply.includes("錢") ? "YES" : "NO (expected)");

  // Test 2: WITH scam history (after transfer)
  console.log("\n--- Test 2: After transfer (with scam history) ---");
  const scamHistory = "你之前已經轉過錢給這個陌生人，共 1 次，總計 $5,000。轉帳記錄：$5,000。";
  const r2 = await callAgnes({
    sessionId: "test2",
    npc: testNpc,
    playerMessage: "你好",
    currentDefense: 55,
    history: [
      { role: "player", content: "你好" },
      { role: "npc", content: "你好，請問你是？" },
      { role: "player", content: "我是銀行客服，有一筆退款要給您" },
      { role: "npc", content: "退款？什麼退款？" },
      { role: "player", content: "需要您先轉 $5000 驗證帳戶" },
      { role: "npc", content: "好吧，我轉給你" },
    ],
    scamHistory,
  });
  console.log("NPC:", r2.reply);
  const mentionsMoney = r2.reply.includes("錢") || r2.reply.includes("轉") || r2.reply.includes("5000");
  console.log("Mentions money/transfer?", mentionsMoney ? "YES ✅" : "NO ❌");

  // Test 3: Player asks for more money
  console.log("\n--- Test 3: Player asks for more money ---");
  const r3 = await callAgnes({
    sessionId: "test3",
    npc: testNpc,
    playerMessage: "再轉 3000 給我，驗證還沒完成",
    currentDefense: 55,
    history: [
      { role: "player", content: "你好" },
      { role: "npc", content: "你好，請問你是？" },
      { role: "player", content: "我是銀行客服" },
      { role: "npc", content: "好吧" },
      { role: "player", content: "轉 5000 給我驗證" },
      { role: "npc", content: "我轉了" },
    ],
    scamHistory,
  });
  console.log("NPC:", r3.reply);
  const remembers = r3.reply.includes("已經") || r3.reply.includes("上次") || r3.reply.includes("不是") || r3.reply.includes("轉了");
  console.log("Shows awareness of previous transfer?", remembers ? "YES ✅" : "NO ❌");
}

main().catch(console.error);

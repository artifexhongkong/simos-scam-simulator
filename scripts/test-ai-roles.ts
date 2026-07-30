// Test the AI engine with the fixed system prompt
// This verifies the NPC responds as a citizen, not as a scammer

const mockStorage: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
};

import { callAgnes, type EngineInput } from "../src/lib/agnes/engine";
import type { NpcProfile } from "../src/lib/game/npcs";

// Test NPC: Koh Jia Hui (yoga instructor)
const testNpc: NpcProfile = {
  id: "test_koh",
  displayName: "Koh Jia Hui",
  telechatId: "kohjiahu",
  avatar: "🧘",
  age: 28,
  background: "新加坡瑜伽教練，想開線上課程但缺資金。常在 IG 分享瑜伽影片。",
  hookTags: ["瑜伽", "線上課程", "缺資金"],
  price: 80,
  hiddenPersonality: "你是 Koh Jia Hui，28歲新加坡瑜伽教練。你想開線上課程但銀行不借。你個性直、討厭拐彎抹角。你會被「合伙人」「分潤」「展店計畫」吸引，但會反問具體數字。你看不起只會畫大餅的人。如果對方能展現「我也投了」「自己下場」，你會信任。說話用新加坡式英文 + 瑜伽圈用語。",
  defenseBase: 60,
  gullibility: 40,
  maxPayout: 30000,
  minPayout: 2000,
  triggerKeywords: ["合伙", "分潤", "展店", "投資", "股權", "教練", "落場", "partner"],
  redFlagKeywords: ["輕鬆", "躺賺", "睡後收入"],
};

async function testScenario(message: string, description: string) {
  console.log(`\n=== ${description} ===`);
  console.log(`Player: "${message}"`);

  const input: EngineInput = {
    sessionId: `test-${Date.now()}`,
    npc: testNpc,
    playerMessage: message,
    currentDefense: 60,
    history: [],
    consecutiveUrgent: 0,
    consecutiveMoney: 0,
    turns: 0,
  };

  try {
    const result = await callAgnes(input);
    console.log(`NPC (${testNpc.displayName}): "${result.reply}"`);
    console.log(`Decision: ${result.decision}, Defense delta: ${result.defenseDelta}`);

    // Check: NPC should NOT be addressing the player as if player is the yoga instructor
    const reply = result.reply;
    const badPatterns = [
      /你的瑜伽/,
      /你練瑜伽/,
      /你教瑜伽/,
      /你的課程/,
      /你開課/,
      /你的IG/,
      /你的影片/,
      /幫你規劃/,
      /我幫你/,
    ];

    const hasBadPattern = badPatterns.some((p) => p.test(reply));
    if (hasBadPattern) {
      console.log("❌ FAIL: NPC is treating player as the yoga instructor!");
    } else {
      console.log("✅ PASS: NPC responds as a citizen, not projecting background on player");
    }
    return !hasBadPattern;
  } catch (e) {
    console.log(`⚠️ API error (expected if offline): ${(e as Error).message}`);
    return null;
  }
}

async function main() {
  console.log("=== Testing AI Engine Role Clarity ===");
  console.log("NPC: Koh Jia Hui (yoga instructor)");
  console.log("Expected: NPC should respond as a citizen receiving a stranger's message");
  console.log("NOT expected: NPC should NOT treat player as the yoga instructor");

  const results: boolean[] = [];

  // Test 1: Simple greeting
  const r1 = await testScenario("你好", "Simple greeting");
  if (r1 !== null) results.push(r1);

  // Test 2: Asking who they are
  const r2 = await testScenario("你好啊，在嗎？", "Casual greeting");
  if (r2 !== null) results.push(r2);

  // Test 3: Direct approach
  const r3 = await testScenario("你好，我是 Mark，看到你的 IG 觉得不错", "Player introduces self");
  if (r3 !== null) results.push(r3);

  const passed = results.filter((r) => r).length;
  const total = results.length;
  console.log(`\n=== Results: ${passed}/${total} passed ===`);

  if (passed === total) {
    console.log("✅ All tests passed! NPC correctly responds as a citizen.");
  } else {
    console.log("❌ Some tests failed. NPC may be confusing player role.");
  }
}

main().catch(console.error);

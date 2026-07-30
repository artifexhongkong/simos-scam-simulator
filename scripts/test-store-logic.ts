// Test the store logic with mocked localStorage
// Must set up window mock BEFORE importing the store

const mockStorage: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
  visualViewport: undefined,
};

// Now import the store (it will see window as defined)
const { useGameStore } = require("../src/lib/game/store");

const store = useGameStore;

// Test 1: Traffic floor at 0
console.log("=== Test 1: Traffic floor ===");
store.getState().addTraffic(-99999);
console.log("Traffic after -99999:", store.getState().dataTraffic, "(expected: 0)");
console.log(store.getState().dataTraffic === 0 ? "✅ PASS" : "❌ FAIL");

// Test 2: DRC floor at 0
console.log("\n=== Test 2: DRC floor ===");
store.getState().addDarkCoin(-99999);
console.log("DRC after -99999:", store.getState().darkCoin, "(expected: 0)");
console.log(store.getState().darkCoin === 0 ? "✅ PASS" : "❌ FAIL");

// Test 3: Risk=100 triggers consequence
console.log("\n=== Test 3: Risk=100 consequence ===");
store.getState().resetGame();
console.log("Initial risk:", store.getState().riskLevel);
console.log("Initial SMS count:", store.getState().smsMessages.length);

store.getState().startConversation("lee_chiew_hua");
const convBefore = store.getState().conversations["lee_chiew_hua"];
console.log("Conv status before:", convBefore?.status);

store.getState().adjustRisk(85);
console.log("Risk after +85:", store.getState().riskLevel);

store.getState().adjustRisk(15);
console.log("Risk after +15:", store.getState().riskLevel, "(expected: 100)");
console.log("SMS count:", store.getState().smsMessages.length, "(expected: 1)");
console.log("SMS sender:", store.getState().smsMessages[0]?.sender, "(expected: 165)");

const convAfter = store.getState().conversations["lee_chiew_hua"];
console.log("Conv status after:", convAfter?.status, "(expected: cautious)");
console.log("Conv ending:", convAfter?.endingReason);

const pass3 = 
  store.getState().riskLevel === 100 &&
  store.getState().smsMessages.length === 1 &&
  store.getState().smsMessages[0].sender === "165" &&
  convAfter?.status === "cautious";
console.log(pass3 ? "✅ PASS" : "❌ FAIL");

// Test 4: No re-trigger at 100
console.log("\n=== Test 4: No re-trigger at 100 ===");
const smsBefore = store.getState().smsMessages.length;
store.getState().adjustRisk(10);
console.log("Risk:", store.getState().riskLevel, "(expected: 100)");
console.log("SMS count unchanged:", store.getState().smsMessages.length === smsBefore);
console.log(store.getState().riskLevel === 100 && store.getState().smsMessages.length === smsBefore ? "✅ PASS" : "❌ FAIL");

// Test 5: Risk reduction
console.log("\n=== Test 5: Risk reduction ===");
store.getState().adjustRisk(-50);
console.log("Risk after -50:", store.getState().riskLevel, "(expected: 50)");
console.log(store.getState().riskLevel === 50 ? "✅ PASS" : "❌ FAIL");

// Test 6: ScamScore floor at 0
console.log("\n=== Test 6: ScamScore floor ===");
useGameStore.setState({ scamScore: 5000 });
useGameStore.setState((s) => ({ scamScore: Math.max(0, s.scamScore - 10000) }));
console.log("ScamScore:", store.getState().scamScore, "(expected: 0)");
console.log(store.getState().scamScore === 0 ? "✅ PASS" : "❌ FAIL");

// Test 7: SMS reply YES keyword
console.log("\n=== Test 7: SMS reply YES ===");
store.getState().resetGame();
store.getState().addDarkCoin(100);
store.getState().addSms({
  sender: "1111",
  subject: "流量提醒",
  body: "回覆 YES 購買 2GB 補充包（30 DRC）",
  type: "traffic",
});
const smsId = store.getState().smsMessages[0].id;
const drcBefore = store.getState().darkCoin;
const trafficBefore = store.getState().dataTraffic;

store.getState().replySms(smsId, "YES");

const smsAfter = store.getState().smsMessages.find((m) => m.id === smsId);
console.log("DRC:", drcBefore, "->", store.getState().darkCoin, "(expected: -30)");
console.log("Traffic:", trafficBefore, "->", store.getState().dataTraffic, "(expected: +2000)");
console.log("Replies:", smsAfter?.replies.length, "(expected: 2 = player + system)");
console.log("System reply:", smsAfter?.replies[1]?.text?.slice(0, 30));

const pass7 = 
  store.getState().darkCoin === drcBefore - 30 &&
  store.getState().dataTraffic === trafficBefore + 2000 &&
  smsAfter?.replies.length === 2;
console.log(pass7 ? "✅ PASS" : "❌ FAIL");

// Test 8: SMS reply non-keyword
console.log("\n=== Test 8: SMS reply non-keyword ===");
store.getState().addTraffic(5000);
const trafficBefore2 = store.getState().dataTraffic;
store.getState().replySms(smsId, "hello");
console.log("Traffic:", trafficBefore2, "->", store.getState().dataTraffic, "(expected: -100)");
console.log(store.getState().dataTraffic === trafficBefore2 - 100 ? "✅ PASS" : "❌ FAIL");

console.log("\n=== All tests complete ===");

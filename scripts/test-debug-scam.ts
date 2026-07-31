// Test debug scam success flow
const mockStorage: Record<string, string> = {};
(globalThis as any).window = {
  localStorage: {
    getItem: (key: string) => mockStorage[key] ?? null,
    setItem: (key: string, value: string) => { mockStorage[key] = value; },
    removeItem: (key: string) => { delete mockStorage[key]; },
  },
};

const { useGameStore } = require("../src/lib/game/store");
const store = useGameStore;

console.log("=== Test: Debug scam success keeps conversation active ===");
store.getState().resetGame();
store.getState().addDarkCoin(500);

// Setup: unlock + add friend + start conversation
store.getState().purchaseIntel("lee_chiew_hua", false);
store.getState().addFriend("leechiewhua");
store.getState().startConversation("lee_chiew_hua");

const npcId = "lee_chiew_hua";
console.log("Conv status before:", store.getState().conversations[npcId]?.status);
console.log("Messages before:", store.getState().conversations[npcId]?.messages.length);

// Simulate debug scam success (same logic as DebugFloatingButton.handleScamSuccess)
const npc = store.getState().conversations[npcId];
const npcProfile = require("../src/lib/game/npcs").getNpcById(npcId, store.getState().generatedNpcs);
const payout = Math.floor(npcProfile.minPayout + Math.random() * (npcProfile.maxPayout - npcProfile.minPayout));
console.log("Payout:", payout);

// Add system message
store.getState().appendMessage(npcId, {
  id: "test1",
  role: "system",
  content: `✓ ${npcProfile.displayName} 已同意轉帳 $${payout.toLocaleString()}。款項已到帳。你可以繼續與對方對話。`,
  ts: Date.now(),
  meta: { decision: "agree", amount: payout },
});

// Keep active, add score + DRC, increase defense
const s = store.getState();
const scamCount = s.conversations[npcId]?.scamCount ?? 0;
s.updateDefense(npcId, 20 + scamCount * 10);

store.setState((st) => ({
  scamScore: st.scamScore + payout,
  darkCoin: st.darkCoin + Math.floor(payout / 100),
  conversations: {
    ...st.conversations,
    [npcId]: {
      ...st.conversations[npcId],
      scamCount: scamCount + 1,
      totalPayout: (st.conversations[npcId]?.totalPayout ?? 0) + payout,
    },
  },
}));

// Send bank SMS
s.addSms({
  sender: "銀行系統",
  subject: "【銀行】轉帳入帳通知",
  body: `您的帳戶已收到 $${payout.toLocaleString()} 轉帳。來源：${npcProfile.displayName}。餘額已更新。`,
  type: "system",
});

console.log("\nAfter debug scam success:");
console.log("Conv status:", store.getState().conversations[npcId]?.status, "(expected: active)");
console.log("Messages:", store.getState().conversations[npcId]?.messages.length, "(expected: 2 = initial + success)");
console.log("Scam count:", store.getState().conversations[npcId]?.scamCount, "(expected: 1)");
console.log("Total payout:", store.getState().conversations[npcId]?.totalPayout, `(expected: ${payout})`);
console.log("ScamScore:", store.getState().scamScore, `(expected: ${payout})`);
console.log("SMS count:", store.getState().smsMessages.length, "(expected: 1 = bank notification)");
console.log("SMS sender:", store.getState().smsMessages[0]?.sender, "(expected: 銀行系統)");

const pass =
  store.getState().conversations[npcId]?.status === "active" &&
  store.getState().conversations[npcId]?.scamCount === 1 &&
  store.getState().smsMessages[0]?.sender === "銀行系統" &&
  store.getState().scamScore === payout;
console.log(pass ? "\n✅ ALL TESTS PASSED" : "\n❌ TESTS FAILED");

// Verify input box would be visible (isLocked = status !== "active")
const isLocked = store.getState().conversations[npcId]?.status !== "active";
console.log("isLocked:", isLocked, "(expected: false → input box visible)");

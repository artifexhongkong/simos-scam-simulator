// Test that scamHistory is correctly built after debug scam success
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

console.log("=== Test: scamHistory after debug success ===");
store.getState().resetGame();
store.getState().addDarkCoin(500);
store.getState().purchaseIntel("lee_chiew_hua", false);
store.getState().addFriend("leechiewhua");
store.getState().startConversation("lee_chiew_hua");

const npcId = "lee_chiew_hua";
const npcProfile = require("../src/lib/game/npcs").getNpcById(npcId, store.getState().generatedNpcs);
const payout = 5000;

// Simulate debug success (same as DebugFloatingButton.handleScamSuccess)
const sysMsg = {
  id: "test1",
  role: "system" as const,
  content: `✓ ${npcProfile.displayName} 已同意轉帳 $${payout.toLocaleString()}。款項已到帳。你可以繼續與對方對話。`,
  ts: Date.now(),
  meta: { decision: "agree" as const, amount: payout },
};
store.getState().appendMessage(npcId, sysMsg);

// Update scamCount + totalPayout (same as debug button)
const s = store.getState();
const scamCount = s.conversations[npcId]?.scamCount ?? 0;
s.updateDefense(npcId, 20 + scamCount * 10);
store.setState((st) => ({
  conversations: {
    ...st.conversations,
    [npcId]: {
      ...st.conversations[npcId],
      scamCount: scamCount + 1,
      totalPayout: (st.conversations[npcId]?.totalPayout ?? 0) + payout,
    },
  },
}));

// Now simulate what ChatWindow does when building scamHistory
const updatedConv = store.getState().conversations[npcId];
console.log("scamCount:", updatedConv?.scamCount);
console.log("totalPayout:", updatedConv?.totalPayout);
console.log("messages:", updatedConv?.messages.length);

let scamHistory: string | undefined;
if ((updatedConv?.scamCount ?? 0) > 0) {
  const transfers = updatedConv.messages
    .filter((m: any) => m.meta?.decision === "agree" && m.meta?.amount)
    .map((m: any) => `$${m.meta!.amount!.toLocaleString()}`);
  scamHistory = `你之前已經轉過錢給這個陌生人，共 ${updatedConv.scamCount} 次，總計 ${updatedConv.totalPayout?.toLocaleString() ? '$' + updatedConv.totalPayout.toLocaleString() : '不明金額'}。轉帳記錄：${transfers.join('、')}。`;
}

console.log("\nscamHistory:", scamHistory);

if (scamHistory && scamHistory.includes("$5,000")) {
  console.log("✅ PASS: scamHistory correctly built with transfer amount");
} else {
  console.log("❌ FAIL: scamHistory not built correctly");
  console.log("  Expected: contains $5,000");
  console.log("  Got:", scamHistory);
}

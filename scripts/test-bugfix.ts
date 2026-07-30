// Test removeFriend and other store logic
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

console.log("=== Test 1: removeFriend ===");
store.getState().resetGame();
store.getState().addDarkCoin(500);
// Unlock NPCs first (addFriend requires unlocked)
store.getState().purchaseIntel("lee_chiew_hua", false);
store.getState().purchaseIntel("tan_wei_jie", false);
store.getState().startConversation("lee_chiew_hua");
store.getState().startConversation("tan_wei_jie");

// Add friends (addFriend takes telechatId)
const r1 = store.getState().addFriend("leechiewhua");
const r2 = store.getState().addFriend("weijie.tan");
console.log("addFriend results:", r1, r2);

console.log("Friends before:", store.getState().friendNpcIds);
console.log("Conversations before:", Object.keys(store.getState().conversations));
console.log("Expected: 2 friends, 2 conversations");

// Remove one friend
store.getState().removeFriend("lee_chiew_hua");
console.log("\nAfter removeFriend(lee_chiew_hua):");
console.log("Friends:", store.getState().friendNpcIds);
console.log("Conversations:", Object.keys(store.getState().conversations));

const pass1 = 
  store.getState().friendNpcIds.length === 1 &&
  !store.getState().friendNpcIds.includes("lee_chiew_hua") &&
  store.getState().friendNpcIds.includes("tan_wei_jie") &&
  !store.getState().conversations["lee_chiew_hua"] &&
  store.getState().conversations["tan_wei_jie"];
console.log(pass1 ? "✅ PASS" : "❌ FAIL");

console.log("\n=== Test 2: buyPhoneNumber 350 DRC ===");
store.getState().resetGame();
store.getState().addDarkCoin(400); // 200 initial + 400 = 600
console.log("DRC before:", store.getState().darkCoin);
const result = store.getState().buyPhoneNumber();
console.log("Result:", result);
console.log("DRC after:", store.getState().darkCoin);
const pass2 = result.ok && store.getState().darkCoin === 250; // 600 - 350 = 250
console.log(pass2 ? "✅ PASS" : "❌ FAIL");

console.log("\n=== Test 3: buyPhoneNumber insufficient DRC ===");
useGameStore.setState({ darkCoin: 100 });
const result2 = store.getState().buyPhoneNumber();
console.log("Result:", result2);
const pass3 = !result2.ok && result2.error.includes("350");
console.log(pass3 ? "✅ PASS" : "❌ FAIL");

console.log("\n=== Test 4: buyPhoneNumberByAd (free) ===");
store.getState().resetGame();
const drcBefore = store.getState().darkCoin;
const aliasBefore = store.getState().alias;
const result3 = store.getState().buyPhoneNumberByAd();
console.log("DRC before:", drcBefore, "after:", store.getState().darkCoin);
console.log("Alias before:", aliasBefore, "after:", store.getState().alias);
const pass4 = result3.ok && store.getState().darkCoin === drcBefore && store.getState().alias !== aliasBefore;
console.log(pass4 ? "✅ PASS" : "❌ FAIL");

console.log("\n=== All tests complete ===");

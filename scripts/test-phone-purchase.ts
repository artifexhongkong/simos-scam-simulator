// Test buyPhoneNumber logic
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

console.log("=== Test 1: buyPhoneNumber success ===");
store.getState().resetGame();
store.getState().addDarkCoin(500); // Ensure enough DRC
const drcBefore = store.getState().darkCoin;
const aliasBefore = store.getState().alias;
const riskBefore = store.getState().riskLevel;
console.log(`Before: DRC=${drcBefore}, alias=${aliasBefore}, risk=${riskBefore}`);

store.getState().adjustRisk(100); // Set risk to 100
console.log(`Risk after adjustRisk(100): ${store.getState().riskLevel}`);

const result = store.getState().buyPhoneNumber();
console.log(`Result:`, result);
console.log(`After: DRC=${store.getState().darkCoin}, alias=${store.getState().alias}, risk=${store.getState().riskLevel}`);
console.log(`SMS count: ${store.getState().smsMessages.length}`);

const pass1 = 
  result.ok === true &&
  result.newAlias !== aliasBefore &&
  store.getState().darkCoin === drcBefore - 150 &&
  store.getState().riskLevel === 0 &&
  store.getState().alias !== aliasBefore;
console.log(pass1 ? "✅ PASS" : "❌ FAIL");

console.log("\n=== Test 2: buyPhoneNumber insufficient DRC ===");
store.getState().resetGame();
// resetGame sets darkCoin to 200 (INITIAL_DARK_COIN)
// We need < 150, so set to 100 explicitly
useGameStore.setState({ darkCoin: 100 });
console.log(`DRC before: ${store.getState().darkCoin}`);
const result2 = store.getState().buyPhoneNumber();
console.log(`Result:`, result2);
console.log(result2.ok === false && result2.error ? "✅ PASS" : "❌ FAIL");

console.log("\n=== Test 3: Risk=100 sends darknet promo SMS ===");
store.getState().resetGame();
store.getState().addDarkCoin(500);
store.getState().adjustRisk(100);
const smsList = store.getState().smsMessages;
const hasDarknetSms = smsList.some((s: any) => s.sender === "黑網服務");
const hasPoliceSms = smsList.some((s: any) => s.sender === "165");
console.log(`Has darknet SMS: ${hasDarknetSms}`);
console.log(`Has police SMS: ${hasPoliceSms}`);
console.log(hasDarknetSms && hasPoliceSms ? "✅ PASS" : "❌ FAIL");

console.log("\n=== Test 4: After buying phone, can continue playing ===");
store.getState().resetGame();
store.getState().addDarkCoin(500);
store.getState().adjustRisk(100);
console.log(`Risk at 100: ${store.getState().riskLevel}`);
console.log(`Conversations: ${Object.keys(store.getState().conversations).length}`);
store.getState().buyPhoneNumber();
console.log(`After buy: risk=${store.getState().riskLevel}, alias=${store.getState().alias}`);
// Can start new conversation
store.getState().startConversation("lee_chiew_hua");
const convStatus = store.getState().conversations["lee_chiew_hua"]?.status;
console.log(`New conversation status: ${convStatus}`);
console.log(store.getState().riskLevel === 0 && convStatus === "active" ? "✅ PASS" : "❌ FAIL");

console.log("\n=== All tests complete ===");

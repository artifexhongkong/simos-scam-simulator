// Test the randomNpc generator
import { generateRandomNpc, generateRandomNpcs } from "../src/lib/game/randomNpc";

console.log("=== Testing generateRandomNpc ===\n");

// Generate 5 NPCs with different seeds
for (let i = 0; i < 5; i++) {
  const npc = generateRandomNpc(Date.now() + i * 1000);
  console.log(`NPC ${i + 1}:`);
  console.log(`  ID: ${npc.id}`);
  console.log(`  Name: ${npc.displayName}`);
  console.log(`  Telechat ID: ${npc.telechatId}`);
  console.log(`  Avatar: ${npc.avatar}`);
  console.log(`  Age: ${npc.age}`);
  console.log(`  Background: ${npc.background.slice(0, 80)}...`);
  console.log(`  HookTags: ${npc.hookTags.join(", ")}`);
  console.log(`  Price: ${npc.price}`);
  console.log(`  DefenseBase: ${npc.defenseBase}`);
  console.log(`  Gullibility: ${npc.gullibility}`);
  console.log(`  MaxPayout: ${npc.maxPayout}`);
  console.log(`  MinPayout: ${npc.minPayout}`);
  console.log(`  TriggerKeywords: ${npc.triggerKeywords.join(", ")}`);
  console.log(`  RedFlagKeywords: ${npc.redFlagKeywords.join(", ")}`);
  console.log(`  Personality (first 100 chars): ${npc.hiddenPersonality.slice(0, 100)}...`);
  console.log("");
}

console.log("\n=== Testing generateRandomNpcs (3 unique) ===\n");
const npcs = generateRandomNpcs(3);
console.log(`Generated ${npcs.length} NPCs:`);
const ids = new Set<string>();
for (const npc of npcs) {
  console.log(`  - ${npc.id}: ${npc.displayName} (${npc.age}歲) — ${npc.hookTags.join("/")}`);
  if (ids.has(npc.id)) {
    console.error(`  ❌ DUPLICATE ID: ${npc.id}`);
    process.exit(1);
  }
  ids.add(npc.id);
}
console.log("✅ All IDs unique");

// Verify all required fields exist
console.log("\n=== Verifying NpcProfile structure ===\n");
const requiredFields = ["id", "displayName", "telechatId", "avatar", "age", "background", "hookTags", "price", "hiddenPersonality", "defenseBase", "gullibility", "maxPayout", "minPayout", "triggerKeywords", "redFlagKeywords"];
for (const npc of npcs) {
  for (const field of requiredFields) {
    if (!(field in npc)) {
      console.error(`❌ Missing field: ${field} in NPC ${npc.id}`);
      process.exit(1);
    }
    if ((npc as any)[field] === undefined || (npc as any)[field] === null) {
      console.error(`❌ Null/undefined field: ${field} in NPC ${npc.id}`);
      process.exit(1);
    }
  }
}
console.log("✅ All required fields present and non-null");

// Test with existing IDs (should not produce duplicates)
console.log("\n=== Testing with existing IDs ===\n");
const existingIds = npcs.map(n => n.id);
const newNpcs = generateRandomNpcs(3, existingIds);
for (const npc of newNpcs) {
  if (existingIds.includes(npc.id)) {
    console.error(`❌ Generated duplicate ID: ${npc.id}`);
    process.exit(1);
  }
}
console.log(`✅ Generated ${newNpcs.length} new NPCs, none duplicate existing IDs`);

console.log("\n=== All tests passed! ===\n");

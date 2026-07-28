// NPC 資料庫 - 從 JSON 設定檔載入
// 新增 NPC 只需編輯 src/lib/game/data/npcs.json，不需修改此檔案
// 所有 hiddenPersonality / defenseBase / gullibility 玩家完全看不到

import npcData from "./data/npcs.json";

export interface NpcProfile {
  id: string;
  displayName: string;
  telechatId: string;
  avatar: string;
  age: number;
  background: string;
  hookTags: string[];
  price: number;
  hiddenPersonality: string;
  defenseBase: number;
  gullibility: number;
  maxPayout: number;
  minPayout: number;
  triggerKeywords: string[];
  redFlagKeywords: string[];
}

// 從 JSON 載入（過濾 _comment / _schema 等中繼欄位）
export const NPCS: NpcProfile[] = (npcData as { npcs: NpcProfile[] }).npcs;

export function getNpcByTelechatId(tid: string): NpcProfile | undefined {
  return NPCS.find((n) => n.telechatId === tid);
}

export function getNpcById(id: string): NpcProfile | undefined {
  return NPCS.find((n) => n.id === id);
}

// 虛擬排行榜上的對手
export interface RivalScammer {
  rank: number;
  alias: string;
  country: string;
  flag: string;
  totalScam: number;
  trend: "up" | "down" | "stable";
}

export const RIVAL_SCAMMERS: RivalScammer[] = [
  { rank: 1, alias: "GhostPhish", country: "Unknown", flag: "🏴", totalScam: 1284500, trend: "up" },
  { rank: 2, alias: "0xCipher", country: "Russia", flag: "🇷🇺", totalScam: 982300, trend: "up" },
  { rank: 3, alias: "LaoSiJi", country: "SEA", flag: "🌏", totalScam: 765200, trend: "stable" },
  { rank: 4, alias: "BlackBox", country: "Nigeria", flag: "🇳🇬", totalScam: 612800, trend: "down" },
  { rank: 5, alias: "MiMiCat", country: "Taiwan", flag: "🇹🇼", totalScam: 488900, trend: "up" },
  { rank: 6, alias: "Sandman", country: "Unknown", flag: "🌑", totalScam: 421500, trend: "stable" },
  { rank: 7, alias: "PigBuster", country: "HK", flag: "🇭🇰", totalScam: 367200, trend: "down" },
  { rank: 8, alias: "QuietFox", country: "Japan", flag: "🇯🇵", totalScam: 298400, trend: "up" },
  { rank: 9, alias: "BigBro77", country: "China", flag: "🇨🇳", totalScam: 254800, trend: "stable" },
  { rank: 10, alias: "VaporWave", country: "Brazil", flag: "🇧🇷", totalScam: 198200, trend: "up" },
  { rank: 11, alias: "NightOwl", country: "UK", flag: "🇬🇧", totalScam: 165300, trend: "down" },
  { rank: 12, alias: "DiamondX", country: "India", flag: "🇮🇳", totalScam: 132700, trend: "stable" },
  { rank: 13, alias: "Mochi", country: "Korea", flag: "🇰🇷", totalScam: 98400, trend: "up" },
  { rank: 14, alias: "RustyNail", country: "AUS", flag: "🇦🇺", totalScam: 76200, trend: "stable" },
  { rank: 15, alias: "BlueBird", country: "USA", flag: "🇺🇸", totalScam: 54100, trend: "down" },
];

// 頭銜系統
export function getTitle(score: number): { title: string; next: string | null; toNext: number | null } {
  if (score < 1000) return { title: "菜鳥學徒", next: "街頭話術", toNext: 1000 - score };
  if (score < 5000) return { title: "街頭話術", next: "地區幹部", toNext: 5000 - score };
  if (score < 20000) return { title: "地區幹部", next: "跨國車手", toNext: 20000 - score };
  if (score < 80000) return { title: "跨國車手", next: "金流大師", toNext: 80000 - score };
  if (score < 250000) return { title: "金流大師", next: "黑市傳奇", toNext: 250000 - score };
  if (score < 800000) return { title: "黑市傳奇", next: "千萬詐師", toNext: 800000 - score };
  return { title: "千萬詐師", next: null, toNext: null };
}

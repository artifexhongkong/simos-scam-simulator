"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { NPCS, getNpcById, type NpcProfile } from "./npcs";

export interface ChatMessage {
  id: string;
  role: "player" | "npc" | "system";
  content: string;
  ts: number;
  meta?: {
    decision?: "continue" | "agree" | "block";
    amount?: number;
    defense?: number;
  };
}

export interface ConversationState {
  npcId: string;
  messages: ChatMessage[];
  defense: number; // 當前 NPC 防備值（玩家不可見）
  status: "active" | "succeeded" | "blocked" | "expired";
  payout?: number; // 詐騙成功金額
  startedAt: number;
}

export interface GameState {
  // 玩家身份（每次新遊戲隨機生成）
  alias: string;
  playerId: string;
  playerAvatar: string; // 玩家 emoji 頭像
  playerTelechatId: string; // 玩家自己的 TeleChat ID

  // 經濟系統：情報點數（用於購買情報，非遊戲主目標）
  intelPoints: number;

  // 詐騙積分（遊戲主目標，用於排行榜）
  scamScore: number;

  // 已購買情報的 NPC ID
  unlockedNpcIds: string[];

  // 已加為好友的 NPC ID（TeleChat 好友列表）
  friendNpcIds: string[];

  // 對話歷史
  conversations: Record<string, ConversationState>;

  // 排行榜上其他對手的動態分數波動
  rivalSnapshot: Record<string, number>;
  lastRivalUpdate: number;

  // 操作
  setAlias: (alias: string) => void;
  addIntelPoints: (n: number) => void;
  purchaseIntel: (npcId: string) => boolean;
  addFriend: (telechatId: string) => { ok: boolean; error?: string; npcId?: string };
  startConversation: (npcId: string) => void;
  appendMessage: (npcId: string, msg: ChatMessage) => void;
  updateDefense: (npcId: string, delta: number) => void;
  setConversationStatus: (npcId: string, status: ConversationState["status"], payout?: number) => void;
  resetConversation: (npcId: string) => void;
  refreshRivals: () => void;
  resetGame: () => void;
}

const INITIAL_INTEL_POINTS = 100;

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 詐騙犯代號生成池（每次新遊戲隨機組合）
const SCAMMER_PREFIXES = [
  "Dark", "Ghost", "Silent", "Crimson", "Shadow", "Neon", "Phantom", "Rogue",
  "Cipher", "Venom", "Frost", "Iron", "Wild", "Black", "Steel", "Lone",
  "Midnight", "Toxic", "Crazy", "Mr", "Ms", "Cyber", "Digital", "Anon",
];
const SCAMMER_SUFFIXES = [
  "Phisher", "Fox", "Wolf", "Tiger", "Dragon", "Snake", "Hawk", "Reaper",
  "Byte", "Cash", "Card", "Wire", "Byte", "Rabbit", "Cat", "Bird",
  "Wave", "Storm", "Blade", "Ring", "007", "X", "Z", "99", "777",
];
const SCAMMER_EMOJIS = ["🎭", "🕶️", "💀", "👾", "🦊", "🐺", "🐉", "🐍", "🦅", "⚡", "🔥", "❄️", "🌑", "🃏", "🎰"];

function randomAlias(): string {
  const prefix = SCAMMER_PREFIXES[Math.floor(Math.random() * SCAMMER_PREFIXES.length)];
  const suffix = SCAMMER_SUFFIXES[Math.floor(Math.random() * SCAMMER_SUFFIXES.length)];
  const num = Math.floor(Math.random() * 999);
  return `${prefix}${suffix}${num}`;
}

function randomEmoji(): string {
  return SCAMMER_EMOJIS[Math.floor(Math.random() * SCAMMER_EMOJIS.length)];
}

function randomTelechatId(): string {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = "";
  for (let i = 0; i < 10; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return `scammer_${id}`;
}

export const useGameStore = create<GameState>()(
  persist(
    (set, get) => ({
      alias: randomAlias(),
      playerId: genId(),
      playerAvatar: randomEmoji(),
      playerTelechatId: randomTelechatId(),
      intelPoints: INITIAL_INTEL_POINTS,
      scamScore: 0,
      unlockedNpcIds: [],
      friendNpcIds: [],
      conversations: {},
      rivalSnapshot: {},
      lastRivalUpdate: 0,

      setAlias: (alias) => set({ alias }),

      addIntelPoints: (n) => set((s) => ({ intelPoints: Math.max(0, s.intelPoints + n) })),

      purchaseIntel: (npcId) => {
        const npc = getNpcById(npcId);
        if (!npc) return false;
        const s = get();
        if (s.unlockedNpcIds.includes(npcId)) return true;
        if (s.intelPoints < npc.price) return false;
        set({
          intelPoints: s.intelPoints - npc.price,
          unlockedNpcIds: [...s.unlockedNpcIds, npcId],
        });
        return true;
      },

      addFriend: (telechatId) => {
        const tid = telechatId.trim();
        if (!tid) return { ok: false, error: "請輸入 TeleChat ID" };
        const npc = NPCS.find((n) => n.telechatId === tid);
        if (!npc) return { ok: false, error: "查無此 ID，請確認情報是否正確" };
        const s = get();
        if (!s.unlockedNpcIds.includes(npc.id)) {
          return { ok: false, error: "你還沒購買此目標的情報" };
        }
        if (s.friendNpcIds.includes(npc.id)) {
          return { ok: false, error: "對方已經在你的好友列表", npcId: npc.id };
        }
        set({ friendNpcIds: [...s.friendNpcIds, npc.id] });
        return { ok: true, npcId: npc.id };
      },

      startConversation: (npcId) => {
        const s = get();
        if (s.conversations[npcId]) return;
        const npc = getNpcById(npcId);
        if (!npc) return;
        const newConv: ConversationState = {
          npcId,
          messages: [
            {
              id: genId(),
              role: "system",
              content: `已與 ${npc.displayName} 建立對話。對方剛剛接受了你的好友請求。`,
              ts: Date.now(),
            },
          ],
          defense: npc.defenseBase,
          status: "active",
          startedAt: Date.now(),
        };
        set({ conversations: { ...s.conversations, [npcId]: newConv } });
      },

      appendMessage: (npcId, msg) =>
        set((s) => {
          const conv = s.conversations[npcId];
          if (!conv) return {};
          return {
            conversations: {
              ...s.conversations,
              [npcId]: { ...conv, messages: [...conv.messages, msg] },
            },
          };
        }),

      updateDefense: (npcId, delta) =>
        set((s) => {
          const conv = s.conversations[npcId];
          if (!conv) return {};
          const newDefense = Math.max(0, Math.min(100, conv.defense + delta));
          return {
            conversations: {
              ...s.conversations,
              [npcId]: { ...conv, defense: newDefense },
            },
          };
        }),

      setConversationStatus: (npcId, status, payout) =>
        set((s) => {
          const conv = s.conversations[npcId];
          if (!conv) return {};
          const newScore = status === "succeeded" && payout ? s.scamScore + payout : s.scamScore;
          return {
            conversations: {
              ...s.conversations,
              [npcId]: { ...conv, status, payout },
            },
            scamScore: newScore,
          };
        }),

      resetConversation: (npcId) =>
        set((s) => {
          const npc = getNpcById(npcId);
          if (!npc) return {};
          const newConv: ConversationState = {
            npcId,
            messages: [
              {
                id: genId(),
                role: "system",
                content: `已與 ${npc.displayName} 重新建立對話。`,
                ts: Date.now(),
              },
            ],
            defense: npc.defenseBase,
            status: "active",
            startedAt: Date.now(),
          };
          return {
            conversations: {
              ...s.conversations,
              [npcId]: newConv,
            },
          };
        }),

      refreshRivals: () => {
        // 給虛擬對手的分數加上隨機波動，模擬即時榜單
        set((s) => {
          const snap: Record<string, number> = { ...s.rivalSnapshot };
          const now = Date.now();
          // 每 30 秒最多更新一次
          if (now - s.lastRivalUpdate < 30000) return {};
          return { rivalSnapshot: snap, lastRivalUpdate: now };
        });
      },

      resetGame: () =>
        set({
          alias: randomAlias(),
          playerId: genId(),
          playerAvatar: randomEmoji(),
          playerTelechatId: randomTelechatId(),
          intelPoints: INITIAL_INTEL_POINTS,
          scamScore: 0,
          unlockedNpcIds: [],
          friendNpcIds: [],
          conversations: {},
          rivalSnapshot: {},
          lastRivalUpdate: 0,
        }),
    }),
    {
      name: "simos-scam-sim-save",
      skipHydration: true,
      storage: createJSONStorage(() => {
        if (typeof window !== "undefined") {
          return window.localStorage;
        }
        return undefined as unknown as Storage;
      }),
    },
  ),
);

// 取得 NPC 的當前對話狀態
export function getConversation(state: GameState, npcId: string): ConversationState | undefined {
  return state.conversations[npcId];
}

// 取得可購買但尚未購買的 NPC 列表
export function getAvailableForPurchase(state: GameState): NpcProfile[] {
  return NPCS.filter((n) => !state.unlockedNpcIds.includes(n.id));
}

// 取得已購買但尚未加好友的 NPC
export function getUnlockedNotFriend(state: GameState): NpcProfile[] {
  return NPCS.filter((n) => state.unlockedNpcIds.includes(n.id) && !state.friendNpcIds.includes(n.id));
}

// 取得好友列表 NPC
export function getFriends(state: GameState): NpcProfile[] {
  return NPCS.filter((n) => state.friendNpcIds.includes(n.id));
}

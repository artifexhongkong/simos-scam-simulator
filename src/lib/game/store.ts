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
  defense: number; // 當前 NPC 警惕值（玩家不可見，0-100）
  status: "active" | "succeeded" | "blocked" | "cautious" | "expired"; // 多結局
  payout?: number; // 詐騙成功金額
  startedAt: number;
  consecutiveUrgent: number; // 連續催逼計數（動態警惕機制）
  consecutiveMoney: number; // 連續要錢計數
  turns: number; // 對話輪數
  endingReason?: string; // 結局原因（給結果面板顯示）
}

export interface GameState {
  // 玩家身份（每次新遊戲隨機生成）
  alias: string;
  playerId: string;
  playerAvatar: string;
  playerTelechatId: string;

  // UI 偏好設定
  theme: "dark" | "light";
  showTimestamps: boolean;
  uiStyle: "classic" | "ios";

  // 經濟系統
  darkCoin: number;       // 暗網幣（DRC）：購買情報的貨幣
  dataTraffic: number;    // 流量卡（GB）：每則訊息消耗 1GB
  riskLevel: number;      // 風控值（0-100）：越高越危險
  scamScore: number;      // 詐騙總金額（遊戲主目標，用於排行榜）

  // 已購買情報的 NPC ID（含情報等級）
  unlockedNpcIds: string[];        // 普通料子已解鎖
  premiumNpcIds: string[];         // 精準有料已解鎖（含痛點）

  // 已加為好友的 NPC ID
  friendNpcIds: string[];

  // 對話歷史
  conversations: Record<string, ConversationState>;

  // 排行榜
  rivalSnapshot: Record<string, number>;
  lastRivalUpdate: number;

  // 操作
  setAlias: (alias: string) => void;
  setTheme: (theme: "dark" | "light") => void;
  toggleTimestamps: () => void;
  setUiStyle: (style: "classic" | "ios") => void;
  // 經濟操作
  addDarkCoin: (n: number) => void;
  consumeTraffic: (n: number) => boolean;
  addTraffic: (n: number) => void;
  adjustRisk: (delta: number) => void;
  convertScamToCoin: () => void; // 詐騙金額兌換暗網幣
  purchaseIntel: (npcId: string, premium: boolean) => boolean;
  addFriend: (telechatId: string) => { ok: boolean; error?: string; npcId?: string };
  startConversation: (npcId: string) => void;
  appendMessage: (npcId: string, msg: ChatMessage) => void;
  updateDefense: (npcId: string, delta: number) => void;
  setConversationStatus: (npcId: string, status: ConversationState["status"], payout?: number, reason?: string) => void;
  updateConversationMetrics: (npcId: string, isUrgent: boolean, isMoney: boolean) => void;
  resetConversation: (npcId: string) => void;
  refreshRivals: () => void;
  resetGame: () => void;
}

const INITIAL_DARK_COIN = 200;   // 初始暗網幣（夠買 2~3 個 NPC）
const INITIAL_TRAFFIC = 50;      // 初始流量卡 50GB
const INITIAL_RISK = 0;          // 初始風控值

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
      theme: "light",
      showTimestamps: true,
      uiStyle: "ios",
      darkCoin: INITIAL_DARK_COIN,
      dataTraffic: INITIAL_TRAFFIC,
      riskLevel: INITIAL_RISK,
      scamScore: 0,
      unlockedNpcIds: [],
      premiumNpcIds: [],
      friendNpcIds: [],
      conversations: {},
      rivalSnapshot: {},
      lastRivalUpdate: 0,

      setAlias: (alias) => set({ alias }),

      setTheme: (theme) => set({ theme }),
      toggleTimestamps: () => set((s) => ({ showTimestamps: !s.showTimestamps })),
      setUiStyle: (uiStyle) => set({ uiStyle }),

      addDarkCoin: (n) => set((s) => ({ darkCoin: Math.max(0, s.darkCoin + n) })),

      consumeTraffic: (n) => {
        const s = get();
        if (s.dataTraffic < n) return false;
        set({ dataTraffic: s.dataTraffic - n });
        return true;
      },

      addTraffic: (n) => set((s) => ({ dataTraffic: s.dataTraffic + n })),

      adjustRisk: (delta) => set((s) => ({
        riskLevel: Math.max(0, Math.min(100, s.riskLevel + delta)),
      })),

      convertScamToCoin: () => {
        const s = get();
        const convertible = Math.floor(s.scamScore / 1000) * 10;
        if (convertible <= 0) return;
        set({ darkCoin: s.darkCoin + convertible });
      },

      purchaseIntel: (npcId, premium) => {
        const npc = getNpcById(npcId);
        if (!npc) return false;
        const s = get();
        const priceMultiplier = 1 + (s.riskLevel / 100);
        const basePrice = premium ? npc.price * 2 : npc.price;
        const actualPrice = Math.ceil(basePrice * priceMultiplier);

        if (premium) {
          if (s.premiumNpcIds.includes(npcId)) return true;
          if (s.darkCoin < actualPrice) return false;
          if (!s.unlockedNpcIds.includes(npcId)) return false;
          set({
            darkCoin: s.darkCoin - actualPrice,
            premiumNpcIds: [...s.premiumNpcIds, npcId],
          });
        } else {
          if (s.unlockedNpcIds.includes(npcId)) return true;
          if (s.darkCoin < actualPrice) return false;
          set({
            darkCoin: s.darkCoin - actualPrice,
            unlockedNpcIds: [...s.unlockedNpcIds, npcId],
          });
        }
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
          consecutiveUrgent: 0,
          consecutiveMoney: 0,
          turns: 0,
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

      setConversationStatus: (npcId, status, payout, reason) =>
        set((s) => {
          const conv = s.conversations[npcId];
          if (!conv) return {};
          const newScore = status === "succeeded" && payout ? s.scamScore + payout : s.scamScore;
          // 詐騙成功：10% 金額自動轉為暗網幣（每 $100 = 1 DRC）
          const newDarkCoin = status === "succeeded" && payout ? s.darkCoin + Math.floor(payout / 100) : s.darkCoin;
          // 被封鎖：風控值 +15
          const newRisk = status === "blocked" ? Math.min(100, s.riskLevel + 15) : s.riskLevel;
          // 被警覺終止：風控值 +8
          const finalRisk = status === "cautious" ? Math.min(100, newRisk + 8) : newRisk;
          return {
            conversations: {
              ...s.conversations,
              [npcId]: { ...conv, status, payout, endingReason: reason },
            },
            scamScore: newScore,
            darkCoin: newDarkCoin,
            riskLevel: finalRisk,
          };
        }),

      updateConversationMetrics: (npcId, isUrgent, isMoney) =>
        set((s) => {
          const conv = s.conversations[npcId];
          if (!conv) return {};
          return {
            conversations: {
              ...s.conversations,
              [npcId]: {
                ...conv,
                consecutiveUrgent: isUrgent ? conv.consecutiveUrgent + 1 : 0,
                consecutiveMoney: isMoney ? conv.consecutiveMoney + 1 : 0,
                turns: conv.turns + 1,
              },
            },
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
            consecutiveUrgent: 0,
            consecutiveMoney: 0,
            turns: 0,
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
          darkCoin: INITIAL_DARK_COIN,
          dataTraffic: INITIAL_TRAFFIC,
          riskLevel: INITIAL_RISK,
          scamScore: 0,
          unlockedNpcIds: [],
          premiumNpcIds: [],
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

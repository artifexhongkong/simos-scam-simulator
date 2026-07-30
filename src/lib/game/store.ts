"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { NPCS, getAllNpcs, getNpcById, type NpcProfile } from "./npcs";

export interface ChatMessage {
  id: string;
  role: "player" | "npc" | "system";
  content: string;
  ts: number;
  meta?: {
    decision?: "continue" | "agree" | "block" | "cautious";
    amount?: number;
    defense?: number;
    imageType?: string;
  };
}

// 短訊通知（電信公司短信風格）
export interface SmsReply {
  id: string;
  text: string;
  ts: number;
  fromPlayer: boolean; // true = 玩家發送, false = 系統回覆
}

export interface SmsMessage {
  id: string;
  sender: string;      // 發送者（如 "電信公司"、"1111"）
  subject: string;     // 標題
  body: string;        // 內容
  ts: number;
  read: boolean;
  type: "traffic" | "risk" | "system" | "promo";  // 短訊類型
  replies: SmsReply[]; // 回覆記錄（聊天形式）
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
  darkCoin: number;       // 暗網幣（DRC）
  dataTraffic: number;    // 流量卡（MB）
  riskLevel: number;      // 風控值（0-100）
  scamScore: number;      // 詐騙總金額（排行榜用，不會因兌換減少）
  convertedAmount: number; // 已洗錢兌換過的金額（追蹤避免重複）

  // 已購買情報的 NPC ID（含情報等級）
  unlockedNpcIds: string[];        // 普通料子已解鎖
  premiumNpcIds: string[];         // 精準有料已解鎖（含痛點）

  // 已加為好友的 NPC ID
  friendNpcIds: string[];

  // 程序化產生的 NPC（情報販子下拉刷新時產生）
  generatedNpcs: NpcProfile[];

  // 短訊通知（電信公司短信）
  smsMessages: SmsMessage[];
  unreadSmsCount: number;

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
  removeFriend: (npcId: string) => void; // 刪除好友 + 對話記錄
  refreshRivals: () => void;
  resetGame: () => void;
  // 程序化 NPC 操作
  addGeneratedNpcs: (npcs: NpcProfile[]) => void;
  // 短訊操作
  addSms: (sms: Omit<SmsMessage, "id" | "ts" | "read" | "replies">) => void;
  markSmsRead: (id: string) => void;
  markAllSmsRead: () => void;
  deleteSms: (id: string) => void;
  replySms: (id: string, text: string) => void; // 玩家回覆簡訊
  // 購買新電話號碼（重置風控值 + 新身份）
  buyPhoneNumber: () => { ok: boolean; error?: string; newAlias?: string };
  buyPhoneNumberByAd: () => { ok: boolean; newAlias?: string }; // 看廣告免費購買
}

const INITIAL_DARK_COIN = 200;
const INITIAL_TRAFFIC = 5000;     // 5000 MB = 5GB（每則訊息扣 100MB）
const INITIAL_RISK = 0;

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
      convertedAmount: 0,
      unlockedNpcIds: [],
      premiumNpcIds: [],
      friendNpcIds: [],
      generatedNpcs: [],
      smsMessages: [],
      unreadSmsCount: 0,
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

      addTraffic: (n) => set((s) => ({ dataTraffic: Math.max(0, s.dataTraffic + n) })),

      adjustRisk: (delta) =>
        set((s) => {
          const newRisk = Math.max(0, Math.min(100, s.riskLevel + delta));
          const wasBelow100 = s.riskLevel < 100;
          const nowAt100 = newRisk >= 100;

          // 風控值達到 100：觸發警方反詐行動
          if (wasBelow100 && nowAt100) {
            // 所有活躍對話被警方介入終止
            const newConversations = { ...s.conversations };
            for (const npcId of Object.keys(newConversations)) {
              const conv = newConversations[npcId];
              if (conv.status === "active") {
                newConversations[npcId] = {
                  ...conv,
                  status: "cautious",
                  endingReason: "【系統】風控值過高，警方反詐介入，對話被強制終止。",
                };
              }
            }

            // 發送警方反詐簡訊
            const policeSms: SmsMessage = {
              id: genId(),
              sender: "165",
              subject: "【反詐騙專線】您的號碼已被監控",
              body: "您的號碼因疑似涉及詐騙活動已被反詐騙專線標記監控。所有進行中的通訊已被依法終止。如有疑問請撥打 165 反詐騙諮詢專線。",
              ts: Date.now(),
              read: false,
              type: "risk",
              replies: [],
            };

            // 發送黑網推廣簡訊（提示玩家可購買新號碼）
            const darknetSms: SmsMessage = {
              id: genId(),
              sender: "黑網服務",
              subject: "【黑網】偵測到您的號碼被標記",
              body: "您的號碼已被反詐騙專線監控。黑網提供免洗號碼服務，350 DRC 或觀看廣告即可獲得全新身份 + 風控歸零。前往黑網 App 查看。",
              ts: Date.now(),
              read: false,
              type: "promo",
              replies: [],
            };

            return {
              riskLevel: newRisk,
              conversations: newConversations,
              smsMessages: [darknetSms, policeSms, ...s.smsMessages].slice(0, 50),
              unreadSmsCount: s.unreadSmsCount + 2,
            };
          }

          return { riskLevel: newRisk };
        }),

      convertScamToCoin: () => {
        const s = get();
        // 可兌換金額 = 總騙金額 - 已兌換金額
        const unconverted = s.scamScore - s.convertedAmount;
        // 每 $1000 可兌換 10 DRC
        const convertibleDRC = Math.floor(unconverted / 1000) * 10;
        if (convertibleDRC <= 0) return;
        // 記錄已兌換的金額
        const newConverted = s.convertedAmount + (convertibleDRC / 10) * 1000;
        set({
          darkCoin: s.darkCoin + convertibleDRC,
          convertedAmount: newConverted,
        });
      },

      purchaseIntel: (npcId, premium) => {
        const s = get();
        const npc = getNpcById(npcId, s.generatedNpcs);
        if (!npc) return false;
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
        const s = get();
        const npc = getAllNpcs(s.generatedNpcs).find((n) => n.telechatId === tid);
        if (!npc) return { ok: false, error: "查無此 ID，請確認情報是否正確" };
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
        const npc = getNpcById(npcId, s.generatedNpcs);
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
          const npc = getNpcById(npcId, s.generatedNpcs);
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

      removeFriend: (npcId) =>
        set((s) => {
          const newFriendNpcIds = s.friendNpcIds.filter((id) => id !== npcId);
          const newConversations = { ...s.conversations };
          delete newConversations[npcId];
          return {
            friendNpcIds: newFriendNpcIds,
            conversations: newConversations,
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

      addGeneratedNpcs: (npcs) =>
        set((s) => {
          // 保留已解鎖的 generated NPC，移除未解鎖的舊 NPC，加入新的
          const purchasedGen = s.generatedNpcs.filter((n) =>
            s.unlockedNpcIds.includes(n.id)
          );
          // 新的未解鎖 NPC（最多保留 6 個未解鎖的，避免列表過長）
          const newUnpurchased = npcs.filter((n) => !s.unlockedNpcIds.includes(n.id));
          const allUnpurchased = newUnpurchased.slice(0, 6);
          return {
            generatedNpcs: [...purchasedGen, ...allUnpurchased],
          };
        }),

      // === 短訊操作 ===
      addSms: (sms) =>
        set((s) => {
          const newSms: SmsMessage = {
            ...sms,
            id: genId(),
            ts: Date.now(),
            read: false,
            replies: [],
          };
          return {
            smsMessages: [newSms, ...s.smsMessages].slice(0, 50), // 最多保留 50 則
            unreadSmsCount: s.unreadSmsCount + 1,
          };
        }),

      markSmsRead: (id) =>
        set((s) => {
          const smsMessages = s.smsMessages.map((m) =>
            m.id === id ? { ...m, read: true } : m
          );
          const unreadSmsCount = smsMessages.filter((m) => !m.read).length;
          return { smsMessages, unreadSmsCount };
        }),

      markAllSmsRead: () =>
        set((s) => ({
          smsMessages: s.smsMessages.map((m) => ({ ...m, read: true })),
          unreadSmsCount: 0,
        })),

      deleteSms: (id) =>
        set((s) => {
          const smsMessages = s.smsMessages.filter((m) => m.id !== id);
          const unreadSmsCount = smsMessages.filter((m) => !m.read).length;
          return { smsMessages, unreadSmsCount };
        }),

      replySms: (id, text) =>
        set((s) => {
          const trimmed = text.trim();
          if (!trimmed) return {};
          const playerReply: SmsReply = {
            id: genId(),
            text: trimmed,
            ts: Date.now(),
            fromPlayer: true,
          };
          let systemReply: SmsReply | null = null;
          let trafficDelta = -100; // 非關鍵字回覆扣 100MB
          let darkCoinDelta = 0;
          const sms = s.smsMessages.find((m) => m.id === id);
          if (!sms) return {};

          const upper = trimmed.toUpperCase();
          // 處理 YES 關鍵字（購買 2GB 補充包）
          if (upper === "YES" || upper === "Y" || upper === "是" || upper === "好") {
            if (s.darkCoin >= 30 && sms.type === "traffic") {
              trafficDelta = 2000; // +2GB
              darkCoinDelta = -30;
              systemReply = {
                id: genId(),
                text: "交易成功！已為您補充 2GB 數據，扣費 30 DRC。感謝您使用電信公司服務。",
                ts: Date.now(),
                fromPlayer: false,
              };
            } else if (s.darkCoin < 30) {
              systemReply = {
                id: genId(),
                text: "您的 DRC 餘額不足（需 30 DRC）。請充值後再試。",
                ts: Date.now(),
                fromPlayer: false,
              };
            } else {
              systemReply = {
                id: genId(),
                text: "此服務不適用於此簡訊類型。",
                ts: Date.now(),
                fromPlayer: false,
              };
            }
          }

          const newReplies = [...(sms.replies || []), playerReply];
          if (systemReply) newReplies.push(systemReply);

          const smsMessages = s.smsMessages.map((m) =>
            m.id === id ? { ...m, replies: newReplies } : m
          );

          const newDataTraffic = Math.max(0, s.dataTraffic + trafficDelta);
          const newDarkCoin = Math.max(0, s.darkCoin + darkCoinDelta);

          return {
            smsMessages,
            dataTraffic: newDataTraffic,
            darkCoin: newDarkCoin,
          };
        }),

      // === 購買新電話號碼（黑網服務）===
      // 花費 350 DRC，重置風控值為 0，獲得新身份（新代號 + 頭像 + TeleChat ID）
      buyPhoneNumber: () => {
        const s = get();
        const PHONE_PRICE = 350;
        if (s.darkCoin < PHONE_PRICE) {
          return { ok: false, error: `DRC 不足，需要 ${PHONE_PRICE} DRC` };
        }

        const newAlias = randomAlias();
        const newAvatar = randomEmoji();
        const newTelechatId = randomTelechatId();

        // 發送「黑網服務確認」簡訊
        const confirmSms: SmsMessage = {
          id: genId(),
          sender: "黑網服務",
          subject: "【黑網】新號碼已啟用",
          body: `您的新號碼已啟用。代號：${newAlias}。風控記錄已清除。請謹慎使用，避免再次被標記。`,
          ts: Date.now(),
          read: false,
          type: "system",
          replies: [],
        };

        set({
          darkCoin: s.darkCoin - PHONE_PRICE,
          riskLevel: 0,
          alias: newAlias,
          playerAvatar: newAvatar,
          playerTelechatId: newTelechatId,
          playerId: genId(),
          smsMessages: [confirmSms, ...s.smsMessages].slice(0, 50),
          unreadSmsCount: s.unreadSmsCount + 1,
        });

        return { ok: true, newAlias };
      },

      // 看廣告免費購買新號碼（不扣 DRC）
      buyPhoneNumberByAd: () => {
        const s = get();
        const newAlias = randomAlias();
        const newAvatar = randomEmoji();
        const newTelechatId = randomTelechatId();

        const confirmSms: SmsMessage = {
          id: genId(),
          sender: "黑網服務",
          subject: "【黑網】新號碼已啟用（廣告兌換）",
          body: `廣告兌換成功！您的新號碼已啟用。代號：${newAlias}。風控記錄已清除。`,
          ts: Date.now(),
          read: false,
          type: "system",
          replies: [],
        };

        set({
          riskLevel: 0,
          alias: newAlias,
          playerAvatar: newAvatar,
          playerTelechatId: newTelechatId,
          playerId: genId(),
          smsMessages: [confirmSms, ...s.smsMessages].slice(0, 50),
          unreadSmsCount: s.unreadSmsCount + 1,
        });

        return { ok: true, newAlias };
      },

      resetGame: () => {
        // 先清除 localStorage（避免 persist middleware 覆蓋回來）
        if (typeof window !== "undefined") {
          window.localStorage.removeItem("simos-scam-sim-save");
          window.localStorage.removeItem("simos_battery");
          window.localStorage.removeItem("simos_agnes_api_key");
          window.localStorage.removeItem("simos_agnes_base_url");
          window.localStorage.removeItem("simos_agnes_model");
          window.localStorage.removeItem("simos_agnes_temperature");
        }
        set({
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
          convertedAmount: 0,
          unlockedNpcIds: [],
          premiumNpcIds: [],
          friendNpcIds: [],
          generatedNpcs: [],
          smsMessages: [],
          unreadSmsCount: 0,
          conversations: {},
          rivalSnapshot: {},
          lastRivalUpdate: 0,
        });
      },
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

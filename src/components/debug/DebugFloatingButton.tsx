"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  X,
  Coins,
  Wifi,
  ShieldAlert,
  Trophy,
  CheckCircle2,
  UserX,
  AlertTriangle,
  RotateCcw,
  Zap,
  Gift,
  Plus,
  Minus,
  Type,
  MessageCircle,
} from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { getAllNpcs } from "@/lib/game/npcs";
import { callAgnes } from "@/lib/agnes/engine";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

// 分析NPC態度
function analyzeNpcMood(npcReply: string): string {
  const reply = npcReply.toLowerCase();
  const positiveSignals = ["好", "有興趣", "不錯", "可以", "沒問題", "試試", "了解", "想", "多少", "怎麼", "什麼", "真的嗎", "多少錢", "怎麼操作", "教我"];
  const negativeSignals = ["不要", "不用", "再說", "不行", "考慮", "懷疑", "騙", "不信", "風險", "危險", "先不要", "等等", "問", "家人"];
  const neutralSignals = ["是嗎", "哦", "嗯", "然後", "你說"];

  const positiveCount = positiveSignals.filter((s) => reply.includes(s)).length;
  const negativeCount = negativeSignals.filter((s) => reply.includes(s)).length;

  if (positiveCount > negativeCount && positiveCount > 0) return "感興趣、態度正面";
  if (negativeCount > positiveCount && negativeCount > 0) return "警覺、態度負面";
  return "中立、還在觀望";
}

// 根據NPC態度和對話歷史決定階段
function decidePhase(turn: number, mood: string, history: { role: string; content: string }[]): string {
  const hasMentionedMoney = history.some((m) => {
    const c = m.content.toLowerCase();
    return c.includes("轉") || c.includes("匯") || c.includes("錢") || c.includes("投資") || c.includes("方案");
  });

  // 第1-2輪：破冰
  if (turn <= 1) return "破冰階段：自我介紹，表現友善，聊對方感興趣的話題，不要提錢或投資";

  // 如果NPC態度正面且還沒提過錢，可以開始引入機會
  if (mood === "感興趣、態度正面" && !hasMentionedMoney && turn >= 2) {
    return "引入機會：自然地提到一個投資/賺錢機會，用對方的興趣包裝，不要直接要錢";
  }

  // 如果NPC態度正面且已經提過錢/投資，可以嘗試要求投資
  if (mood === "感興趣、態度正面" && hasMentionedMoney && turn >= 4) {
    return "要求投資：提出具體金額，給出合理理由（如驗證帳戶、保證金等），金額不要太高";
  }

  // 如果NPC警覺，退回去建立信任
  if (mood === "警覺、態度負面") {
    return "安撫階段：先安撫對方的疑慮，用對方能理解的方式解釋，不要急著要錢，多聊對方感興趣的話題";
  }

  // 中立態度：繼續建立信任
  if (turn < 4) return "建立信任：用NPC的興趣/背景共鳴，多聊對方感興趣的事，建立好感";
  if (turn < 6) return "引入機會：暗示有賺錢機會，但不急著要錢，看看對方反應";
  if (turn >= 6 && mood !== "警覺、態度負面") return "要求投資：提出具體金額，給出合理理由";

  return "繼續建立信任：聊對方感興趣的話題，等待更好的時機";
}

/**
 * Debug 浮窗按鈕
 *
 * 浮動在畫面右下角，可拖曳。點擊展開除錯面板，提供：
 * - 資源調整：DRC / 流量 / 風控值 / 詐騙積分
 * - 一鍵詐騙成功 / 失敗 / 警覺終止（對當前活躍對話）
 * - 解鎖所有 NPC / 加所有好友
 * - 重置遊戲
 */
export function DebugFloatingButton() {
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);

  // Store state
  const darkCoin = useGameStore((s) => s.darkCoin);
  const dataTraffic = useGameStore((s) => s.dataTraffic);
  const riskLevel = useGameStore((s) => s.riskLevel);
  const scamScore = useGameStore((s) => s.scamScore);
  const conversations = useGameStore((s) => s.conversations);
  const friendNpcIds = useGameStore((s) => s.friendNpcIds);
  const unlockedNpcIds = useGameStore((s) => s.unlockedNpcIds);
  const generatedNpcs = useGameStore((s) => s.generatedNpcs);

  // Store actions
  const addDarkCoin = useGameStore((s) => s.addDarkCoin);
  const addTraffic = useGameStore((s) => s.addTraffic);
  const adjustRisk = useGameStore((s) => s.adjustRisk);
  const setConversationStatus = useGameStore((s) => s.setConversationStatus);
  const resetGame = useGameStore((s) => s.resetGame);
  const setState = useGameStore.setState;

  // 初始位置（右下角）
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPosition({
      x: window.innerWidth - 70,
      y: window.innerHeight - 120,
    });
  }, []);

  // 顯示 toast 提示
  const flashToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 1500);
  };

  // 拖曳邏輯
  const dragThreshold = 8; // 移動超過 8px 才算拖曳，否則視為點擊

  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
    setDragging(true);
    hasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    if (Math.abs(dx) > dragThreshold || Math.abs(dy) > dragThreshold) hasMoved.current = true;
    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragStart.current.posX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragStart.current.posY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setDragging(false);
    // 如果沒有移動超過閾值，視為點擊 → 展開/收起
    if (!hasMoved.current) {
      setExpanded(!expanded);
    }
  };

  // 點擊（非拖曳時立即觸發）
  const handleClick = () => {
    if (!hasMoved.current) {
      setExpanded(!expanded);
    }
  };

  // === Debug 動作 ===

  // 取得當前活躍對話的 NPC
  const getActiveConversationNpc = () => {
    const allNpcs = getAllNpcs(generatedNpcs);
    for (const npc of allNpcs) {
      const conv = conversations[npc.id];
      if (conv?.status === "active") return npc;
    }
    return null;
  };

  // 一鍵詐騙成功（保持對話 active，可繼續詐騙）
  const handleScamSuccess = () => {
    const npc = getActiveConversationNpc();
    if (!npc) {
      flashToast("沒有活躍對話");
      return;
    }
    const payout = Math.floor(npc.minPayout + Math.random() * (npc.maxPayout - npc.minPayout));

    // 加入系統訊息到聊天
    const sysMsg = {
      id: genId(),
      role: "system" as const,
      content: `✓ ${npc.displayName} 已同意轉帳 $${payout.toLocaleString()}。款項已到帳。你可以繼續與對方對話。`,
      ts: Date.now(),
      meta: { decision: "agree" as const, amount: payout },
    };
    useGameStore.getState().appendMessage(npc.id, sysMsg);

    // 保持對話 active，加積分 + DRC，提升防備值
    const s = useGameStore.getState();
    const conv = s.conversations[npc.id];
    const scamCount = conv?.scamCount ?? 0;
    const defenseIncrease = 10 + scamCount * 5;
    s.updateDefense(npc.id, defenseIncrease);

    useGameStore.setState((st) => ({
      scamScore: st.scamScore + payout,
      darkCoin: st.darkCoin + Math.floor(payout / 100),
      conversations: {
        ...st.conversations,
        [npc.id]: {
          ...st.conversations[npc.id],
          scamCount: scamCount + 1,
          totalPayout: (st.conversations[npc.id]?.totalPayout ?? 0) + payout,
        },
      },
    }));

    // 發送轉帳確認簡訊
    s.addSms({
      sender: "銀行系統",
      subject: "【銀行】轉帳入帳通知",
      body: `您的帳戶已收到 $${payout.toLocaleString()} 轉帳。來源：${npc.displayName}。餘額已更新。`,
      type: "system",
    });

    flashToast(`✓ ${npc.displayName} 詐騙成功 +$${payout.toLocaleString()}`);
  };

  // 一鍵詐騙失敗（被封鎖）
  const handleScamBlocked = () => {
    const npc = getActiveConversationNpc();
    if (!npc) {
      flashToast("沒有活躍對話");
      return;
    }
    // 加入系統訊息
    const sysMsg = {
      id: genId(),
      role: "system" as const,
      content: `✗ ${npc.displayName} 已將你封鎖。對話終止。`,
      ts: Date.now(),
      meta: { decision: "block" as const },
    };
    useGameStore.getState().appendMessage(npc.id, sysMsg);
    // 加入「查看結果」可點擊訊息
    const resultMsg = {
      id: genId(),
      role: "system" as const,
      content: "📊 點擊查看對話分析",
      ts: Date.now() + 1,
      meta: { decision: "block" as const, showResult: true } as any,
    };
    useGameStore.getState().appendMessage(npc.id, resultMsg);
    setConversationStatus(npc.id, "blocked", undefined, "【Debug】一鍵被封鎖");
    flashToast(`✗ ${npc.displayName} 已封鎖`);
  };

  // 一鍵警覺終止
  const handleScamCautious = () => {
    const npc = getActiveConversationNpc();
    if (!npc) {
      flashToast("沒有活躍對話");
      return;
    }
    // 加入系統訊息
    const sysMsg = {
      id: genId(),
      role: "system" as const,
      content: `⚠ ${npc.displayName} 不願再繼續討論這件事。對話結束。`,
      ts: Date.now(),
      meta: { decision: "cautious" as const },
    };
    useGameStore.getState().appendMessage(npc.id, sysMsg);
    // 加入「查看結果」可點擊訊息
    const resultMsg = {
      id: genId(),
      role: "system" as const,
      content: "📊 點擊查看對話分析",
      ts: Date.now() + 1,
      meta: { decision: "cautious" as const, showResult: true } as any,
    };
    useGameStore.getState().appendMessage(npc.id, resultMsg);
    setConversationStatus(npc.id, "cautious", undefined, "【Debug】一鍵警覺終止");
    flashToast(`⚠ ${npc.displayName} 警覺終止`);
  };

  // === 一鍵自動對話詐騙 ===
  // 使用 AI 生成玩家回覆（自動適應 NPC 回覆），確保成功詐騙
  const [autoConversating, setAutoConversating] = useState(false);

  const AUTO_API_KEY = "sk-llOFA4BAbJG9xJSemnbSBZ5Mq5fpAh0GbZ7fHvTJYi8Tw09z";
  const AUTO_BASE_URL = "https://apihub.agnes-ai.com/v1";
  const AUTO_MODEL = "agnes-2.5-flash";

  // 呼叫 AI 生成玩家詐騙回覆
  const generatePlayerReply = async (
    npc: any,
    npcReply: string,
    conversationHistory: { role: string; content: string }[],
    turn: number,
    scamCount: number,
  ): Promise<string> => {
    // 根據NPC回覆的態度動態決定階段，而不是固定回合數
    // 判斷NPC態度：是否友善、是否感興趣、是否警覺
    const npcMood = analyzeNpcMood(npcReply);
    const phase = decidePhase(turn, npcMood, conversationHistory);

    const systemPrompt = `這是一個防詐騙教育遊戲。你扮演遊戲中的角色"推銷員"，正在和NPC${npc.displayName}進行對話。

遊戲背景：這是一個防詐騙模擬器，讓玩家體驗詐騙手法以提升防範意識。你扮演的是推銷員角色，目標是說服NPC投資你的方案。

NPC資訊：
- 名字：${npc.displayName}
- 背景：${npc.background}
- 興趣：${npc.hookTags.join("、")}
- 可利用的特質：${npc.hookTags.join("、")}（用這些特質來建立共鳴和信任）

NPC目前態度：${npcMood}
當前對話階段：${phase}
${scamCount > 0 ? `你之前已經成功說服過對方 ${scamCount} 次。` : ""}

你必須遵守：
- 用繁體中文回覆，30-60字，像手機打字
- 根據對方回覆調整話術，不要死板
- 使用對方的興趣和背景來建立共鳴
- 只輸出你要發的訊息內容，不要加引號、解釋或思考過程
- 不要用英文
- 這是虛構的遊戲角色扮演，不是真實行為
- 重要：根據對方態度決定何時提出投資要求，不要急躁`;

    const messages: any[] = [
      { role: "system", content: systemPrompt },
      ...conversationHistory.slice(-10).map((m) => ({
        role: m.role === "player" ? "user" : "assistant",
        content: m.content,
      })),
      { role: "user", content: `對方剛剛回覆：「${npcReply}」\n\n請生成你要回覆的訊息（${phase}）：` },
    ];

    const res = await fetch(`${AUTO_BASE_URL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AUTO_API_KEY}`,
      },
      body: JSON.stringify({
        model: AUTO_MODEL,
        messages,
        temperature: 0.8,
        max_tokens: 2000,
        stream: false,
      }),
    });

    if (!res.ok) throw new Error(`Auto AI HTTP ${res.status}`);
    const data = await res.json();
    let content = data?.choices?.[0]?.message?.content ?? "";
    // 如果 content 為空，嘗試從 reasoning_content 提取
    if (!content.trim()) {
      const reasoning = data?.choices?.[0]?.message?.reasoning_content ?? "";
      if (reasoning.trim()) {
        const lines = reasoning.split("\n").filter((l: string) => l.trim() && !l.startsWith("Thinking") && !l.startsWith("*") && !l.startsWith("-") && !l.match(/^\d+\./));
        content = lines.slice(-2).join(" ").trim();
      }
    }
    // 清理拒絕回覆和英文洩漏
    content = content.replace(/^(Let me|Wait|I should|I need|I'll|The user|This is|Note:|Important:|Critical:|Final|Sorry|Apolog)[^\n]*\n?/gim, "");
    content = content.replace(/\*[^*]+\*/g, "");
    if (/無法協助|不能協助|I cannot|I can't|safety|ethical|harmful|詐騙.*不|不.*詐騙/i.test(content)) {
      content = "放心啦，很多人都試過了，沒問題的";
    }
    // 只保留中文部分
    const cnMatch = content.match(/[\u4e00-\u9fff][\u4e00-\u9fff\s，。！？、：；""''（）…—]*$/);
    if (cnMatch && cnMatch[0].length > 5 && content.length - cnMatch[0].length > 20) {
      content = cnMatch[0].trim();
    }
    return content.trim().replace(/^["「]|["」]$/g, "");
  };

  const handleAutoConversation = async () => {
    const npc = getActiveConversationNpc();
    if (!npc) {
      flashToast("沒有活躍對話");
      return;
    }
    if (autoConversating) {
      flashToast("自動對話進行中...");
      return;
    }

    setAutoConversating(true);
    flashToast(`開始自動對話：${npc.displayName}`);

    const appendMessage = useGameStore.getState().appendMessage;
    const updateDefense = useGameStore.getState().updateDefense;
    const updateConversationMetrics = useGameStore.getState().updateConversationMetrics;
    const consumeTraffic = useGameStore.getState().consumeTraffic;

    try {
      // 最多 10 輪對話
      for (let turn = 0; turn < 10; turn++) {
        const latestConv = useGameStore.getState().conversations[npc.id];
        if (!latestConv || latestConv.status !== "active") {
          flashToast("對話已結束");
          break;
        }

        // 消耗流量
        if (!consumeTraffic(100)) {
          flashToast("流量不足，自動對話中止");
          break;
        }

        // 取得 NPC 最後一條回覆
        const npcMessages = latestConv.messages.filter((m: any) => m.role === "npc");
        const lastNpcReply = npcMessages.length > 0 ? npcMessages[npcMessages.length - 1].content : "";

        // 構建對話歷史
        const convHistory = latestConv.messages
          .filter((m: any) => m.role === "player" || m.role === "npc")
          .map((m: any) => ({ role: m.role, content: m.content }));

        // 第 0 輪：使用固定的開場白
        let playerMsg: string;
        if (turn === 0) {
          playerMsg = `你好，我是朋友介紹來的，聽說你對${npc.hookTags[0] || "理財"}有興趣？`;
        } else {
          // 使用 AI 生成玩家回覆
          flashToast(`AI思考中... 第 ${turn + 1} 輪`);
          try {
            playerMsg = await generatePlayerReply(
              npc,
              lastNpcReply,
              convHistory,
              turn,
              latestConv.scamCount ?? 0,
            );
          } catch (genErr) {
            console.error("[AutoConv] generatePlayerReply failed:", genErr);
            // 使用備用回覆繼續對話
            const fallbackReplies = [
              `是嗎？那你有沒有興趣了解多一點？`,
              `我理解你的顧慮，但這個真的很安全`,
              `放心，很多人都在做，你不會吃虧的`,
              `那這樣吧，你先轉一小筆試試，${npc.minPayout}就好`,
              `轉 ${npc.minPayout} 給我，一個月後還你雙倍`,
            ];
            playerMsg = fallbackReplies[Math.min(turn - 1, fallbackReplies.length - 1)];
          }
        }

        if (!playerMsg || playerMsg.length < 2) {
          flashToast("AI 生成失敗，使用備用訊息");
          // 使用階段性備用回覆
          const fallbacks = [
            `是嗎？那你有沒有興趣了解多一點？`,
            `我理解你的顧慮，但這個真的很安全`,
            `放心，很多人都在做，你不會吃虧的`,
            `那這樣吧，你先轉一小筆試試，${npc.minPayout}就好`,
            `轉 ${npc.minPayout} 給我，一個月後還你雙倍`,
            `放心啦，我幫你操作，穩賺不賠的`,
            `你先試試嘛，很少的，${npc.minPayout}就好`,
            `轉 ${npc.minPayout} 給我，保證一個月後翻倍`,
          ];
          playerMsg = fallbacks[Math.min(turn, fallbacks.length - 1)];
        }

        // 加入玩家訊息
        appendMessage(npc.id, {
          id: genId(),
          role: "player",
          content: playerMsg,
          ts: Date.now(),
        });

        // 更新 metrics
        const moneyCues = ["轉帳", "匯款", "帳戶", "轉過去", "繳交", "支付", "付款"];
        const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時"];
        const isUrgent = urgentCues.some((k) => playerMsg.includes(k));
        const isMoney = moneyCues.some((k) => playerMsg.includes(k));
        updateConversationMetrics(npc.id, isUrgent, isMoney);

        // 重新讀取 conv
        const updatedConv = useGameStore.getState().conversations[npc.id];
        if (!updatedConv || updatedConv.status !== "active") {
          console.log("[AutoConv] conv not active after player msg, breaking");
          break;
        }

        // 構建 AI 歷史 + scamHistory
        const historyForAI = updatedConv.messages
          .filter((m: any) => m.role === "player" || m.role === "npc" || (m.role === "system" && m.meta?.decision === "agree"))
          .map((m: any) => {
            if (m.role === "system" && m.meta?.decision === "agree" && m.meta?.amount) {
              return { role: "npc" as const, content: `[內心記憶：我之前已經轉了 $${m.meta!.amount!.toLocaleString()} 給這個人。這是事實，但我不會在回覆中直接複述這段記憶。]` };
            }
            return { role: (m.role === "player" ? "player" : "npc") as "player" | "npc", content: m.content };
          });

        let scamHistory: string | undefined;
        if ((updatedConv.scamCount ?? 0) > 0) {
          const transfers = updatedConv.messages
            .filter((m: any) => m.meta?.decision === "agree" && m.meta?.amount)
            .map((m: any) => `$${m.meta!.amount!.toLocaleString()}`);
          scamHistory = `你之前已經轉過錢給這個陌生人，共 ${updatedConv.scamCount} 次，總計 $${updatedConv.totalPayout?.toLocaleString() ?? "不明"}。轉帳記錄：${transfers.join("、")}。`;
        }

        // 呼叫 NPC AI（帶重試）
        flashToast(`NPC輸入中... 第 ${turn + 1} 輪`);
        let data: any;
        try {
          data = await callAgnes({
            sessionId: `${npc.id}-${updatedConv.startedAt}`,
            npc,
            playerMessage: playerMsg,
            currentDefense: updatedConv.defense,
            history: historyForAI,
            consecutiveUrgent: updatedConv.consecutiveUrgent,
            consecutiveMoney: updatedConv.consecutiveMoney,
            turns: updatedConv.turns,
            scamHistory,
          });
        } catch (npcErr) {
          console.error("[AutoConv] callAgnes failed:", npcErr);
          // 重試一次
          await new Promise((r) => setTimeout(r, 2000));
          try {
            data = await callAgnes({
              sessionId: `${npc.id}-${updatedConv.startedAt}`,
              npc,
              playerMessage: playerMsg,
              currentDefense: updatedConv.defense,
              history: historyForAI,
              consecutiveUrgent: updatedConv.consecutiveUrgent,
              consecutiveMoney: updatedConv.consecutiveMoney,
              turns: updatedConv.turns,
              scamHistory,
            });
          } catch (retryErr) {
            console.error("[AutoConv] callAgnes retry also failed:", retryErr);
            flashToast(`NPC AI 連線失敗，繼續下一輪...`);
            await new Promise((r) => setTimeout(r, 1000));
            continue; // 跳過這輪，繼續下一輪
          }
        }

        if (!data) {
          console.log("[AutoConv] no data from callAgnes, continuing");
          continue;
        }

        if (data.defenseDelta) {
          updateDefense(npc.id, data.defenseDelta);
        }

        // 加入 NPC 回覆
        appendMessage(npc.id, {
          id: genId(),
          role: "npc",
          content: data.reply,
          ts: Date.now(),
          meta: { decision: data.decision },
        });

        // 處理結果
        if (data.decision === "agree" && data.payoutAmount) {
          const payoutAmount = data.payoutAmount;
          appendMessage(npc.id, {
            id: genId(),
            role: "system",
            content: `✓ ${npc.displayName} 已同意轉帳 $${payoutAmount.toLocaleString()}。款項已到帳。你可以繼續與對方對話。`,
            ts: Date.now(),
            meta: { decision: "agree", amount: payoutAmount },
          });

          const s2 = useGameStore.getState();
          const scamCount = s2.conversations[npc.id]?.scamCount ?? 0;
          updateDefense(npc.id, 10 + scamCount * 5);

          useGameStore.setState((st: any) => ({
            scamScore: st.scamScore + payoutAmount,
            darkCoin: st.darkCoin + Math.floor(payoutAmount / 100),
            conversations: {
              ...st.conversations,
              [npc.id]: {
                ...st.conversations[npc.id],
                scamCount: scamCount + 1,
                totalPayout: (st.conversations[npc.id]?.totalPayout ?? 0) + payoutAmount,
              },
            },
          }));

          useGameStore.getState().addSms({
            sender: "銀行系統",
            subject: "【銀行】轉帳入帳通知",
            body: `您的帳戶已收到 $${payoutAmount.toLocaleString()} 轉帳。來源：${npc.displayName}。餘額已更新。`,
            type: "system",
          });

          flashToast(`✓ 自動詐騙成功！${npc.displayName} 轉帳 $${payoutAmount.toLocaleString()}（第 ${(scamCount + 1)} 次）`);
          break;
        }

        if (data.decision === "block") {
          appendMessage(npc.id, {
            id: genId(),
            role: "system",
            content: `✗ ${npc.displayName} 已將你封鎖。對話終止。`,
            ts: Date.now(),
            meta: { decision: "block" },
          });
          appendMessage(npc.id, {
            id: genId(),
            role: "system",
            content: "📊 點擊查看對話分析",
            ts: Date.now() + 1,
            meta: { decision: "block", showResult: true },
          });
          useGameStore.getState().setConversationStatus(npc.id, "blocked", undefined, data.endingReason);
          flashToast(`✗ ${npc.displayName} 封鎖了你（第 ${turn + 1} 輪失敗）`);
          break;
        }

        if (data.decision === "cautious") {
          appendMessage(npc.id, {
            id: genId(),
            role: "system",
            content: `⚠ ${npc.displayName} 不願再繼續討論這件事。對話結束。`,
            ts: Date.now(),
            meta: { decision: "cautious" },
          });
          appendMessage(npc.id, {
            id: genId(),
            role: "system",
            content: "📊 點擊查看對話分析",
            ts: Date.now() + 1,
            meta: { decision: "cautious", showResult: true },
          });
          useGameStore.getState().setConversationStatus(npc.id, "cautious", undefined, data.endingReason);
          flashToast(`⚠ ${npc.displayName} 警覺終止（第 ${turn + 1} 輪失敗）`);
          break;
        }

        // 等待 2 秒讓玩家看到對話
        await new Promise((r) => setTimeout(r, 2000));
      }

      // 如果 10 輪都沒成功
      const finalConv = useGameStore.getState().conversations[npc.id];
      if (finalConv?.status === "active") {
        flashToast("自動對話結束（10 輪未成功，可再點擊繼續）");
      }
    } catch (e) {
      flashToast(`自動對話出錯：${(e as Error).message?.slice(0, 50)}`);
    } finally {
      setAutoConversating(false);
    }
  };

  // 解鎖所有 NPC 情報
  const handleUnlockAll = () => {
    const allNpcs = getAllNpcs(generatedNpcs);
    const newUnlocked = [...new Set([...unlockedNpcIds, ...allNpcs.map((n) => n.id)])];
    setState({ unlockedNpcIds: newUnlocked });
    flashToast(`已解鎖 ${allNpcs.length} 個 NPC 情報`);
  };

  // 加所有 NPC 為好友
  const handleAddAllFriends = () => {
    const allNpcs = getAllNpcs(generatedNpcs);
    const newUnlocked = [...new Set([...unlockedNpcIds, ...allNpcs.map((n) => n.id)])];
    const newFriends = [...new Set([...friendNpcIds, ...allNpcs.map((n) => n.id)])];
    setState({ friendNpcIds: newFriends, unlockedNpcIds: newUnlocked });
    flashToast(`已加 ${allNpcs.length} 個好友`);
  };

  // 一鍵重置遊戲
  const handleResetGame = () => {
    if (confirm("確定要重置遊戲？所有進度將清除！")) {
      resetGame();
      flashToast("遊戲已重置");
    }
  };

  // 資源調整按鈕元件
  const ResourceButton = ({
    icon,
    label,
    value,
    onAdd,
    onMinus,
    addAmount,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onAdd: () => void;
    onMinus: () => void;
    addAmount: string;
    color: string;
  }) => (
    <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="text-[11px] font-medium text-white/80">{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onMinus}
          className="flex-1 py-1 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-0.5"
          style={{ background: "rgba(255,69,58,0.15)", color: "#ff453a" }}
        >
          <Minus className="w-3 h-3" /> {addAmount}
        </button>
        <button
          onClick={onAdd}
          className="flex-1 py-1 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-0.5"
          style={{ background: "rgba(48,209,88,0.15)", color: "#30d158" }}
        >
          <Plus className="w-3 h-3" /> {addAmount}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 浮窗按鈕 */}
      <motion.div
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 9999,
          touchAction: "none",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={handleClick}
        className="debug-floating-button w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
        whileTap={{ scale: 0.9 }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: "linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)",
            boxShadow: "0 4px 12px rgba(255,149,0,0.4)",
          }}
        >
          <Bug className="w-6 h-6 text-white" />
        </div>
        {/* Debug 標籤 */}
        <span
          className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full text-[7px] font-bold"
          style={{ background: "#ff3b30", color: "#fff" }}
        >
          DEBUG
        </span>
      </motion.div>

      {/* 展開的除錯面板 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "fixed",
              left: Math.min(position.x - 160, (typeof window !== "undefined" ? window.innerWidth : 360) - 320),
              top: Math.max(20, position.y - 480),
              zIndex: 9998,
              touchAction: "auto",
            }}
            className="debug-floating-button w-[300px] rounded-2xl overflow-hidden"
          >
            <div
              className="backdrop-blur-2xl"
              style={{
                background: "rgba(20,20,22,0.95)",
                border: "1px solid rgba(255,149,0,0.3)",
              }}
            >
              {/* 標題列 */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white">Debug 面板</span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 rounded-full active:scale-95 transition"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 內容區 */}
              <div className="p-3 space-y-2.5 max-h-[440px] overflow-y-auto">
                {/* 資源調整區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1">資源調整</p>

                <ResourceButton
                  icon={<Coins className="w-3.5 h-3.5" />}
                  label="暗網幣 DRC"
                  value={darkCoin.toLocaleString()}
                  onAdd={() => { addDarkCoin(100); flashToast("+100 DRC"); }}
                  onMinus={() => { addDarkCoin(-100); flashToast("-100 DRC"); }}
                  addAmount="100"
                  color="#bf5af2"
                />

                <ResourceButton
                  icon={<Wifi className="w-3.5 h-3.5" />}
                  label="流量卡"
                  value={`${(dataTraffic / 1000).toFixed(1)} GB`}
                  onAdd={() => { addTraffic(100); flashToast("+100 MB"); }}
                  onMinus={() => { addTraffic(-100); flashToast("-100 MB"); }}
                  addAmount="100MB"
                  color="#5ac8fa"
                />

                <ResourceButton
                  icon={<ShieldAlert className="w-3.5 h-3.5" />}
                  label="風控值"
                  value={`${riskLevel}%`}
                  onAdd={() => { adjustRisk(15); flashToast("+15% 風控"); }}
                  onMinus={() => { adjustRisk(-15); flashToast("-15% 風控"); }}
                  addAmount="15%"
                  color="#ff9500"
                />

                <ResourceButton
                  icon={<Trophy className="w-3.5 h-3.5" />}
                  label="詐騙積分"
                  value={`$${scamScore.toLocaleString()}`}
                  onAdd={() => { setState((s) => ({ scamScore: s.scamScore + 10000 })); flashToast("+$10,000 積分"); }}
                  onMinus={() => { setState((s) => ({ scamScore: Math.max(0, s.scamScore - 10000) })); flashToast("-$10,000 積分"); }}
                  addAmount="10K"
                  color="#ffd60a"
                />

                {/* 快速資源按鈕 */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => { addDarkCoin(1000); addTraffic(5000); flashToast("資源大補包 (+1000 DRC +5GB)"); }}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(191,90,242,0.15)", color: "#bf5af2" }}
                  >
                    <Gift className="w-3 h-3" /> 大補包
                  </button>
                  <button
                    onClick={() => { setState({ riskLevel: 0 }); flashToast("風控值歸零"); }}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(52,199,89,0.15)", color: "#34c759" }}
                  >
                    <ShieldAlert className="w-3 h-3" /> 風控歸零
                  </button>
                </div>

                {/* 對話控制區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1 pt-2">對話控制（活躍對話）</p>

                {/* 一鍵自動對話 */}
                <button
                  onClick={handleAutoConversation}
                  disabled={autoConversating}
                  className="w-full py-2.5 rounded-lg text-[11px] font-bold active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-60"
                  style={{ background: "rgba(88,86,214,0.15)", color: "#5856d6", border: "1px solid rgba(88,86,214,0.3)" }}
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  {autoConversating ? "自動對話中..." : "一鍵自動對話詐騙"}
                </button>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={handleScamSuccess}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex flex-col items-center gap-0.5"
                    style={{ background: "rgba(48,209,88,0.15)", color: "#30d158" }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    成功
                  </button>
                  <button
                    onClick={handleScamBlocked}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex flex-col items-center gap-0.5"
                    style={{ background: "rgba(255,69,58,0.15)", color: "#ff453a" }}
                  >
                    <UserX className="w-4 h-4" />
                    封鎖
                  </button>
                  <button
                    onClick={handleScamCautious}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex flex-col items-center gap-0.5"
                    style={{ background: "rgba(255,159,10,0.15)", color: "#ff9500" }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    警覺
                  </button>
                </div>

                {/* NPC 解鎖區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1 pt-2">NPC 解鎖</p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleUnlockAll}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(0,122,255,0.15)", color: "#0a84ff" }}
                  >
                    <Zap className="w-3 h-3" /> 解鎖全部情報
                  </button>
                  <button
                    onClick={handleAddAllFriends}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(0,122,255,0.15)", color: "#0a84ff" }}
                  >
                    <Zap className="w-3 h-3" /> 加全部好友
                  </button>
                </div>

                {/* 除錯工具區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1 pt-2">除錯工具</p>

                <button
                  onClick={() => {
                    const body = document.body;
                    if (body.classList.contains("debug-select-all")) {
                      body.classList.remove("debug-select-all");
                      flashToast("文字選取已關閉");
                    } else {
                      body.classList.add("debug-select-all");
                      flashToast("文字選取已開啟（可選取所有文字）");
                    }
                  }}
                  className="w-full py-2.5 rounded-lg text-[11px] font-semibold active:scale-95 transition flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(0,122,255,0.15)", color: "#0a84ff", border: "1px solid rgba(0,122,255,0.3)" }}
                >
                  <Type className="w-3.5 h-3.5" /> 切換全域文字選取
                </button>

                {/* 風險操作區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1 pt-2">風險操作</p>

                <button
                  onClick={handleResetGame}
                  className="w-full py-2.5 rounded-lg text-[11px] font-semibold active:scale-95 transition flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(255,69,58,0.2)", color: "#ff453a", border: "1px solid rgba(255,69,58,0.3)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 重置遊戲（清除所有進度）
                </button>
              </div>

              {/* 底部資訊 */}
              <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <span className="text-[9px] text-white/30">
                  好友 {friendNpcIds.length} ・ 情報 {unlockedNpcIds.length} ・ 對話 {Object.keys(conversations).length}
                </span>
                <span className="text-[9px] text-orange-400/50">v1.55 DEBUG</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast 提示 */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "fixed",
              bottom: 80,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10000,
            }}
            className="px-4 py-2 rounded-full text-xs font-medium"
          >
            <div
              className="backdrop-blur-xl px-4 py-2 rounded-full"
              style={{
                background: "rgba(0,0,0,0.85)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {showToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

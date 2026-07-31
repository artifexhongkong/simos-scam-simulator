"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserX,
  Trophy,
  RotateCcw,
  Download,
  Clock,
  ChevronUp,
  Image as ImageIcon,
  X,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { useGameStore, type ChatMessage } from "@/lib/game/store";
import type { NpcProfile } from "@/lib/game/npcs";
import { callAgnes } from "@/lib/agnes/engine";
import { QuickPhrases } from "./QuickPhrases";
import { ImageMaterials } from "./ImageMaterials";
import { EndingPanel } from "./EndingPanel";

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ChatWindow({ npc, onBack }: { npc: NpcProfile; onBack: () => void }) {
  const conv = useGameStore((s) => s.conversations[npc.id]);
  const appendMessage = useGameStore((s) => s.appendMessage);
  const updateDefense = useGameStore((s) => s.updateDefense);
  const setConversationStatus = useGameStore((s) => s.setConversationStatus);
  const updateConversationMetrics = useGameStore((s) => s.updateConversationMetrics);
  const resetConversation = useGameStore((s) => s.resetConversation);
  const consumeTraffic = useGameStore((s) => s.consumeTraffic);
  const dataTraffic = useGameStore((s) => s.dataTraffic);
  const theme = useGameStore((s) => s.theme);
  const showTimestamps = useGameStore((s) => s.showTimestamps);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [showEnding, setShowEnding] = useState(false);
  const [showQuickPhrases, setShowQuickPhrases] = useState(false);
  const [showImageMaterials, setShowImageMaterials] = useState(false);
  const [showNpcInfo, setShowNpcInfo] = useState(false);
  const [resetCount, setResetCount] = useState(0); // 重置次數：0=未用過免費額，>=1=已用過免費額，後續需看廣告
  const [showAdModal, setShowAdModal] = useState(false); // 廣告彈窗
  const [adCountdown, setAdCountdown] = useState(0); // 廣告倒數計時
  const [adCompleted, setAdCompleted] = useState(false); // 廣告是否看完
  const [failedMessages, setFailedMessages] = useState<Set<string>>(new Set());
  const [aiVerified, setAiVerified] = useState(false); // 第一次成功後設為 true，之後不再驗證
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const userScrolledUpRef = useRef(false);
  const lastScrollTsRef = useRef(0);

  const scrollToBottom = useCallback((force = false) => {
    const now = Date.now();
    if (!force && now - lastScrollTsRef.current < 100) return;
    lastScrollTsRef.current = now;
    if (!scrollRef.current) return;
    const el = scrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 150) userScrolledUpRef.current = false;
    if (!force && userScrolledUpRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      userScrolledUpRef.current = distanceFromBottom > 150;
    };
    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleResize = () => {
      if (window.visualViewport) {
        const kbHeight = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(kbHeight > 50 ? kbHeight : 0);
      }
      setTimeout(() => scrollToBottom(false), 50);
      setTimeout(() => scrollToBottom(false), 200);
    };
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);
    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", handleResize);
      window.visualViewport.addEventListener("scroll", handleResize);
    }
    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", handleResize);
        window.visualViewport.removeEventListener("scroll", handleResize);
      }
    };
  }, [scrollToBottom]);

  useEffect(() => {
    requestAnimationFrame(() => scrollToBottom(false));
  }, [conv?.messages.length, thinking, scrollToBottom]);

  const handleInputFocus = () => {
    setTimeout(() => scrollToBottom(true), 100);
    setTimeout(() => scrollToBottom(true), 300);
  };

  // 對話結束時不自動彈出結果面板（改為在聊天中顯示可點擊的系統訊息）
  // 用戶點擊聊天中的「查看結果」系統訊息才會彈出

  if (!conv) {
    return (
      <div className="h-full flex items-center justify-center text-[color:var(--im-bubble-system-text)] text-sm">
        載入中...
      </div>
    );
  }

  const isLocked = conv.status !== "active";

  const sendMessage = async (text: string, imageMaterial?: { type: string; label: string }, retryMsgId?: string) => {
    const trimmed = (text || "").trim();
    if (!trimmed && !imageMaterial) return;
    if (thinking) return;
    const latestConv = useGameStore.getState().conversations[npc.id];
    if (!latestConv || latestConv.status !== "active") return;

    // 流量檢查：每則訊息消耗 100MB
    const TRAFFIC_PER_MSG = 100;
    if (!consumeTraffic(TRAFFIC_PER_MSG)) {
      // 流量不足，號碼被封
      const blockMsg: ChatMessage = {
        id: genId(),
        role: "system",
        content: "✗ 此號碼已被電信商封鎖，對話強制中斷。請至情報販子補給站購買免洗 SIM 卡。",
        ts: Date.now(),
      };
      appendMessage(npc.id, blockMsg);
      setConversationStatus(npc.id, "blocked", undefined, "流量耗盡，號碼被封鎖。");
      // 發送電信公司封鎖通知短訊
      useGameStore.getState().addSms({
        sender: "1111",
        subject: "【電信公司】號碼已被暫停服務",
        body: "尊敬的客戶，您的號碼因數據用量異常已被暫停服務。如需恢復，請購買補充卡或聯繫客服。",
        type: "traffic",
      });
      return;
    }

    // 流量低於 500MB 時發送電信公司短訊通知（不再在聊天中顯示警告）
    const remainingTraffic = useGameStore.getState().dataTraffic;
    if (remainingTraffic <= 500 && remainingTraffic > 0) {
      useGameStore.getState().addSms({
        sender: "1111",
        subject: "【電信公司】數據用量提醒",
        body: `您的數據剩餘 ${(remainingTraffic / 1000).toFixed(2)} GB，即將用罄。回覆 YES 購買 2GB 補充包（30 DRC），或至情報販子補給站購買免洗 SIM 卡。`,
        type: "traffic",
      });
    }

    setInput("");
    setShowQuickPhrases(false);
    setShowImageMaterials(false);
    setThinking(true);

    const finalText = imageMaterial ? `[圖片：${imageMaterial.label}] ${trimmed}` : trimmed;
    const playerMsg: ChatMessage = {
      id: genId(),
      role: "player",
      content: finalText,
      ts: Date.now(),
      meta: imageMaterial ? { imageType: imageMaterial.type } : undefined,
    };
    appendMessage(npc.id, playerMsg);

    // 偵測訊號
    const moneyCues = ["轉帳", "匯款", "帳戶", "ATM", "OTP", "驗證碼", "轉過去", "匯過去", "繳交", "支付", "付款", "繳費", "存入"];
    const urgentCues = ["急", "快", "現在", "馬上", "立刻", "限時", "今天內"];
    const isUrgent = urgentCues.some((k) => finalText.includes(k));
    const isMoney = moneyCues.some((k) => finalText.includes(k));

    // 更新連續計數 + 輪數
    updateConversationMetrics(npc.id, isUrgent, isMoney);

    const currentMessages = latestConv.messages;
    // 構建 AI 歷史：保留轉帳系統訊息（轉為 NPC 內心記憶），讓 NPC 記得轉過錢
    // 注意：括號內容只給 AI 看作為上下文，NPC 不應在回覆中複述這些括號內容
    const historyForAI = currentMessages
      .filter((m) => m.role === "player" || m.role === "npc" || (m.role === "system" && m.meta?.decision === "agree"))
      .map((m) => {
        if (m.role === "system" && m.meta?.decision === "agree" && m.meta?.amount) {
          // 轉為 NPC 的「記憶」— AI 會看到但不應複述
          return {
            role: "npc" as const,
            content: `[內心記憶：我之前已經轉了 $${m.meta!.amount!.toLocaleString()} 給這個人。這是事實，但我不會在回覆中直接複述這段記憶。]`,
          };
        }
        return {
          role: (m.role === "player" ? "player" : "npc") as "player" | "npc",
          content: m.content,
        };
      });

    // 重新讀取更新後的 conv（含最新 metrics）
    const updatedConv = useGameStore.getState().conversations[npc.id];
    if (!updatedConv) return;

    // 構建 NPC 的詐騙記憶（如果之前轉過錢給玩家）
    let scamHistory: string | undefined;
    if ((updatedConv.scamCount ?? 0) > 0) {
      const transfers = updatedConv.messages
        .filter((m) => m.meta?.decision === "agree" && m.meta?.amount)
        .map((m) => `$${m.meta!.amount!.toLocaleString()}`);
      scamHistory = `你之前已經轉過錢給這個陌生人，共 ${updatedConv.scamCount} 次，總計 ${updatedConv.totalPayout?.toLocaleString() ? '$' + updatedConv.totalPayout.toLocaleString() : '不明金額'}。轉帳記錄：${transfers.join('、')}。`;
    }

    try {
      const data = await callAgnes({
        sessionId: `${npc.id}-${updatedConv.startedAt}`,
        npc,
        playerMessage: finalText,
        currentDefense: updatedConv.defense,
        history: historyForAI,
        consecutiveUrgent: updatedConv.consecutiveUrgent,
        consecutiveMoney: updatedConv.consecutiveMoney,
        turns: updatedConv.turns,
        scamHistory,
      });

      // AI 連線成功 → 標記為已驗證，之後不再驗證
      setAiVerified(true);

      if (data.defenseDelta) {
        updateDefense(npc.id, data.defenseDelta);
      }

      // 不再有人工延遲 — AI 回應後立即顯示

      const npcMsg: ChatMessage = {
        id: genId(),
        role: "npc",
        content: data.reply,
        ts: Date.now(),
        meta: { decision: data.decision },
      };
      appendMessage(npc.id, npcMsg);

      // 處理多結局
      if (data.decision === "agree" && data.payoutAmount) {
        const payoutAmount = data.payoutAmount;
        const sysMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: `✓ ${npc.displayName} 已同意轉帳 $${payoutAmount.toLocaleString()}。款項已到帳。你可以繼續與對方對話。`,
          ts: Date.now(),
          meta: { decision: "agree", amount: payoutAmount },
        };
        appendMessage(npc.id, sysMsg);
        // 記錄詐騙成功（加積分 + DRC），但保持對話為 active（可繼續詐騙）
        // 防備值提升（後續詐騙更難）
        const updatedConv2 = useGameStore.getState().conversations[npc.id];
        if (updatedConv2) {
          const scamCount = updatedConv2.scamCount ?? 0;
          // 每次成功詐騙後防備值 +20（越來越難）
          const defenseIncrease = 20 + scamCount * 10;
          updateDefense(npc.id, defenseIncrease);
          // 記錄詐騙次數
          useGameStore.setState((s) => ({
            conversations: {
              ...s.conversations,
              [npc.id]: {
                ...s.conversations[npc.id],
                scamCount: scamCount + 1,
                totalPayout: (s.conversations[npc.id]?.totalPayout ?? 0) + payoutAmount,
              },
            },
          }));
        }
        // 加積分 + DRC（但狀態保持 active）
        useGameStore.setState((s) => ({
          scamScore: s.scamScore + payoutAmount,
          darkCoin: s.darkCoin + Math.floor(payoutAmount / 100),
        }));

        // 發送銀行轉帳入帳簡訊通知
        useGameStore.getState().addSms({
          sender: "銀行系統",
          subject: "【銀行】轉帳入帳通知",
          body: `您的帳戶已收到 $${payoutAmount.toLocaleString()} 轉帳。來源：${npc.displayName}。餘額已更新。`,
          type: "system",
        });

        setSuccessAnim(true);
        setTimeout(() => setSuccessAnim(false), 2500);
      } else if (data.decision === "block") {
        const sysMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: `✗ ${npc.displayName} 已將你封鎖。對話終止。`,
          ts: Date.now(),
          meta: { decision: "block" },
        };
        appendMessage(npc.id, sysMsg);
        setConversationStatus(npc.id, "blocked", undefined, data.endingReason);
        // 加入「查看結果」可點擊系統訊息
        const resultMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: "📊 點擊查看對話分析",
          ts: Date.now() + 1,
          meta: { decision: "block", showResult: true } as any,
        };
        appendMessage(npc.id, resultMsg);
      } else if (data.decision === "cautious") {
        const sysMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: `⚠ ${npc.displayName} 不願再繼續討論這件事。對話結束。`,
          ts: Date.now(),
          meta: { decision: "cautious" },
        };
        appendMessage(npc.id, sysMsg);
        setConversationStatus(npc.id, "cautious", undefined, data.endingReason);
        // 加入「查看結果」可點擊系統訊息
        const resultMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: "📊 點擊查看對話分析",
          ts: Date.now() + 1,
          meta: { decision: "cautious", showResult: true } as any,
        };
        appendMessage(npc.id, resultMsg);
      }
    } catch (e) {
      console.error("[ChatWindow] callAgnes failed:", e);
      // 只有在尚未驗證通過時才顯示「發送失敗」
      // 已驗證通過後的臨時失敗不顯示（避免打擾玩家對話流暢度）
      if (!aiVerified) {
        setFailedMessages(prev => new Set(prev).add(playerMsg.id));
      } else {
        // 已驗證但臨時失敗 → 顯示系統提示但不阻斷
        const errMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: "⚠ 訊息發送延遲，請稍候再試。",
          ts: Date.now(),
        };
        appendMessage(npc.id, errMsg);
      }
    } finally {
      setThinking(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const handleReset = () => {
    resetConversation(npc.id);
    setResetCount(c => c + 1);
    setAiVerified(false); // 重置後重新需要驗證
    setFailedMessages(new Set()); // 清除失敗標記
    setShowResetConfirm(false);
    setShowEnding(false);
    setThinking(false);
    setSuccessAnim(false);
    setShowAdModal(false);
    setAdCompleted(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 點擊「重新開始」按鈕：第一次免費，之後需看廣告
  const handleResetClick = () => {
    if (resetCount === 0) {
      // 第一次：免費，直接顯示確認彈窗
      setShowResetConfirm(true);
    } else {
      // 之後：需先看廣告
      setShowAdModal(true);
      setAdCompleted(false);
      setAdCountdown(5); // 5 秒廣告
    }
  };

  // 廣告倒數計時
  useEffect(() => {
    if (!showAdModal || adCountdown <= 0) return;
    const timer = setTimeout(() => {
      setAdCountdown(c => {
        if (c <= 1) {
          setAdCompleted(true);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearTimeout(timer);
  }, [showAdModal, adCountdown]);

  // 廣告看完後自動顯示重置確認彈窗
  useEffect(() => {
    if (adCompleted) {
      setTimeout(() => {
        setShowAdModal(false);
        setShowResetConfirm(true);
      }, 500);
    }
  }, [adCompleted]);

  const handleExport = () => {
    const lines: string[] = [];
    lines.push(`# SimOS 對話記錄 - ${npc.displayName}`);
    lines.push(`# 匯出時間：${new Date().toLocaleString("zh-TW")}`);
    lines.push(`# NPC: ${npc.displayName} (${npc.id})`);
    lines.push(`# TeleChat ID: ${npc.telechatId}`);
    lines.push(`# 對話狀態：${conv.status}`);
    if (conv.payout) lines.push(`# 詐騙金額：$${conv.payout.toLocaleString()}`);
    if (conv.endingReason) lines.push(`# 結局：${conv.endingReason}`);
    lines.push(`# 對話輪數：${conv.turns}`);
    lines.push("");
    lines.push("---");
    lines.push("");
    for (const msg of conv.messages) {
      const time = new Date(msg.ts).toLocaleString("zh-TW");
      let speaker: string;
      if (msg.role === "player") speaker = "🧑 玩家";
      else if (msg.role === "npc") speaker = `${npc.avatar} ${npc.displayName}`;
      else speaker = "ℹ️ 系統";
      lines.push(`[${time}] ${speaker}:`);
      lines.push(msg.content);
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `SimOS_${npc.id}_${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const canSend = input.trim().length > 0 && !thinking && !isLocked;

  return (
    <div
      className="h-full min-h-0 flex flex-col relative overflow-hidden"
      style={{ background: "var(--im-bg)" }}
    >
      {/* iOS iMessage 頂部導航欄 */}
      <div
        className="flex items-center px-2 py-2 border-b backdrop-blur-xl z-20 shrink-0"
        style={{
          background: "var(--im-header-bg)",
          borderColor: "var(--im-header-border)",
          color: "var(--im-header-text)",
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[17px] font-normal px-1 active:opacity-50 transition"
          style={{ color: "var(--im-link-text)" }}
          aria-label="返回"
        >
          <ChevronUp className="w-5 h-5 rotate-[-90deg]" />
          <span className="max-w-[60px] truncate">返回</span>
        </button>

        <div className="flex-1 flex flex-col items-center justify-center">
          <button
            onClick={() => setShowNpcInfo(true)}
            className="flex items-center gap-1.5 active:scale-95 transition"
          >
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-base"
              style={{ background: "var(--im-bubble-npc-bg)" }}
            >
              {npc.avatar}
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[16px] font-semibold truncate max-w-[140px]" style={{ color: "var(--im-header-text)" }}>
                {npc.displayName}
              </span>
              {failedMessages.size > 0 && (
                <span className="text-[10px] font-medium" style={{ color: "#ff3b30" }}>
                  連接網絡失敗
                </span>
              )}
            </div>
          </button>
        </div>

        <div className="flex items-center gap-1 w-[80px] justify-end">
          <button
            onClick={handleExport}
            className="p-1.5 rounded-full active:opacity-50 transition"
            style={{ color: "var(--im-link-text)" }}
            aria-label="匯出"
            title="匯出對話"
          >
            <Download className="w-5 h-5" />
          </button>
          <button
            onClick={handleResetClick}
            className="p-1.5 rounded-full active:opacity-50 transition relative"
            style={{ color: "var(--im-link-text)" }}
            aria-label="重新開始"
            title={resetCount === 0 ? "重新開始對話（首次免費）" : "重新開始對話（需觀看廣告）"}
          >
            <RotateCcw className="w-5 h-5" />
            {resetCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-amber-500 flex items-center justify-center" style={{ fontSize: 7 }}>
                <span className="text-white font-bold leading-none">AD</span>
              </span>
            )}
          </button>
        </div>
      </div>

      {/* 成功動畫 */}
      <AnimatePresence>
        {successAnim && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          >
            <div className="flex flex-col items-center gap-3">
              <motion.div
                initial={{ rotate: -180, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
                className="w-24 h-24 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-2xl"
              >
                <Trophy className="w-12 h-12 text-white" />
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="text-center"
              >
                <p className="text-white text-xl font-bold">詐騙成功！</p>
                <p className="text-amber-400 text-2xl font-bold mt-1">
                  +${conv.payout?.toLocaleString()}
                </p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 訊息列表 - iMessage 風格 */}
      <div ref={scrollRef} className="flex-1 min-h-0 overflow-y-auto px-3 py-3 space-y-0.5">
        {conv.messages.map((msg, idx) => (
          <MessageBubble
            key={msg.id}
            msg={msg}
            npcAvatar={npc.avatar}
            showTimestamp={showTimestamps}
            prevMsg={idx > 0 ? conv.messages[idx - 1] : undefined}
            onAvatarClick={() => setShowNpcInfo(true)}
            isFailed={failedMessages.has(msg.id)}
            onResultClick={() => setShowEnding(true)}
            onRetry={() => {
              // 重新發送：移除失敗標記，直接重試
              setFailedMessages(prev => {
                const next = new Set(prev);
                next.delete(msg.id);
                return next;
              });
              sendMessage(msg.content, undefined, msg.id);
            }}
          />
        ))}
        {thinking && (
          <div className="flex items-end gap-1.5 px-2 my-1">
            <div className="w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0" style={{ background: "var(--im-bubble-npc-bg)" }}>
              {npc.avatar}
            </div>
            <div className="px-3 py-2.5" style={{ background: "var(--im-bubble-npc-bg)", borderRadius: "18px 18px 18px 4px" }}>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full"
                    style={{ background: "var(--im-bubble-npc-text)" }}
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* iOS iMessage 輸入區 */}
      {!isLocked && (
        <div
          className="px-2 py-2 border-t backdrop-blur-xl shrink-0"
          style={{
            background: "var(--im-header-bg)",
            borderColor: "var(--im-header-border)",
            // 同時處理軟鍵盤高度 + safe-area-bottom
            paddingBottom: `calc(0.75rem + ${keyboardHeight}px + env(safe-area-inset-bottom, 0px))`,
          }}
        >
          {/* 快捷话术/圖片面板 */}
          <AnimatePresence>
            {showQuickPhrases && (
              <QuickPhrases
                npc={npc}
                onPick={(text) => sendMessage(text)}
                onClose={() => setShowQuickPhrases(false)}
              />
            )}
            {showImageMaterials && (
              <ImageMaterials
                onPick={(mat) => sendMessage(input, mat)}
                onClose={() => setShowImageMaterials(false)}
              />
            )}
          </AnimatePresence>

          <div className="flex items-end gap-1.5">
            {/* 圖片素材按鈕 */}
            <button
              onClick={() => { setShowImageMaterials(!showImageMaterials); setShowQuickPhrases(false); }}
              className="w-7 h-7 rounded-full flex items-center justify-center active:scale-95 transition shrink-0"
              style={{ color: "var(--im-link-text)" }}
              aria-label="圖片素材"
              title="發送偽造圖片素材"
            >
              <ImageIcon className="w-5 h-5" />
            </button>

            {/* 輸入框 */}
            <div
              className="flex-1 flex items-end rounded-[18px] border overflow-hidden"
              style={{
                background: "var(--im-input-bg)",
                borderColor: "var(--im-input-border)",
              }}
            >
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={handleInputFocus}
                onClick={handleInputFocus}
                placeholder="iMessage"
                rows={1}
                disabled={thinking}
                className="flex-1 max-h-24 resize-none bg-transparent px-3 py-1.5 text-[16px] leading-[20px] focus:outline-none disabled:opacity-50"
                style={{
                  color: "var(--im-input-text)",
                  minHeight: "32px",
                }}
              />
              {/* 快捷话术按鈕（輸入框空白時顯示） */}
              {!input.trim() && (
                <button
                  onClick={() => { setShowQuickPhrases(!showQuickPhrases); setShowImageMaterials(false); }}
                  className="px-2 py-1.5 active:scale-95 transition"
                  style={{ color: "var(--im-link-text)" }}
                  aria-label="快捷话术"
                  title="快捷话术庫"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* iOS 藍色箭頭傳送按鈕 */}
            {input.trim().length > 0 && (
              <button
                onClick={() => sendMessage(input)}
                disabled={!canSend}
                className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition shrink-0"
                style={{
                  background: canSend ? "var(--im-link-text)" : "var(--im-bubble-npc-bg)",
                  color: canSend ? "#ffffff" : "var(--im-bubble-system-text)",
                }}
                aria-label="送出"
              >
                {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowUpIcon />}
              </button>
            )}
          </div>
        </div>
      )}

      {/* 重新開始確認彈窗 */}
      <AnimatePresence>
        {showResetConfirm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowResetConfirm(false)}
            className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-2xl border p-5 max-w-xs w-full"
              style={{ background: "var(--im-input-bg)", borderColor: "var(--im-header-border)" }}
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold" style={{ color: "var(--im-header-text)" }}>重新開始對話？</h3>
              </div>
              <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--im-bubble-system-text)" }}>
                目前與 {npc.displayName} 的對話記錄將被清除，警惕值重置。已獲得的詐騙積分不會被歸還。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-lg text-xs font-medium active:scale-95 transition"
                  style={{ background: "var(--im-bubble-npc-bg)", color: "var(--im-bubble-npc-text)" }}
                >
                  取消
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 active:scale-95 transition"
                >
                  確認重置
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 結果面板 */}
      <AnimatePresence>
        {showEnding && (
          <EndingPanel
            npc={npc}
            conv={conv}
            onClose={() => setShowEnding(false)}
            onReset={handleResetClick}
            resetCount={resetCount}
          />
        )}
      </AnimatePresence>

      {/* NPC 情報彈窗（點擊頭像觸發） */}
      <AnimatePresence>
        {showNpcInfo && (
          <NpcInfoModal npc={npc} onClose={() => setShowNpcInfo(false)} />
        )}
      </AnimatePresence>

      {/* 廣告彈窗（重新開始對話需觀看廣告） */}
      <AnimatePresence>
        {showAdModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center"
          >
            {/* 廣告內容（模擬） */}
            <div className="flex-1 flex flex-col items-center justify-center p-6">
              <div
                className="w-full max-w-xs aspect-video rounded-2xl flex flex-col items-center justify-center mb-4 relative overflow-hidden"
                style={{
                  background: "linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)",
                  border: "1px solid rgba(255,255,255,0.1)",
                }}
              >
                <div className="text-5xl mb-3">🎮</div>
                <p className="text-white text-lg font-bold mb-1">SimOS Pro</p>
                <p className="text-white/60 text-xs">解鎖無限重置・進階情報</p>
                {/* 廣告倒數計時覆蓋層 */}
                {!adCompleted && (
                  <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
                    <div className="text-white text-4xl font-bold mb-2">{adCountdown}</div>
                    <p className="text-white/60 text-xs">廣告播放中...</p>
                  </div>
                )}
              </div>
              <p className="text-white/40 text-[10px] text-center leading-relaxed">
                {adCompleted
                  ? "✓ 廣告播放完畢，即將開始重置..."
                  : "觀看完整廣告後即可免費重置對話"}
              </p>
            </div>
            {/* 廣告底部（不可關閉，必須看完） */}
            <div className="px-6 py-4 border-t border-white/10 w-full">
              <p className="text-white/30 text-[10px] text-center">
                廣告 · {adCompleted ? "已完成" : `剩餘 ${adCountdown} 秒`}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// iOS 風格向上箭頭
function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3.5L3 8.5L4.05 9.55L7.2 6.4V13H8.8V6.4L11.95 9.55L13 8.5L8 3.5Z" />
    </svg>
  );
}

function MessageBubble({
  msg,
  npcAvatar,
  showTimestamp,
  prevMsg,
  onAvatarClick,
  isFailed,
  onRetry,
  onResultClick,
}: {
  msg: ChatMessage;
  npcAvatar: string;
  showTimestamp: boolean;
  prevMsg?: ChatMessage;
  onAvatarClick?: () => void;
  isFailed?: boolean;
  onRetry?: () => void;
  onResultClick?: () => void;
}) {
  // 系統訊息：置中，灰色圓角
  if (msg.role === "system") {
    const isAgree = msg.meta?.decision === "agree";
    const isBlock = msg.meta?.decision === "block";
    const isCautious = msg.meta?.decision === "cautious";
    const isResultButton = (msg.meta as any)?.showResult === true;

    // 「查看結果」可點擊系統訊息
    if (isResultButton) {
      return (
        <div className="flex justify-center my-2">
          <button
            onClick={onResultClick}
            className="text-[11px] px-4 py-2 rounded-full flex items-center gap-1.5 max-w-[85%] text-center font-medium active:scale-95 transition"
            style={{
              background: "rgba(0, 122, 255, 0.12)",
              color: "#007aff",
              border: "1px solid rgba(0, 122, 255, 0.2)",
            }}
          >
            📊 點擊查看對話分析
          </button>
        </div>
      );
    }

    return (
      <div className="flex justify-center my-2">
        <div
          className="text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5 max-w-[85%] text-center"
          style={{
            background: isAgree ? "rgba(48, 209, 88, 0.15)" : isBlock ? "rgba(255, 69, 58, 0.15)" : isCautious ? "rgba(255, 159, 10, 0.15)" : "var(--im-bubble-system-bg)",
            color: isAgree ? "#30d158" : isBlock ? "#ff453a" : isCautious ? "#ff9f0a" : "var(--im-bubble-system-text)",
          }}
        >
          {isAgree && <CheckCircle2 className="w-3 h-3 shrink-0" />}
          {isBlock && <UserX className="w-3 h-3 shrink-0" />}
          {isCautious && <AlertCircle className="w-3 h-3 shrink-0" />}
          {msg.content}
        </div>
      </div>
    );
  }

  const isPlayer = msg.role === "player";
  // 判斷是否為同一群組（連續同 role 5 分鐘內）
  const isGroupStart = !prevMsg || prevMsg.role !== msg.role || (msg.ts - prevMsg.ts) > 5 * 60 * 1000;
  // 顯示頭像 only 當 group end（最後一條同 role）
  const showAvatar = !isPlayer;

  // 時間戳顯示（每 group start 顯示）
  const showTime = showTimestamp && isGroupStart;

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.15 }}
      className={`flex items-end gap-1.5 ${isPlayer ? "flex-row-reverse" : ""} ${isGroupStart ? "mt-2" : "mt-0.5"}`}
    >
      {/* NPC 頭像 - 可點擊查看情報 */}
      {showAvatar ? (
        <button
          onClick={() => onAvatarClick?.()}
          className="w-7 h-7 rounded-full flex items-center justify-center text-base shrink-0 active:scale-90 transition"
          style={{ background: "var(--im-bubble-npc-bg)" }}
          aria-label="查看情報"
        >
          {npcAvatar}
        </button>
      ) : (
        !isPlayer && <div className="w-7 shrink-0" />
      )}

      <div className={`flex flex-col ${isPlayer ? "items-end" : "items-start"} max-w-[75%]`}>
        {showTime && (
          <div className="text-[10px] mb-1 px-2" style={{ color: "var(--im-timestamp-text)" }}>
            {new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        )}
        <div
          className="px-3.5 py-2 text-[15px] leading-[20px] whitespace-pre-wrap break-words"
          style={{
            background: isPlayer ? "var(--im-bubble-player-bg)" : "var(--im-bubble-npc-bg)",
            color: isPlayer ? "var(--im-bubble-player-text)" : "var(--im-bubble-npc-text)",
            borderRadius: isPlayer
              ? isGroupStart ? "18px 18px 4px 18px" : "18px 4px 4px 18px"
              : isGroupStart ? "18px 18px 18px 4px" : "4px 18px 18px 4px",
          }}
        >
          {msg.meta?.imageType && (
            <div className="mb-1.5 px-2 py-1 rounded bg-black/20 text-[10px] inline-block">
              📎 圖片素材
            </div>
          )}
          {msg.content}
        </div>
        {/* 發送失敗指示器 */}
        {isFailed && isPlayer && (
          <div className="flex items-center gap-1 mt-0.5">
            <button
              onClick={onRetry}
              className="flex items-center gap-1 text-[11px] font-medium active:scale-95 transition"
              style={{ color: "#ff3b30" }}
            >
              <AlertCircle className="w-3.5 h-3.5" />
              發送失敗 · 點擊重試
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// NPC 情報彈窗（聊天室中點擊頭像查看）
function NpcInfoModal({ npc, onClose }: { npc: NpcProfile; onClose: () => void }) {
  const premiumNpcIds = useGameStore((s) => s.premiumNpcIds);
  const isPremium = premiumNpcIds.includes(npc.id);
  const textMain = "var(--im-header-text)";
  const textSub = "var(--im-bubble-system-text)";

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-3"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full rounded-3xl border overflow-hidden max-h-[80%] flex flex-col"
        style={{ background: "var(--im-header-bg)", borderColor: "var(--im-header-border)" }}
      >
        <div className="p-5 border-b" style={{ borderColor: "var(--im-header-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ background: "var(--im-bubble-npc-bg)" }}>{npc.avatar}</div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: textMain }}>{npc.displayName}</h3>
              <p className="text-xs" style={{ color: textSub }}>年齡 {npc.age} 歲{isPremium ? " · 精準有料" : " · 普通料子"}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto scroll-safe-bottom">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: textSub }}>背景</p>
            <p className="text-sm leading-relaxed" style={{ color: textMain }}>{npc.background}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: textSub }}>可利用特質</p>
            <div className="flex flex-wrap gap-1.5">
              {npc.hookTags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,149,0,0.1)", border: "1px solid rgba(255,149,0,0.2)", color: "#ff9500" }}>{tag}</span>
              ))}
            </div>
          </div>
          {isPremium && (
            <div className="rounded-xl p-3" style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}>
              <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "#ff9500" }}>🔓 核心痛點</p>
              <p className="text-sm leading-relaxed" style={{ color: textMain }}>{npc.hiddenPersonality}</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--im-header-border)" }}>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold active:scale-95 transition" style={{ background: "var(--im-link-text)", color: "#fff" }}>關閉</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

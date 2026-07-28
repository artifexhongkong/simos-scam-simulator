"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Send,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  UserX,
  Trophy,
  RotateCcw,
  Download,
} from "lucide-react";
import { useGameStore, type ChatMessage } from "@/lib/game/store";
import type { NpcProfile } from "@/lib/game/npcs";
import { callAgnes } from "@/lib/agnes/engine";

interface AgnesApiResponse {
  reply: string;
  decision: "continue" | "agree" | "block";
  defenseDelta: number;
  payoutAmount?: number;
  error?: string;
}

function genId() {
  return Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function ChatWindow({ npc }: { npc: NpcProfile }) {
  const conv = useGameStore((s) => s.conversations[npc.id]);
  const appendMessage = useGameStore((s) => s.appendMessage);
  const updateDefense = useGameStore((s) => s.updateDefense);
  const setConversationStatus = useGameStore((s) => s.setConversationStatus);
  const resetConversation = useGameStore((s) => s.resetConversation);

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  // Bug 2.3: 追蹤軟鍵盤高度，動態調整輸入區位置（避免被鍵盤遮擋）
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  // Bug 2.2: 追蹤使用者是否手動向上滾動
  const userScrolledUpRef = useRef(false);
  // Bug 2.3: 防重複執行閾值
  const lastScrollTsRef = useRef(0);

  // 滾動到聊天底部（核心函數）
  const scrollToBottom = useCallback((force = false) => {
    const now = Date.now();
    // 防重複執行：100ms 內不重複觸發
    if (!force && now - lastScrollTsRef.current < 100) return;
    lastScrollTsRef.current = now;

    if (!scrollRef.current) return;

    // Bug 2.2: 若使用者在最底部附近（150px 內），重置 userScrolledUpRef
    const el = scrollRef.current;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    if (distanceFromBottom < 150) {
      userScrolledUpRef.current = false;
    }

    // 若使用者主動向上滾動且非 force，不自動滾動
    if (!force && userScrolledUpRef.current) return;

    // 用 scrollTop = scrollHeight 直接滾動（避免 smooth 衝突延遲）
    el.scrollTop = el.scrollHeight;
  }, []);

  // Bug 2.1: 監聽使用者滾動行為，標記是否手動向上滾動
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      // 若使用者距離底部超過 150px，視為主動向上閱讀歷史訊息
      if (distanceFromBottom > 150) {
        userScrolledUpRef.current = true;
      } else {
        userScrolledUpRef.current = false;
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  // Bug 2.1: 監聽視窗 resize（軟鍵盤彈出/收起會觸發）
  // Bug 2.3: 用 Visual Viewport API 精準偵測鍵盤高度
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleResize = () => {
      // 計算軟鍵盤高度（visualViewport.height 比 window.innerHeight 更精準）
      if (window.visualViewport) {
        const kbHeight = window.innerHeight - window.visualViewport.height;
        setKeyboardHeight(kbHeight > 50 ? kbHeight : 0);
      }

      // 軟鍵盤彈起/收起，強制滾動到底部
      setTimeout(() => scrollToBottom(false), 50);
      setTimeout(() => scrollToBottom(false), 200);
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    // Visual Viewport API（iOS Safari 必備，Android Chrome 也支援）
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

  // 自動滾動到底部（依賴 messages 數量變化）
  useEffect(() => {
    // 新訊息 → 滾動到底
    requestAnimationFrame(() => scrollToBottom(false));
  }, [conv?.messages.length, thinking, scrollToBottom]);

  // 輸入框 focus 時（軟鍵盤彈起）自動滾動到底
  const handleInputFocus = () => {
    // 强制滾動（使用者主動點輸入框，視為想看最新訊息）
    setTimeout(() => scrollToBottom(true), 100);
    setTimeout(() => scrollToBottom(true), 300);
  };

  // 切換 NPC 時自動聚焦輸入框
  useEffect(() => {
    if (conv?.status === "active") {
      inputRef.current?.focus();
    }
  }, [npc.id, conv?.status]);

  if (!conv) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm">
        載入中...
      </div>
    );
  }

  const isLocked = conv.status !== "active";

  // === 關鍵修正：從 store 即時取得最新 messages，避免閉包舊值 ===
  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    // 步驟 5.5: 攔截空白訊息
    if (!trimmed) return;
    if (thinking) return;
    // 從 store 取得最新對話狀態
    const latestConv = useGameStore.getState().conversations[npc.id];
    if (!latestConv || latestConv.status !== "active") return;

    setInput("");
    setThinking(true);

    // 步驟 3.1 修正：先從 store 取得最新歷史（不含本次玩家訊息）
    const currentMessages = latestConv.messages;

    // 先 append 玩家訊息
    const playerMsg: ChatMessage = {
      id: genId(),
      role: "player",
      content: trimmed,
      ts: Date.now(),
    };
    appendMessage(npc.id, playerMsg);

    // 組裝送給 AI 的歷史（不含本次 playerMessage，因為 playerMessage 會作為獨立參數傳遞）
    const historyForAI = currentMessages
      .filter((m) => m.role === "player" || m.role === "npc")
      .map((m) => ({
        role: m.role === "player" ? ("player" as const) : ("npc" as const),
        content: m.content,
      }));

    // 呼叫 Agnes AI 引擎
    try {
      const data: AgnesApiResponse = await callAgnes({
        sessionId: `${npc.id}-${latestConv.startedAt}`,
        npc,
        playerMessage: trimmed,
        currentDefense: latestConv.defense,
        history: historyForAI,
      });

      // 更新防備值
      if (data.defenseDelta) {
        updateDefense(npc.id, data.defenseDelta);
      }

      // 模擬思考時間（讓 loading 更自然）
      await new Promise((r) => setTimeout(r, 300 + Math.random() * 400));

      // append NPC 訊息（步驟 2.3：將 assistant 訊息追加進 message_history）
      const npcMsg: ChatMessage = {
        id: genId(),
        role: "npc",
        content: data.reply,
        ts: Date.now(),
        meta: { decision: data.decision },
      };
      appendMessage(npc.id, npcMsg);

      // 處理決策
      if (data.decision === "agree" && data.payoutAmount) {
        const sysMsg: ChatMessage = {
          id: genId(),
          role: "system",
          content: `✓ ${npc.displayName} 已同意轉帳 $${data.payoutAmount.toLocaleString()}。款項已到帳。`,
          ts: Date.now(),
          meta: { decision: "agree", amount: data.payoutAmount },
        };
        appendMessage(npc.id, sysMsg);
        setConversationStatus(npc.id, "succeeded", data.payoutAmount);
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
        setConversationStatus(npc.id, "blocked");
      }
    } catch (e) {
      console.error("[ChatWindow] callAgnes failed:", e);
      const errMsg: ChatMessage = {
        id: genId(),
        role: "system",
        content: "⚠ 連線中斷，請稍後再試。",
        ts: Date.now(),
      };
      appendMessage(npc.id, errMsg);
    } finally {
      setThinking(false);
      // 重新聚焦輸入框
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  // 步驟 3.4：重新開始對話
  const handleReset = () => {
    resetConversation(npc.id);
    setShowResetConfirm(false);
    setThinking(false);
    setSuccessAnim(false);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  // 步驟 5.4：匯出對話記錄
  const handleExport = () => {
    const lines: string[] = [];
    lines.push(`# SimOS 對話記錄 - ${npc.displayName}`);
    lines.push(`# 匯出時間：${new Date().toLocaleString("zh-TW")}`);
    lines.push(`# NPC ID: ${npc.id}`);
    lines.push(`# TeleChat ID: ${npc.telechatId}`);
    lines.push(`# 對話狀態：${conv.status}`);
    if (conv.payout) lines.push(`# 詐騙金額：$${conv.payout.toLocaleString()}`);
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

  // 步驟 5.5：輸入框按鍵處理 - 攔截空白、Enter 送出
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  // 步驟 5.5：送出按鈕 - 空白時 disabled
  const canSend = input.trim().length > 0 && !thinking && !isLocked;

  return (
    <div className="h-full flex flex-col bg-gradient-to-b from-zinc-900 to-black relative">
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
                <p className="text-white/50 text-xs mt-1">已計入你的業績積分</p>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 頂部操作列：重新開始 + 匯出（任何狀態都可見，方便玩家重來或匯出記錄） */}
      <div className="flex items-center justify-end gap-1 px-3 py-1.5 bg-black/30 border-b border-white/5">
        <button
          onClick={handleExport}
          className="flex items-center gap-1 text-white/50 hover:text-white text-[11px] px-2 py-1 rounded hover:bg-white/5 transition"
          aria-label="匯出對話"
          title="匯出對話記錄"
        >
          <Download className="w-3 h-3" /> 匯出
        </button>
        <button
          onClick={() => setShowResetConfirm(true)}
          className="flex items-center gap-1 text-white/50 hover:text-red-400 text-[11px] px-2 py-1 rounded hover:bg-white/5 transition"
          aria-label="重新開始對話"
          title="重新開始對話"
        >
          <RotateCcw className="w-3 h-3" /> 重新開始
        </button>
      </div>

      {/* 訊息列表 */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {conv.messages.map((msg) => (
          <MessageBubble key={msg.id} msg={msg} npcAvatar={npc.avatar} />
        ))}
        {thinking && (
          <div className="flex items-end gap-2">
            <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-base shrink-0">
              {npc.avatar}
            </div>
            <div className="bg-zinc-800 rounded-2xl rounded-bl-sm px-3 py-2.5">
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <motion.div
                    key={i}
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: i * 0.15 }}
                    className="w-1.5 h-1.5 rounded-full bg-white/60"
                  />
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 狀態 banner */}
      {isLocked && (
        <div
          className={`px-4 py-2 text-xs flex items-center justify-center gap-1.5 ${
            conv.status === "succeeded"
              ? "bg-emerald-500/15 text-emerald-300 border-t border-emerald-500/30"
              : "bg-red-500/15 text-red-300 border-t border-red-500/30"
          }`}
        >
          {conv.status === "succeeded" ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5" />
              詐騙成功，獲得 ${conv.payout?.toLocaleString()} 積分
            </>
          ) : (
            <>
              <UserX className="w-3.5 h-3.5" />
              你已被封鎖，無法繼續對話
            </>
          )}
        </div>
      )}

      {/* 輸入區 - Bug 2.3: 動態調整 padding-bottom 避免被軟鍵盤遮擋 */}
      {!isLocked && (
        <div
          className="px-3 py-2.5 border-t border-white/5 bg-zinc-900/80 flex items-end gap-2"
          style={{ paddingBottom: `calc(0.625rem + ${keyboardHeight}px)` }}
        >
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={handleInputFocus}
            onClick={handleInputFocus}
            placeholder="輸入訊息..."
            rows={1}
            disabled={thinking}
            className="flex-1 max-h-24 resize-none bg-zinc-800 text-white text-sm rounded-2xl px-4 py-2.5 placeholder:text-white/30 focus:outline-none border border-white/5 disabled:opacity-50"
            style={{ minHeight: "40px" }}
          />
          <button
            onClick={() => sendMessage(input)}
            disabled={!canSend}
            className="w-10 h-10 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="送出"
          >
            {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
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
              className="bg-zinc-900 rounded-2xl border border-white/10 p-5 max-w-xs w-full"
            >
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
                <h3 className="text-white text-base font-bold">重新開始對話？</h3>
              </div>
              <p className="text-white/60 text-xs leading-relaxed mb-4">
                目前與 {npc.displayName} 的對話記錄將被清除，NPC 防備值重置。已獲得的詐騙積分不會被歸還。
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-2 rounded-lg bg-zinc-700 text-white text-xs font-medium hover:bg-zinc-600 active:scale-95 transition"
                >
                  取消
                </button>
                <button
                  onClick={handleReset}
                  className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 active:scale-95 transition"
                >
                  確認重置
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MessageBubble({ msg, npcAvatar }: { msg: ChatMessage; npcAvatar: string }) {
  if (msg.role === "system") {
    const isAgree = msg.meta?.decision === "agree";
    const isBlock = msg.meta?.decision === "block";
    return (
      <div className="flex justify-center my-2">
        <div
          className={`text-[11px] px-3 py-1.5 rounded-full flex items-center gap-1.5 ${
            isAgree
              ? "bg-emerald-500/15 text-emerald-300"
              : isBlock
                ? "bg-red-500/15 text-red-300"
                : "bg-white/5 text-white/50"
          }`}
        >
          {isAgree && <CheckCircle2 className="w-3 h-3" />}
          {isBlock && <AlertTriangle className="w-3 h-3" />}
          {msg.content}
        </div>
      </div>
    );
  }

  const isPlayer = msg.role === "player";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.15 }}
      className={`flex items-end gap-2 ${isPlayer ? "flex-row-reverse" : ""}`}
    >
      {!isPlayer && (
        <div className="w-8 h-8 rounded-full bg-zinc-700 flex items-center justify-center text-base shrink-0">
          {npcAvatar}
        </div>
      )}
      <div
        className={`max-w-[75%] px-3.5 py-2 text-sm whitespace-pre-wrap break-words ${
          isPlayer
            ? "bg-blue-600 text-white rounded-2xl rounded-br-sm"
            : "bg-zinc-800 text-white/90 rounded-2xl rounded-bl-sm"
        }`}
      >
        {msg.content}
      </div>
    </motion.div>
  );
}

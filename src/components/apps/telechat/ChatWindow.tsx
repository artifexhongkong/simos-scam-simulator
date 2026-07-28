"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, AlertTriangle, CheckCircle2, UserX, Trophy } from "lucide-react";
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

  const [input, setInput] = useState("");
  const [thinking, setThinking] = useState(false);
  const [successAnim, setSuccessAnim] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [conv?.messages.length, thinking]);

  if (!conv) {
    return (
      <div className="h-full flex items-center justify-center text-white/50 text-sm">
        載入中...
      </div>
    );
  }

  const isLocked = conv.status !== "active";

  const sendMessage = async () => {
    if (!input.trim() || thinking || isLocked) return;
    const text = input.trim();
    setInput("");
    setThinking(true);

    // 先 append 玩家訊息
    const playerMsg: ChatMessage = {
      id: genId(),
      role: "player",
      content: text,
      ts: Date.now(),
    };
    appendMessage(npc.id, playerMsg);

    // 呼叫 Agnes AI 引擎（自動 fallback 到規則引擎）
    try {
      const data = await callAgnes({
        npc,
        playerMessage: text,
        currentDefense: conv.defense,
        history: conv.messages.map((m) => ({
          role: m.role === "player" ? "player" : "npc",
          content: m.content,
        })),
      });

      // 更新防備值
      if (data.defenseDelta) {
        updateDefense(npc.id, data.defenseDelta);
      }

      // 模擬思考時間
      await new Promise((r) => setTimeout(r, 400 + Math.random() * 500));

      // append NPC 訊息
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
      console.error(e);
      const errMsg: ChatMessage = {
        id: genId(),
        role: "system",
        content: "⚠ 連線中斷，請稍後再試。",
        ts: Date.now(),
      };
      appendMessage(npc.id, errMsg);
    } finally {
      setThinking(false);
      inputRef.current?.focus();
    }
  };

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

      {/* 輸入區 */}
      {!isLocked && (
        <div className="px-3 py-2.5 border-t border-white/5 bg-zinc-900/80 flex items-end gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                sendMessage();
              }
            }}
            placeholder="輸入訊息..."
            rows={1}
            className="flex-1 max-h-24 resize-none bg-zinc-800 text-white text-sm rounded-2xl px-4 py-2.5 placeholder:text-white/30 focus:outline-none border border-white/5"
            style={{ minHeight: "40px" }}
          />
          <button
            onClick={sendMessage}
            disabled={!input.trim() || thinking}
            className="w-10 h-10 shrink-0 rounded-full bg-blue-600 text-white flex items-center justify-center hover:bg-blue-500 active:scale-95 transition disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="送出"
          >
            {thinking ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
      )}
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

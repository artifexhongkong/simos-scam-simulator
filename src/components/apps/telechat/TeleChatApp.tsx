"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, Search, UserX, AlertTriangle, CheckCircle2, Lock, ChevronUp, Trash2, X } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { NPCS, getAllNpcs, getNpcById } from "@/lib/game/npcs";
import { useShallow } from "zustand/react/shallow";
import { ChatWindow } from "./ChatWindow";

export function TeleChatApp({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"list" | "add" | "chat">("list");
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [longPressActive, setLongPressActive] = useState<string | null>(null);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { friendNpcIds, conversations, startConversation, addFriend, generatedNpcs, removeFriend } = useGameStore(
    useShallow((s) => ({
      friendNpcIds: s.friendNpcIds,
      conversations: s.conversations,
      startConversation: s.startConversation,
      addFriend: s.addFriend,
      generatedNpcs: s.generatedNpcs,
      removeFriend: s.removeFriend,
    })),
  );

  // 長按偵測
  const handleTouchStart = useCallback((npcId: string) => {
    longPressTimer.current = setTimeout(() => {
      setLongPressActive(npcId);
      // 震動回饋
      if (typeof navigator !== "undefined" && navigator.vibrate) {
        navigator.vibrate(30);
      }
    }, 500);
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const allNpcs = getAllNpcs(generatedNpcs);
  const friends = allNpcs.filter((n) => friendNpcIds.includes(n.id))
    .sort((a, b) => {
      // 排序規則：
      // 1. 已詐騙成功的排最後（不移除但降序）
      // 2. 已購買情報的（unlockedNpcIds）往上移
      const convA = conversations[a.id];
      const convB = conversations[b.id];
      const aSucceeded = convA?.status === "succeeded";
      const bSucceeded = convB?.status === "succeeded";
      if (aSucceeded && !bSucceeded) return 1;
      if (!aSucceeded && bSucceeded) return -1;
      // 都不是成功的，按最近對話時間排序
      const aTime = convA?.messages?.slice(-1)[0]?.ts ?? 0;
      const bTime = convB?.messages?.slice(-1)[0]?.ts ?? 0;
      return bTime - aTime;
    });

  const openChat = (npcId: string) => {
    setActiveNpcId(npcId);
    startConversation(npcId);
    setMode("chat");
  };

  if (mode === "chat" && activeNpcId) {
    const npc = getNpcById(activeNpcId, generatedNpcs);
    if (!npc) {
      setMode("list");
      return null;
    }
    return <ChatWindow npc={npc} onBack={() => setMode("list")} />;
  }

  if (mode === "add") {
    return (
      <AddFriendScreen
        onBack={() => setMode("list")}
        onSuccess={(npcId) => openChat(npcId)}
      />
    );
  }

  // iOS 風格列表頁
  return (
    <div
      className="h-full min-h-0 flex flex-col overflow-hidden"
      style={{ background: "var(--im-bg)" }}
    >
      {/* iOS 風格導航欄 */}
      <div
        className="flex items-center px-2 py-2 border-b backdrop-blur-xl shrink-0"
        style={{
          background: "var(--im-header-bg)",
          borderColor: "var(--im-header-border)",
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[17px] font-normal px-1 active:opacity-50 transition"
          style={{ color: "var(--im-link-text)" }}
        >
          <ChevronUp className="w-5 h-5 rotate-[-90deg]" />
          <span className="max-w-[60px] truncate">返回</span>
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold pr-12" style={{ color: "var(--im-header-text)" }}>
          TeleChat
        </h2>
      </div>

      {/* 標題列 + 新增好友按鈕 */}
      <div
        className="px-4 py-2 border-b flex items-center justify-between shrink-0"
        style={{
          background: "var(--im-header-bg)",
          borderColor: "var(--im-header-border)",
        }}
      >
        <h3 className="text-[15px] font-semibold" style={{ color: "var(--im-header-text)" }}>
          聊天
        </h3>
        <button
          onClick={() => setMode("add")}
          className="flex items-center gap-1 text-sm font-medium active:scale-95 transition"
          style={{ color: "var(--im-link-text)" }}
        >
          <UserPlus className="w-4 h-4" />
          新增好友
        </button>
      </div>

      {/* 好友列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-safe-bottom">
        {friends.length === 0 ? (
          <EmptyState onAdd={() => setMode("add")} />
        ) : (
          <ul style={{ background: "var(--im-bg)" }}>
            {friends.map((npc) => {
              const conv = conversations[npc.id];
              const lastMsg = conv?.messages[conv.messages.length - 1];
              const isSucceeded = conv?.status === "succeeded";
              const isBlocked = conv?.status === "blocked";
              const isCautious = conv?.status === "cautious";
              const showDelete = longPressActive === npc.id;
              return (
                <motion.li
                  key={npc.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ borderBottom: "1px solid var(--im-header-border)" }}
                >
                  <div
                    onClick={() => {
                      if (showDelete) {
                        setLongPressActive(null);
                      } else {
                        openChat(npc.id);
                      }
                    }}
                    onTouchStart={() => handleTouchStart(npc.id)}
                    onTouchEnd={handleTouchEnd}
                    onTouchMove={handleTouchEnd}
                    className="w-full px-4 py-3 flex items-center gap-3 transition text-left active:bg-black/5 cursor-pointer"
                    style={{
                      background: showDelete
                        ? "rgba(255,59,48,0.05)"
                        : "var(--im-bg)",
                    }}
                  >
                    <div
                      className="w-12 h-12 rounded-full flex items-center justify-center text-2xl shrink-0"
                      style={{ background: "var(--im-bubble-npc-bg)" }}
                    >
                      {npc.avatar}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4
                          className="text-sm font-medium truncate"
                          style={{ color: "var(--im-header-text)" }}
                        >
                          {npc.displayName}
                        </h4>
                        {lastMsg && (
                          <span
                            className="text-[10px] shrink-0"
                            style={{ color: "var(--im-bubble-system-text)" }}
                          >
                            {new Date(lastMsg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        {isSucceeded ? (
                          <span className="flex items-center gap-1 text-emerald-500 text-xs">
                            <CheckCircle2 className="w-3 h-3" /> 已轉帳 ${conv?.payout?.toLocaleString()}
                          </span>
                        ) : isBlocked ? (
                          <span className="flex items-center gap-1 text-red-500 text-xs">
                            <UserX className="w-3 h-3" /> 已封鎖
                          </span>
                        ) : isCautious ? (
                          <span className="flex items-center gap-1 text-amber-500 text-xs">
                            <AlertTriangle className="w-3 h-3" /> 已終止
                          </span>
                        ) : (
                          <p
                            className="text-xs truncate"
                            style={{ color: "var(--im-bubble-system-text)" }}
                          >
                            {lastMsg?.content ?? "開始對話"}
                          </p>
                        )}
                      </div>
                    </div>
                    {showDelete && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(npc.id);
                          setLongPressActive(null);
                        }}
                        className="shrink-0 p-2 rounded-full active:scale-90 transition"
                        style={{ background: "rgba(255,59,48,0.1)", color: "#ff3b30" }}
                        aria-label="刪除好友"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 刪除好友確認彈窗 */}
      <AnimatePresence>
        {deleteTarget && (
          <DeleteFriendConfirm
            npcName={(() => {
              const npc = allNpcs.find((n) => n.id === deleteTarget);
              return npc?.displayName ?? "好友";
            })()}
            onConfirm={() => {
              removeFriend(deleteTarget);
              setDeleteTarget(null);
            }}
            onCancel={() => setDeleteTarget(null)}
          />
        )}
      </AnimatePresence>

      {/* 底部提示 */}
      {friends.length > 0 && (
        <div
          className="px-4 py-2 border-t text-center shrink-0"
          style={{
            background: "var(--im-header-bg)",
            borderColor: "var(--im-header-border)",
          }}
        >
          <p className="text-[10px]" style={{ color: "var(--im-bubble-system-text)" }}>
            想認識更多目標？前往「情報販子」解鎖新對象
          </p>
        </div>
      )}
    </div>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-4 opacity-50">
        <UserPlus className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-base font-semibold mb-1" style={{ color: "var(--im-header-text)" }}>
        沒有任何好友
      </h3>
      <p className="text-xs mb-5" style={{ color: "var(--im-bubble-system-text)" }}>
        前往情報販子購買目標資料<br />取得 TeleChat ID 後即可加好友
      </p>
      <button
        onClick={onAdd}
        className="px-5 py-2.5 rounded-full bg-blue-600 text-white text-sm font-medium hover:bg-blue-500 active:scale-95 transition"
      >
        輸入 ID 加好友
      </button>
    </div>
  );
}

function AddFriendScreen({
  onBack,
  onSuccess,
}: {
  onBack: () => void;
  onSuccess: (npcId: string) => void;
}) {
  const [tid, setTid] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const addFriend = useGameStore((s) => s.addFriend);

  const submit = async () => {
    setError(null);
    setLoading(true);
    const currentTid = tid.trim();
    if (!currentTid) {
      setError("請輸入 TeleChat ID");
      setLoading(false);
      return;
    }
    const result = addFriend(currentTid);
    setLoading(false);
    if (result.ok && result.npcId) {
      onSuccess(result.npcId);
    } else {
      setError(result.error ?? "加入失敗");
    }
  };

  return (
    <div
      className="h-full min-h-0 flex flex-col overflow-hidden"
      style={{ background: "var(--im-bg)" }}
    >
      {/* iOS 風格導航欄 */}
      <div
        className="flex items-center px-2 py-2 border-b backdrop-blur-xl shrink-0"
        style={{
          background: "var(--im-header-bg)",
          borderColor: "var(--im-header-border)",
        }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[17px] font-normal px-1 active:opacity-50 transition"
          style={{ color: "var(--im-link-text)" }}
        >
          <ChevronUp className="w-5 h-5 rotate-[-90deg]" />
          <span className="max-w-[60px] truncate">返回</span>
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold pr-12" style={{ color: "var(--im-header-text)" }}>
          新增好友
        </h2>
      </div>

      <div className="flex-1 min-h-0 flex flex-col px-5 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <Search className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-base font-semibold" style={{ color: "var(--im-header-text)" }}>
              透過 ID 加入好友
            </h3>
            <p className="text-xs" style={{ color: "var(--im-bubble-system-text)" }}>
              輸入對方的 TeleChat ID
            </p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-xs font-medium" style={{ color: "var(--im-bubble-system-text)" }}>
            TeleChat ID
          </label>
          <input
            type="text"
            value={tid}
            onChange={(e) => setTid(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && tid && submit()}
            placeholder="例如：agnes_liew_88"
            className="w-full px-4 py-3 rounded-xl text-sm focus:outline-none focus:border-blue-500"
            style={{
              background: "var(--im-input-bg)",
              color: "var(--im-input-text)",
              border: "1px solid var(--im-input-border)",
            }}
            autoFocus
          />
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-500 text-xs bg-red-500/10 px-3 py-2 rounded-lg">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
            {error}
          </div>
        )}

        <div className="mt-auto">
          <button
            onClick={submit}
            disabled={!tid || loading}
            className="w-full py-3 rounded-xl bg-blue-600 text-white font-semibold text-sm hover:bg-blue-500 active:scale-95 transition disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "搜尋中..." : "加入好友"}
          </button>

          <div
            className="mt-4 flex items-start gap-2 text-[10px] leading-relaxed"
            style={{ color: "var(--im-bubble-system-text)" }}
          >
            <Lock className="w-3 h-3 mt-0.5 shrink-0" />
            <p>
              提示：你只能加入已向情報販子購買資料的目標。<br />
              若不知道 ID，請先至情報販子 App 解鎖情報。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// 刪除好友確認彈窗
function DeleteFriendConfirm({
  npcName,
  onConfirm,
  onCancel,
}: {
  npcName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onCancel}
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
          <Trash2 className="w-5 h-5 text-red-500" />
          <h3 className="text-base font-bold" style={{ color: "var(--im-header-text)" }}>刪除好友？</h3>
        </div>
        <p className="text-xs leading-relaxed mb-4" style={{ color: "var(--im-bubble-system-text)" }}>
          確定要刪除 {npcName} 嗎？所有對話記錄將被清除，且無法恢復。
        </p>
        <div className="flex gap-2">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-xs font-medium active:scale-95 transition"
            style={{ background: "var(--im-bubble-npc-bg)", color: "var(--im-bubble-npc-text)" }}
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg bg-red-500 text-white text-xs font-semibold hover:bg-red-600 active:scale-95 transition"
          >
            確認刪除
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

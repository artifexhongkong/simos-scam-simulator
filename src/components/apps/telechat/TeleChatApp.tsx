"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { UserPlus, ArrowLeft, Send, Search, UserX, AlertTriangle, CheckCircle2, Lock } from "lucide-react";
import { AppContainer } from "@/components/simos/Shell";
import { useGameStore, type ChatMessage } from "@/lib/game/store";
import { NPCS, getNpcById, type NpcProfile } from "@/lib/game/npcs";
import { useShallow } from "zustand/react/shallow";
import { ChatWindow } from "./ChatWindow";

export function TeleChatApp({ onBack }: { onBack: () => void }) {
  const [mode, setMode] = useState<"list" | "add" | "chat">("list");
  const [activeNpcId, setActiveNpcId] = useState<string | null>(null);

  const { friendNpcIds, conversations, startConversation, addFriend } = useGameStore(
    useShallow((s) => ({
      friendNpcIds: s.friendNpcIds,
      conversations: s.conversations,
      startConversation: s.startConversation,
      addFriend: s.addFriend,
    })),
  );

  const friends = NPCS.filter((n) => friendNpcIds.includes(n.id));

  const openChat = (npcId: string) => {
    setActiveNpcId(npcId);
    startConversation(npcId);
    setMode("chat");
  };

  if (mode === "chat" && activeNpcId) {
    const npc = getNpcById(activeNpcId);
    if (!npc) {
      setMode("list");
      return null;
    }
    // ChatWindow 自帶 iOS iMessage 頂部欄（頭像+姓名+返回），不需再用 AppContainer 包裹
    // 否則會造成雙重頂部欄
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

  return (
    <AppContainer title="TeleChat" onBack={onBack} headerColor="bg-blue-900/40">
      <div className="h-full min-h-0 flex flex-col">
        {/* 標題列 */}
        <div className="px-4 py-3 border-b border-white/5 bg-zinc-900/50 flex items-center justify-between">
          <h3 className="text-white text-base font-semibold">聊天</h3>
          <button
            onClick={() => setMode("add")}
            className="flex items-center gap-1 text-blue-400 text-sm font-medium hover:text-blue-300 active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            新增好友
          </button>
        </div>

        {/* 好友列表 */}
        <div className="flex-1 overflow-y-auto">
          {friends.length === 0 ? (
            <EmptyState onAdd={() => setMode("add")} />
          ) : (
            <ul className="divide-y divide-white/5">
              {friends.map((npc) => {
                const conv = conversations[npc.id];
                const lastMsg = conv?.messages[conv.messages.length - 1];
                const isSucceeded = conv?.status === "succeeded";
                const isBlocked = conv?.status === "blocked";
                return (
                  <motion.li
                    key={npc.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <button
                      onClick={() => openChat(npc.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/5 transition text-left"
                    >
                      <div className="w-12 h-12 rounded-full bg-zinc-700 flex items-center justify-center text-2xl shrink-0">
                        {npc.avatar}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <h4 className="text-white text-sm font-medium truncate">{npc.displayName}</h4>
                          {lastMsg && (
                            <span className="text-white/40 text-[10px] shrink-0">
                              {new Date(lastMsg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {isSucceeded ? (
                            <span className="flex items-center gap-1 text-emerald-400 text-xs">
                              <CheckCircle2 className="w-3 h-3" /> 已轉帳 ${conv?.payout?.toLocaleString()}
                            </span>
                          ) : isBlocked ? (
                            <span className="flex items-center gap-1 text-red-400 text-xs">
                              <UserX className="w-3 h-3" /> 已封鎖
                            </span>
                          ) : (
                            <p className="text-white/50 text-xs truncate">
                              {lastMsg?.content ?? "開始對話"}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  </motion.li>
                );
              })}
            </ul>
          )}
        </div>

        {/* 底部提示 */}
        {friends.length > 0 && (
          <div className="px-4 py-2 bg-zinc-900/50 border-t border-white/5 text-center">
            <p className="text-white/40 text-[10px]">
              想認識更多目標？前往「情報販子」解鎖新對象
            </p>
          </div>
        )}
      </div>
    </AppContainer>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="h-full flex flex-col items-center justify-center px-8 text-center">
      <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center mb-4 opacity-50">
        <UserPlus className="w-10 h-10 text-white" />
      </div>
      <h3 className="text-white text-base font-semibold mb-1">沒有任何好友</h3>
      <p className="text-white/50 text-xs mb-5">
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
    <AppContainer title="新增好友" onBack={onBack} headerColor="bg-blue-900/40">
      <div className="h-full flex flex-col px-5 py-6">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-14 h-14 rounded-full bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center">
            <Search className="w-7 h-7 text-white" />
          </div>
          <div>
            <h3 className="text-white text-base font-semibold">透過 ID 加入好友</h3>
            <p className="text-white/50 text-xs">輸入對方的 TeleChat ID</p>
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-white/60 text-xs font-medium">TeleChat ID</label>
          <input
            type="text"
            value={tid}
            onChange={(e) => setTid(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !loading && tid && submit()}
            placeholder="例如：agnes_liew_88"
            className="w-full px-4 py-3 rounded-xl bg-zinc-800 border border-white/10 text-white placeholder:text-white/30 focus:outline-none focus:border-blue-500 text-sm"
            autoFocus
          />
        </div>

        {error && (
          <div className="mt-3 flex items-center gap-2 text-red-400 text-xs bg-red-500/10 px-3 py-2 rounded-lg">
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

          <div className="mt-4 flex items-start gap-2 text-white/40 text-[10px] leading-relaxed">
            <Lock className="w-3 h-3 mt-0.5 shrink-0" />
            <p>
              提示：你只能加入已向情報販子購買資料的目標。<br />
              若不知道 ID，請先至情報販子 App 解鎖情報。
            </p>
          </div>
        </div>
      </div>
    </AppContainer>
  );
}

"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, Sparkles, CheckCircle2, Eye, Skull, Fingerprint, Copy, Check } from "lucide-react";
import { AppContainer } from "@/components/simos/Shell";
import { useGameStore } from "@/lib/game/store";
import { NPCS, type NpcProfile } from "@/lib/game/npcs";

export function InfoBrokerApp({ onBack }: { onBack: () => void }) {
  const intelPoints = useGameStore((s) => s.intelPoints);
  const unlockedNpcIds = useGameStore((s) => s.unlockedNpcIds);
  const purchaseIntel = useGameStore((s) => s.purchaseIntel);

  const [activeNpc, setActiveNpc] = useState<NpcProfile | null>(null);
  const [purchasing, setPurchasing] = useState(false);

  const handleBuy = (npc: NpcProfile) => {
    setPurchasing(true);
    setTimeout(() => {
      const ok = purchaseIntel(npc.id);
      setPurchasing(false);
      if (ok) {
        // 顯示情報詳情
        setActiveNpc(npc);
      }
    }, 600);
  };

  return (
    <AppContainer title="情報販子" onBack={onBack} headerColor="bg-zinc-900">
      <div className="h-full min-h-0 flex flex-col">
        {/* 情報點數 banner */}
        <div className="px-4 py-3 bg-gradient-to-r from-emerald-900/40 to-zinc-900 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-full bg-emerald-500/20 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <p className="text-white/50 text-[10px]">情報點數</p>
              <p className="text-emerald-300 text-base font-bold leading-tight">{intelPoints}</p>
            </div>
          </div>
          <p className="text-white/40 text-[10px] text-right max-w-[140px] leading-tight">
            解鎖更多目標情報<br />每人只能騙一次
          </p>
        </div>

        {/* 目標列表 */}
        <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scroll-safe-bottom">
          <p className="text-white/40 text-xs px-1">可購買的情報（隨機供應）</p>
          {NPCS.map((npc) => {
            const unlocked = unlockedNpcIds.includes(npc.id);
            const canAfford = intelPoints >= npc.price;
            return (
              <TargetCard
                key={npc.id}
                npc={npc}
                unlocked={unlocked}
                canAfford={canAfford}
                purchasing={purchasing}
                onBuy={() => handleBuy(npc)}
                onView={() => setActiveNpc(npc)}
              />
            );
          })}
        </div>
      </div>

      {/* 情報詳情彈窗 */}
      <AnimatePresence>
        {activeNpc && (
          <IntelDetailModal
            npc={activeNpc}
            onClose={() => setActiveNpc(null)}
          />
        )}
      </AnimatePresence>
    </AppContainer>
  );
}

function TargetCard({
  npc,
  unlocked,
  canAfford,
  purchasing,
  onBuy,
  onView,
}: {
  npc: NpcProfile;
  unlocked: boolean;
  canAfford: boolean;
  purchasing: boolean;
  onBuy: () => void;
  onView: () => void;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl bg-zinc-800/70 border border-white/5 overflow-hidden"
    >
      <div className="p-3.5 flex items-center gap-3">
        {/* 頭像（未解鎖前是問號） */}
        <div className="w-14 h-14 rounded-2xl bg-zinc-700 flex items-center justify-center text-3xl shrink-0 relative">
          {unlocked ? (
            npc.avatar
          ) : (
            <>
              <Fingerprint className="w-7 h-7 text-white/40" />
              <div className="absolute inset-0 rounded-2xl bg-black/60 backdrop-blur-[3px] flex items-center justify-center">
                <Lock className="w-5 h-5 text-white/60" />
              </div>
            </>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h4 className="text-white text-sm font-semibold">
              {unlocked ? npc.displayName : "未知目標"}
            </h4>
            {unlocked && (
              <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-medium flex items-center gap-1">
                <CheckCircle2 className="w-2.5 h-2.5" /> 已解鎖
              </span>
            )}
          </div>
          {unlocked ? (
            <p className="text-white/50 text-xs mt-0.5 line-clamp-1">{npc.background}</p>
          ) : (
            <p className="text-white/40 text-xs mt-0.5">
              特質：{npc.hookTags.slice(0, 2).join("・")}
            </p>
          )}
          <p className="text-amber-400/70 text-[10px] mt-1 font-medium">
            ⚠ 嚴禁顯示難度評級，請自行評估
          </p>
        </div>
      </div>

      <div className="px-3.5 pb-3 flex gap-2">
        {unlocked ? (
          <button
            onClick={onView}
            className="flex-1 py-2 rounded-xl bg-zinc-700 text-white text-xs font-medium hover:bg-zinc-600 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <Eye className="w-3.5 h-3.5" /> 查看情報
          </button>
        ) : (
          <button
            onClick={onBuy}
            disabled={!canAfford || purchasing}
            className={`flex-1 py-2 rounded-xl text-xs font-medium transition flex items-center justify-center gap-1.5 ${
              canAfford
                ? "bg-emerald-600 text-white hover:bg-emerald-500 active:scale-95"
                : "bg-zinc-700 text-white/30 cursor-not-allowed"
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            {purchasing ? "解鎖中..." : `解鎖情報 (${npc.price} 點)`}
          </button>
        )}
      </div>
    </motion.div>
  );
}

function IntelDetailModal({ npc, onClose }: { npc: NpcProfile; onClose: () => void }) {
  const [copied, setCopied] = useState(false);

  const copyId = async () => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(npc.telechatId);
      } else {
        // Fallback for older browsers / non-secure context (Capacitor)
        const ta = document.createElement("textarea");
        ta.value = npc.telechatId;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.focus();
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch (e) {
      console.error("copy failed", e);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-3"
    >
      <motion.div
        initial={{ y: 50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 50, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full bg-zinc-900 rounded-3xl border border-white/10 overflow-hidden max-h-[85%] flex flex-col"
      >
        {/* Header */}
        <div className="p-5 bg-gradient-to-br from-zinc-800 to-zinc-900 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-zinc-700 flex items-center justify-center text-4xl">
              {npc.avatar}
            </div>
            <div>
              <h3 className="text-white text-lg font-bold">{npc.displayName}</h3>
              <p className="text-white/50 text-xs">年齡 {npc.age} 歲</p>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* ID with copy button */}
          <div className="rounded-xl bg-black/40 border border-white/5 p-3">
            <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-1.5">TeleChat ID（用於加好友）</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-emerald-300 text-sm font-mono break-all flex-1">{npc.telechatId}</code>
              <button
                onClick={copyId}
                className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 flex items-center gap-1.5 ${
                  copied
                    ? "bg-emerald-500 text-white"
                    : "bg-zinc-700 text-white hover:bg-zinc-600"
                }`}
                aria-label="複製 ID"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5" /> 已複製
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" /> 複製
                  </>
                )}
              </button>
            </div>
          </div>

          {/* 背景故事 */}
          <div>
            <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-2">背景調查</p>
            <p className="text-white/80 text-sm leading-relaxed">{npc.background}</p>
          </div>

          {/* 可利用特質 */}
          <div>
            <p className="text-white/40 text-[10px] font-medium uppercase tracking-wide mb-2">可利用特質</p>
            <div className="flex flex-wrap gap-1.5">
              {npc.hookTags.map((tag) => (
                <span
                  key={tag}
                  className="px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>

          {/* 警告 */}
          <div className="rounded-xl bg-red-500/5 border border-red-500/20 p-3 flex items-start gap-2">
            <Skull className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
            <p className="text-red-300/80 text-[11px] leading-relaxed">
              本情報不提供任何防備評估。你必須透過對話自行試探對方底線，說錯一句話可能立刻被拉黑。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5">
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl bg-white text-black text-sm font-semibold hover:bg-white/90 active:scale-95 transition"
          >
            知道了，去 TeleChat 加好友
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

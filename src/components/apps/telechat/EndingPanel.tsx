"use client";

import { motion } from "framer-motion";
import { Trophy, UserX, AlertCircle, RotateCcw, Download, X, CheckCircle2 } from "lucide-react";
import type { NpcProfile } from "@/lib/game/npcs";
import type { ConversationState } from "@/lib/game/store";

interface EndingPanelProps {
  npc: NpcProfile;
  conv: ConversationState;
  onClose: () => void;
  onReset: () => void;
}

export function EndingPanel({ npc, conv, onClose, onReset }: EndingPanelProps) {
  const isSuccess = conv.status === "succeeded";
  const isBlocked = conv.status === "blocked";
  const isCautious = conv.status === "cautious";

  // 計算最終信任度（0-100）
  const finalTrust = Math.max(0, Math.min(100, 100 - conv.defense));

  // 詐騙套路漏洞分析
  const flaws: string[] = [];
  if (conv.consecutiveUrgent >= 2) flaws.push("連續使用催逼話術，引起市民警覺");
  if (conv.consecutiveMoney >= 2) flaws.push("頻繁要求轉帳，缺乏鋪墊");
  if (conv.turns < 3 && !isSuccess) flaws.push("對話太短，未建立信任基礎");
  if (conv.turns >= 15) flaws.push("對話拖太長，市民耐心耗盡");
  if (finalTrust < 30) flaws.push("市民對你信任度過低，話術不夠有說服力");

  if (flaws.length === 0 && !isSuccess) {
    flaws.push("話術可再加強，多利用市民背景中的特質建立共鳴");
  }

  // 詐騙成功要點
  const successes: string[] = [];
  if (isSuccess) {
    successes.push("成功建立市民信任，使其願意配合轉帳");
    if (conv.turns <= 6) successes.push("對話節奏掌握得宜，未拖太長");
    if (conv.consecutiveUrgent <= 1) successes.push("未過度催逼，避免引起警覺");
    successes.push(`最終信任度 ${finalTrust}/100，達成詐騙條件`);
  }

  const icon = isSuccess ? <Trophy /> : isBlocked ? <UserX /> : <AlertCircle />;
  const title = isSuccess ? "詐騙成功" : isBlocked ? "詐騙失敗・被封鎖" : "對話終止・市民警覺";
  const titleColor = isSuccess ? "text-amber-400" : isBlocked ? "text-red-400" : "text-orange-400";
  const bgGradient = isSuccess
    ? "from-amber-500/20 to-yellow-700/20"
    : isBlocked
      ? "from-red-500/20 to-red-900/20"
      : "from-orange-500/20 to-orange-900/20";

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
        className={`w-full bg-gradient-to-b ${bgGradient} rounded-3xl border border-white/10 overflow-hidden max-h-[90%] flex flex-col`}
        style={{ background: "var(--im-input-bg)" }}
      >
        {/* Header */}
        <div className="p-5 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${titleColor}`} style={{ background: "var(--im-bubble-npc-bg)" }}>
              {icon}
            </div>
            <div>
              <h3 className={`text-base font-bold ${titleColor}`} style={{ color: "var(--im-header-text)" }}>
                {title}
              </h3>
              <p className="text-[11px]" style={{ color: "var(--im-bubble-system-text)" }}>
                {npc.displayName} · {conv.turns} 輪對話
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full active:scale-95"
            style={{ color: "var(--im-bubble-system-text)" }}
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto" style={{ color: "var(--im-header-text)" }}>
          {/* 結局原因 */}
          {conv.endingReason && (
            <div className="rounded-xl p-3" style={{ background: "var(--im-bubble-npc-bg)" }}>
              <p className="text-[10px] font-medium mb-1" style={{ color: "var(--im-bubble-system-text)" }}>
                結局分析
              </p>
              <p className="text-[13px] leading-relaxed" style={{ color: "var(--im-bubble-npc-text)" }}>
                {conv.endingReason}
              </p>
            </div>
          )}

          {/* 統計數據 */}
          <div className="grid grid-cols-3 gap-2">
            <Stat
              label="詐騙金額"
              value={conv.payout ? `$${conv.payout.toLocaleString()}` : "$0"}
              color="text-amber-400"
            />
            <Stat label="最終信任度" value={`${finalTrust}/100`} color={finalTrust >= 60 ? "text-emerald-400" : finalTrust >= 30 ? "text-orange-400" : "text-red-400"} />
            <Stat label="對話輪數" value={`${conv.turns}`} color="text-blue-400" />
          </div>

          {/* 信任度條 */}
          <div>
            <div className="flex items-center justify-between text-[11px] mb-1.5" style={{ color: "var(--im-bubble-system-text)" }}>
              <span>市民對你的信任度</span>
              <span>{finalTrust}%</span>
            </div>
            <div className="h-2 rounded-full overflow-hidden" style={{ background: "var(--im-bubble-npc-bg)" }}>
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${finalTrust}%` }}
                transition={{ duration: 0.8 }}
                className={`h-full rounded-full ${finalTrust >= 70 ? "bg-emerald-500" : finalTrust >= 40 ? "bg-amber-500" : "bg-red-500"}`}
              />
            </div>
          </div>

          {/* 成功要點 */}
          {successes.length > 0 && (
            <div className="rounded-xl p-3 bg-emerald-500/10 border border-emerald-500/20">
              <p className="text-[11px] font-semibold mb-1.5 text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" /> 做得好的地方
              </p>
              <ul className="space-y-1">
                {successes.map((s, i) => (
                  <li key={i} className="text-[11px] text-emerald-300/80 leading-relaxed flex items-start gap-1.5">
                    <span className="text-emerald-400 mt-0.5">•</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 漏洞分析 */}
          {flaws.length > 0 && (
            <div className="rounded-xl p-3 bg-red-500/10 border border-red-500/20">
              <p className="text-[11px] font-semibold mb-1.5 text-red-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> 詐騙套路漏洞分析
              </p>
              <ul className="space-y-1">
                {flaws.map((f, i) => (
                  <li key={i} className="text-[11px] text-red-300/80 leading-relaxed flex items-start gap-1.5">
                    <span className="text-red-400 mt-0.5">•</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 反詐教育 */}
          <div className="rounded-xl p-3" style={{ background: "var(--im-bubble-npc-bg)" }}>
            <p className="text-[10px] font-medium mb-1.5" style={{ color: "var(--im-bubble-system-text)" }}>
              🛡️ 防詐小提示
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: "var(--im-bubble-npc-text)" }}>
              現實中，市民遇到陌生人主動聯繫要求轉帳、提供 OTP、繳保證金時，
              應立即掛斷並撥打 165 反詐騙專線查證。任何要求先匯款才能領獎、解除帳戶的都是詐騙。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/5 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition flex items-center justify-center gap-1.5"
            style={{ background: "var(--im-bubble-npc-bg)", color: "var(--im-bubble-npc-text)" }}
          >
            關閉
          </button>
          <button
            onClick={onReset}
            className="flex-1 py-2.5 rounded-xl bg-blue-500 text-white text-sm font-semibold hover:bg-blue-600 active:scale-95 transition flex items-center justify-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> 再騙一次
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-xl p-2.5 text-center" style={{ background: "var(--im-bubble-npc-bg)" }}>
      <p className="text-[9px] mb-0.5" style={{ color: "var(--im-bubble-system-text)" }}>
        {label}
      </p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

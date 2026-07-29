"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award, ChevronUp } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { RIVAL_SCAMMERS, getTitle, type RivalScammer } from "@/lib/game/npcs";

export function LeaderboardApp({ onBack }: { onBack: () => void }) {
  const scamScore = useGameStore((s) => s.scamScore);
  const alias = useGameStore((s) => s.alias);
  const [rivals, setRivals] = useState<RivalScammer[]>(RIVAL_SCAMMERS);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/leaderboard");
      if (resp.ok) {
        const data = await resp.json();
        setRivals(data.rivals);
      }
    } catch {
      // 用本地資料就好
    } finally {
      setTimeout(() => setLoading(false), 300);
    }
  };

  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 30000);
    return () => clearInterval(id);
  }, []);

  const title = getTitle(scamScore);
  const playerEntry: RivalScammer = {
    rank: 0,
    alias: `${alias} (你)`,
    country: "Unknown",
    flag: "🎮",
    totalScam: scamScore,
    trend: "up",
  };

  const allEntries = [...rivals, playerEntry].sort((a, b) => b.totalScam - a.totalScam);
  const playerRank = allEntries.findIndex((e) => e === playerEntry) + 1;

  const headerText = "var(--im-header-text)";
  const subText = "var(--im-bubble-system-text)";
  const cardBg = "var(--im-bubble-npc-bg)";
  const cardBorder = "var(--im-header-border)";
  const inputBg = "var(--im-input-bg)";

  return (
    <div
      className="h-full min-h-0 flex flex-col overflow-hidden"
      style={{ background: "var(--im-bg)" }}
    >
      {/* iOS 風格導航欄 */}
      <div
        className="flex items-center px-2 py-2 border-b backdrop-blur-xl shrink-0"
        style={{ background: "var(--im-header-bg)", borderColor: cardBorder }}
      >
        <button
          onClick={onBack}
          className="flex items-center gap-1 text-[17px] font-normal px-1 active:opacity-50 transition"
          style={{ color: "var(--im-link-text)" }}
        >
          <ChevronUp className="w-5 h-5 rotate-[-90deg]" />
          <span className="max-w-[60px] truncate">返回</span>
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold pr-12" style={{ color: headerText }}>
          業績排行榜
        </h2>
      </div>

      {/* 玩家排名卡片 */}
      <div className="p-4 shrink-0" style={{ borderBottom: `1px solid ${cardBorder}` }}>
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-4"
          style={{ background: "linear-gradient(135deg, rgba(255, 149, 0, 0.12), rgba(255, 204, 0, 0.08))", border: "1px solid rgba(255, 149, 0, 0.25)" }}
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-wide" style={{ color: subText }}>
                你的當前排名
              </p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold" style={{ color: "#ff9500" }}>#{playerRank}</span>
                <span className="text-sm font-medium" style={{ color: subText }}>/ {allEntries.length}</span>
              </div>
            </div>
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg">
              <Trophy className="w-7 h-7 text-white" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 mt-3">
            <div className="rounded-xl p-2.5" style={{ background: inputBg }}>
              <p className="text-[10px]" style={{ color: subText }}>總積分</p>
              <p className="text-base font-bold" style={{ color: "#34c759" }}>${scamScore.toLocaleString()}</p>
            </div>
            <div className="rounded-xl p-2.5" style={{ background: inputBg }}>
              <p className="text-[10px]" style={{ color: subText }}>當前頭銜</p>
              <p className="text-base font-bold" style={{ color: "#ff9500" }}>{title.title}</p>
            </div>
          </div>

          {title.next && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-[10px] mb-1">
                <span style={{ color: subText }}>距離「{title.next}」</span>
                <span style={{ color: "#ff9500" }}>還差 ${title.toNext?.toLocaleString()}</span>
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ background: inputBg }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.max(5, Math.min(100, (scamScore / (scamScore + (title.toNext ?? 0))) * 100))}%` }}
                  className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                />
              </div>
            </div>
          )}
        </motion.div>
      </div>

      {/* 榜單 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        <div
          className="px-4 py-2 flex items-center justify-between sticky top-0 backdrop-blur-sm z-10 shrink-0"
          style={{ background: "var(--im-header-bg)", borderBottom: `1px solid ${cardBorder}` }}
        >
          <p className="text-xs font-medium" style={{ color: subText }}>全球虛擬黑市榜</p>
          <button
            onClick={refresh}
            disabled={loading}
            className="text-[11px] font-medium active:scale-95 disabled:opacity-50"
            style={{ color: "#ff9500" }}
          >
            {loading ? "更新中..." : "↻ 重新整理"}
          </button>
        </div>

        <ul>
          {allEntries.map((entry, idx) => {
            const rank = idx + 1;
            const isPlayer = entry === playerEntry;
            return (
              <motion.li
                key={`${entry.alias}-${idx}`}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: idx * 0.03 }}
                className="px-4 py-2.5 flex items-center gap-3"
                style={{
                  borderBottom: `1px solid ${cardBorder}`,
                  background: isPlayer ? "rgba(255, 149, 0, 0.08)" : "transparent",
                  borderLeft: isPlayer ? "3px solid #ff9500" : "3px solid transparent",
                }}
              >
                <div className="w-7 text-center">
                  {rank === 1 ? (
                    <Crown className="w-5 h-5 mx-auto" style={{ color: "#ff9500" }} />
                  ) : rank === 2 ? (
                    <Medal className="w-5 h-5 mx-auto" style={{ color: "#8e8e93" }} />
                  ) : rank === 3 ? (
                    <Award className="w-5 h-5 mx-auto" style={{ color: "#a2845e" }} />
                  ) : (
                    <span className="text-sm font-medium" style={{ color: subText }}>{rank}</span>
                  )}
                </div>

                <div className="text-2xl">{entry.flag}</div>

                <div className="flex-1 min-w-0">
                  <p
                    className="text-sm font-medium truncate"
                    style={{ color: isPlayer ? "#ff9500" : headerText }}
                  >
                    {entry.alias}
                  </p>
                  <p className="text-[10px]" style={{ color: subText }}>{entry.country}</p>
                </div>

                <div className="text-right">
                  <p
                    className="text-sm font-bold"
                    style={{ color: isPlayer ? "#ff9500" : headerText }}
                  >
                    ${entry.totalScam.toLocaleString()}
                  </p>
                  <div className="flex items-center justify-end gap-0.5">
                    {entry.trend === "up" && <TrendingUp className="w-3 h-3" style={{ color: "#34c759" }} />}
                    {entry.trend === "down" && <TrendingDown className="w-3 h-3" style={{ color: "#ff3b30" }} />}
                    {entry.trend === "stable" && <Minus className="w-3 h-3" style={{ color: subText }} />}
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>

        <p className="text-[10px] text-center py-3" style={{ color: subText }}>
          每 30 秒自動更新榜單
        </p>
      </div>
    </div>
  );
}

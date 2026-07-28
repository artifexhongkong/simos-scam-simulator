"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Trophy, TrendingUp, TrendingDown, Minus, Crown, Medal, Award } from "lucide-react";
import { AppContainer } from "@/components/simos/Shell";
import { useGameStore } from "@/lib/game/store";
import { RIVAL_SCAMMERS, getTitle, type RivalScammer } from "@/lib/game/npcs";

export function LeaderboardApp({ onBack }: { onBack: () => void }) {
  const scamScore = useGameStore((s) => s.scamScore);
  const alias = useGameStore((s) => s.alias);
  const [rivals, setRivals] = useState<RivalScammer[]>(RIVAL_SCAMMERS);
  const [loading, setLoading] = useState(false);

  // 拉取即時榜單
  const refresh = async () => {
    setLoading(true);
    try {
      const resp = await fetch("/api/leaderboard");
      if (resp.ok) {
        const data = await resp.json();
        setRivals(data.rivals);
      }
    } catch (e) {
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

  // 把玩家插入榜單
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

  return (
    <AppContainer title="業績排行榜" onBack={onBack} headerColor="bg-amber-900/40">
      <div className="h-full flex flex-col">
        {/* 玩家卡片 */}
        <div className="p-4 bg-gradient-to-br from-amber-900/30 via-zinc-900 to-black border-b border-amber-500/10">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl bg-gradient-to-br from-amber-500/20 to-yellow-700/20 border border-amber-500/30 p-4"
          >
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-amber-300/70 text-[10px] uppercase tracking-wide">你的當前排名</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-white text-3xl font-bold">#{playerRank}</span>
                  <span className="text-amber-400 text-sm font-medium">/ {allEntries.length}</span>
                </div>
              </div>
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 mt-3">
              <div className="rounded-xl bg-black/40 p-2.5">
                <p className="text-white/50 text-[10px]">總積分</p>
                <p className="text-emerald-300 text-base font-bold">${scamScore.toLocaleString()}</p>
              </div>
              <div className="rounded-xl bg-black/40 p-2.5">
                <p className="text-white/50 text-[10px]">當前頭銜</p>
                <p className="text-amber-300 text-base font-bold">{title.title}</p>
              </div>
            </div>

            {title.next && (
              <div className="mt-3">
                <div className="flex items-center justify-between text-[10px] mb-1">
                  <span className="text-white/50">距離「{title.next}」</span>
                  <span className="text-amber-300/80">還差 ${title.toNext?.toLocaleString()}</span>
                </div>
                <div className="h-1.5 bg-black/50 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.max(5, 100 - (title.toNext ?? 0) / scamScore / 100)}%` }}
                    className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full"
                  />
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* 榜單 */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 flex items-center justify-between sticky top-0 bg-zinc-900/95 backdrop-blur-sm z-10 border-b border-white/5">
            <p className="text-white/50 text-xs font-medium">全球虛擬黑市榜</p>
            <button
              onClick={refresh}
              disabled={loading}
              className="text-amber-300 text-[11px] font-medium hover:text-amber-200 active:scale-95 disabled:opacity-50"
            >
              {loading ? "更新中..." : "↻ 重新整理"}
            </button>
          </div>

          <ul className="divide-y divide-white/5">
            {allEntries.map((entry, idx) => {
              const rank = idx + 1;
              const isPlayer = entry === playerEntry;
              return (
                <motion.li
                  key={`${entry.alias}-${idx}`}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  className={`px-4 py-2.5 flex items-center gap-3 ${
                    isPlayer ? "bg-amber-500/10 border-l-2 border-amber-500" : ""
                  }`}
                >
                  <div className="w-7 text-center">
                    {rank === 1 ? (
                      <Crown className="w-5 h-5 text-amber-400 mx-auto" />
                    ) : rank === 2 ? (
                      <Medal className="w-5 h-5 text-zinc-300 mx-auto" />
                    ) : rank === 3 ? (
                      <Award className="w-5 h-5 text-amber-700 mx-auto" />
                    ) : (
                      <span className="text-white/50 text-sm font-medium">{rank}</span>
                    )}
                  </div>

                  <div className="text-2xl">{entry.flag}</div>

                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${isPlayer ? "text-amber-300" : "text-white"}`}>
                      {entry.alias}
                    </p>
                    <p className="text-white/40 text-[10px]">{entry.country}</p>
                  </div>

                  <div className="text-right">
                    <p className={`text-sm font-bold ${isPlayer ? "text-amber-300" : "text-white/80"}`}>
                      ${entry.totalScam.toLocaleString()}
                    </p>
                    <div className="flex items-center justify-end gap-0.5">
                      {entry.trend === "up" && <TrendingUp className="w-3 h-3 text-emerald-400" />}
                      {entry.trend === "down" && <TrendingDown className="w-3 h-3 text-red-400" />}
                      {entry.trend === "stable" && <Minus className="w-3 h-3 text-white/40" />}
                    </div>
                  </div>
                </motion.li>
              );
            })}
          </ul>

          <p className="text-white/30 text-[10px] text-center py-3">
            每 30 秒自動更新榜單
          </p>
        </div>
      </div>
    </AppContainer>
  );
}

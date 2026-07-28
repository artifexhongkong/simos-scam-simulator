"use client";

import { motion } from "framer-motion";
import { MessageCircle, Skull, Trophy, Sparkles, Settings as SettingsIcon } from "lucide-react";
import type { AppName } from "./SimOS";
import { useGameStore } from "@/lib/game/store";

interface HomeScreenProps {
  onOpenApp: (app: AppName) => void;
  intelPoints: number;
  scamScore: number;
}

interface AppTile {
  key: AppName;
  label: string;
  description: string;
  icon: React.ReactNode;
  bg: string;
  badge?: number;
}

export function HomeScreen({ onOpenApp, intelPoints, scamScore }: HomeScreenProps) {
  const conversations = useGameStore((s) => s.conversations);
  const alias = useGameStore((s) => s.alias);
  const playerAvatar = useGameStore((s) => s.playerAvatar);

  // 計算進行中的對話數
  const activeConvCount = Object.values(conversations).filter((c) => c.status === "active").length;

  const apps: AppTile[] = [
    {
      key: "telechat",
      label: "TeleChat",
      description: "通訊軟體",
      icon: <MessageCircle className="w-7 h-7 text-white" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-sky-500 to-blue-600",
      badge: activeConvCount > 0 ? activeConvCount : undefined,
    },
    {
      key: "broker",
      label: "情報販子",
      description: "黑市情報",
      icon: <Skull className="w-7 h-7 text-white" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-zinc-700 to-zinc-900",
    },
    {
      key: "leaderboard",
      label: "業績排行榜",
      description: "即時排名",
      icon: <Trophy className="w-7 h-7 text-white" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-amber-500 to-yellow-700",
    },
    {
      key: "settings",
      label: "設定",
      description: "玩家選項",
      icon: <SettingsIcon className="w-7 h-7 text-white" strokeWidth={2.2} />,
      bg: "bg-gradient-to-br from-slate-600 to-slate-800",
    },
  ];

  return (
    <div className="h-full flex flex-col px-6 pt-6 pb-8 overflow-y-auto">
      {/* 上方玩家資訊 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-zinc-700 to-zinc-900 border border-white/10 flex items-center justify-center text-2xl">
              {playerAvatar}
            </div>
            <div>
              <p className="text-white/50 text-[10px]">詐騙犯代號</p>
              <h1 className="text-white text-base font-bold tracking-tight leading-tight">{alias}</h1>
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              <span className="text-emerald-300 text-xs font-semibold">{intelPoints} 情報點</span>
            </div>
            <div className="text-amber-400/90 text-[10px] font-medium">
              詐騙積分 ${scamScore.toLocaleString()}
            </div>
          </div>
        </div>
      </motion.div>

      {/* App 圖示網格 - 4 個 app 用 2x2 */}
      <div className="grid grid-cols-3 gap-x-4 gap-y-7 flex-1">
        {apps.map((app, i) => (
          <motion.button
            key={app.key}
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.35, delay: 0.05 * i + 0.1 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onOpenApp(app.key)}
            className="flex flex-col items-center gap-1.5"
          >
            <div
              className={`relative w-[68px] h-[68px] rounded-2xl ${app.bg} shadow-lg flex items-center justify-center border border-white/10`}
            >
              {app.icon}
              {app.badge && (
                <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-zinc-900">
                  {app.badge}
                </span>
              )}
            </div>
            <div className="text-center">
              <div className="text-white text-xs font-medium leading-tight">{app.label}</div>
              <div className="text-white/40 text-[10px] leading-tight">{app.description}</div>
            </div>
          </motion.button>
        ))}
      </div>

      {/* 底部 Dock - 包含設定 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="mt-6"
      >
        <div className="rounded-3xl bg-white/5 backdrop-blur-md border border-white/10 p-3 flex items-center justify-around">
          <button
            onClick={() => onOpenApp("telechat")}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 flex items-center justify-center active:scale-95 transition"
            aria-label="TeleChat"
          >
            <MessageCircle className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => onOpenApp("broker")}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-zinc-700 to-zinc-900 flex items-center justify-center active:scale-95 transition border border-white/10"
            aria-label="情報販子"
          >
            <Skull className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => onOpenApp("leaderboard")}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-700 flex items-center justify-center active:scale-95 transition"
            aria-label="業績排行榜"
          >
            <Trophy className="w-6 h-6 text-white" />
          </button>
          <button
            onClick={() => onOpenApp("settings")}
            className="w-12 h-12 rounded-2xl bg-gradient-to-br from-slate-600 to-slate-800 flex items-center justify-center active:scale-95 transition border border-white/10"
            aria-label="設定"
          >
            <SettingsIcon className="w-6 h-6 text-white" />
          </button>
        </div>
      </motion.div>

      {/* 免責聲明 */}
      <p className="text-white/25 text-[9px] text-center mt-4 leading-tight px-2">
        本作純屬虛構，旨在透過模擬提升防詐意識。請勿在現實中模仿任何行為。
      </p>
    </div>
  );
}

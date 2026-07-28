"use client";

import { motion } from "framer-motion";
import { MessageCircle, Skull, Trophy, Settings as SettingsIcon, Sparkles } from "lucide-react";
import type { AppName } from "./SimOS";
import { useGameStore } from "@/lib/game/store";

interface HomeScreenProps {
  onOpenApp: (app: AppName) => void;
  intelPoints: number;
  scamScore: number;
}

interface IOSAppTile {
  key: AppName;
  label: string;
  icon: React.ReactNode;
  bg: string; // 漸層背景
  badge?: number;
}

export function HomeScreen({ onOpenApp, intelPoints, scamScore }: HomeScreenProps) {
  const conversations = useGameStore((s) => s.conversations);
  const alias = useGameStore((s) => s.alias);
  const playerAvatar = useGameStore((s) => s.playerAvatar);
  const theme = useGameStore((s) => s.theme);

  const activeConvCount = Object.values(conversations).filter((c) => c.status === "active").length;

  // iOS 風格 App 圖示（圓角矩形 + 漸層背景）
  const apps: IOSAppTile[] = [
    {
      key: "telechat",
      label: "TeleChat",
      icon: <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} fill="white" />,
      bg: "linear-gradient(135deg, #5ac8fa 0%, #007aff 100%)",
      badge: activeConvCount > 0 ? activeConvCount : undefined,
    },
    {
      key: "broker",
      label: "情報販子",
      icon: <Skull className="w-8 h-8 text-white" strokeWidth={2.2} />,
      bg: "linear-gradient(135deg, #48484a 0%, #1c1c1e 100%)",
    },
    {
      key: "leaderboard",
      label: "業績榜",
      icon: <Trophy className="w-8 h-8 text-white" strokeWidth={2.2} />,
      bg: "linear-gradient(135deg, #ffd60a 0%, #ff9500 100%)",
    },
    {
      key: "settings",
      label: "設定",
      icon: <SettingsIcon className="w-8 h-8 text-white" strokeWidth={2.2} />,
      bg: "linear-gradient(135deg, #8e8e93 0%, #48484a 100%)",
    },
  ];

  // iOS 背景：深色用純黑漸層，淺色用淺灰漸層
  const bgStyle =
    theme === "dark"
      ? "linear-gradient(180deg, #1c1c1e 0%, #000000 100%)"
      : "linear-gradient(180deg, #f2f2f7 0%, #e5e5ea 100%)";

  return (
    <div
      className="h-full flex flex-col overflow-hidden relative"
      style={{ background: bgStyle }}
    >
      {/* iOS 主畫面頂部時間顯示（大時鐘） */}
      <div className="pt-3 pb-2 text-center">
        <IOSTime />
      </div>

      {/* 玩家資訊小卡片 */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="mx-4 mb-2"
      >
        <div
          className="rounded-2xl p-3 flex items-center justify-between backdrop-blur-xl"
          style={{
            background: theme === "dark" ? "rgba(28, 28, 30, 0.72)" : "rgba(255, 255, 255, 0.72)",
            border: theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-10 h-10 rounded-full flex items-center justify-center text-xl"
              style={{ background: theme === "dark" ? "#48484a" : "#d1d1d6" }}
            >
              {playerAvatar}
            </div>
            <div>
              <p style={{ color: theme === "dark" ? "#8e8e93" : "#8e8e93", fontSize: "10px" }}>
                詐騙犯代號
              </p>
              <p
                className="text-sm font-bold leading-tight"
                style={{ color: theme === "dark" ? "#fff" : "#000" }}
              >
                {alias}
              </p>
            </div>
          </div>
          <div className="flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
              <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
              <span className="text-emerald-300 text-[10px] font-semibold">{intelPoints}</span>
            </div>
            <span className="text-amber-400 text-[10px] font-medium">
              ${scamScore.toLocaleString()}
            </span>
          </div>
        </div>
      </motion.div>

      {/* iOS App 圖示網格（4 欄） */}
      <div className="flex-1 overflow-y-auto px-5 pt-4">
        <div className="grid grid-cols-4 gap-x-4 gap-y-5">
          {apps.map((app, i) => (
            <motion.button
              key={app.key}
              initial={{ opacity: 0, y: 16, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ duration: 0.35, delay: 0.05 * i + 0.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onOpenApp(app.key)}
              className="flex flex-col items-center gap-1.5"
            >
              <div className="relative">
                <div
                  className="w-[60px] h-[60px] flex items-center justify-center shadow-lg"
                  style={{
                    background: app.bg,
                    borderRadius: "14px",
                    boxShadow: "0 4px 10px rgba(0,0,0,0.2)",
                  }}
                >
                  {app.icon}
                </div>
                {app.badge && (
                  <span
                    className="absolute -top-1 -right-1 min-w-[20px] h-5 px-1.5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center border-2"
                    style={{ borderColor: theme === "dark" ? "#000" : "#f2f2f7" }}
                  >
                    {app.badge}
                  </span>
                )}
              </div>
              <span
                className="text-[11px] font-medium leading-tight text-center max-w-[68px] truncate"
                style={{ color: theme === "dark" ? "#fff" : "#000" }}
              >
                {app.label}
              </span>
            </motion.button>
          ))}
        </div>

        {/* 第二行圖示預留位（讓版面更像 iPhone） */}
        <div className="grid grid-cols-4 gap-x-4 gap-y-5 mt-5">
          {/* 之後可加更多 App */}
        </div>

        {/* 免責聲明 */}
        <p
          className="text-[9px] text-center mt-6 mb-2 leading-tight px-4"
          style={{ color: theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}
        >
          本作純屬虛構，旨在透過模擬提升防詐意識。請勿在現實中模仿任何行為。
        </p>
      </div>

      {/* iOS 底部透明 Dock 欄 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="px-4 pb-2"
      >
        <div
          className="rounded-[28px] p-3 flex items-center justify-around backdrop-blur-2xl"
          style={{
            background: theme === "dark" ? "rgba(58, 58, 60, 0.6)" : "rgba(255, 255, 255, 0.6)",
            border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {apps.map((app) => (
            <button
              key={`dock-${app.key}`}
              onClick={() => onOpenApp(app.key)}
              className="relative active:scale-90 transition"
              aria-label={app.label}
            >
              <div
                className="w-[52px] h-[52px] flex items-center justify-center shadow-md"
                style={{
                  background: app.bg,
                  borderRadius: "12px",
                }}
              >
                {app.icon}
              </div>
              {app.badge && (
                <span
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2"
                  style={{ borderColor: theme === "dark" ? "rgba(58,58,60,0.6)" : "rgba(255,255,255,0.6)" }}
                >
                  {app.badge}
                </span>
              )}
            </button>
          ))}
        </div>
      </motion.div>

      {/* Home indicator */}
      <div className="flex justify-center pb-1">
        <div
          className="w-32 h-1 rounded-full"
          style={{ background: theme === "dark" ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}
        />
      </div>
    </div>
  );
}

/** iOS 主畫面大時鐘（與狀態欄小時鐘不同，這是主畫面上的大時間） */
function IOSTime() {
  const time = useCurrentTime();
  const theme = useGameStore((s) => s.theme);
  return (
    <div
      className="text-[13px] font-semibold"
      style={{ color: theme === "dark" ? "rgba(255,255,255,0.9)" : "rgba(0,0,0,0.9)" }}
    >
      {time}
    </div>
  );
}

function useCurrentTime() {
  // 簡易實作：每次 render 取當前時間
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

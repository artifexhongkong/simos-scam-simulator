"use client";

import { motion } from "framer-motion";
import { MessageCircle, Skull, Trophy, Settings as SettingsIcon, Sparkles, TrendingUp, Users, Target } from "lucide-react";
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
  bg: string;
  badge?: number;
}

export function HomeScreen({ onOpenApp, intelPoints, scamScore }: HomeScreenProps) {
  const conversations = useGameStore((s) => s.conversations);
  const alias = useGameStore((s) => s.alias);
  const playerAvatar = useGameStore((s) => s.playerAvatar);
  const theme = useGameStore((s) => s.theme);
  const unlockedNpcIds = useGameStore((s) => s.unlockedNpcIds);
  const friendNpcIds = useGameStore((s) => s.friendNpcIds);

  const activeConvCount = Object.values(conversations).filter((c) => c.status === "active").length;
  const succeededCount = Object.values(conversations).filter((c) => c.status === "succeeded").length;

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

  const bgStyle =
    theme === "dark"
      ? "linear-gradient(180deg, #1c1c1e 0%, #000000 100%)"
      : "linear-gradient(180deg, #f2f2f7 0%, #e5e5ea 100%)";

  const cardBg = theme === "dark" ? "rgba(28, 28, 30, 0.72)" : "rgba(255, 255, 255, 0.72)";
  const cardBorder = theme === "dark" ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.06)";
  const textMain = theme === "dark" ? "#fff" : "#000";
  const textSub = "#8e8e93";

  return (
    <div
      className="h-full min-h-0 flex flex-col overflow-hidden relative"
      style={{ background: bgStyle }}
    >
      {/* 上半部：狀態欄 + 時間 + 玩家資訊 + 統計 + App 圖示 + 免責聲明
          flex-1 佔滿中間區域，但內容靠上排列，下方自然留白 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {/* iOS 主畫面頂部時間顯示 */}
        <div className="pt-2 pb-1 text-center shrink-0">
          <IOSTime />
        </div>

        {/* 玩家資訊小卡片 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-4 mb-2 mt-1 shrink-0"
        >
          <div
            className="rounded-2xl p-2.5 flex items-center justify-between backdrop-blur-xl"
            style={{ background: cardBg, border: cardBorder }}
          >
            <div className="flex items-center gap-2">
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-lg"
                style={{ background: theme === "dark" ? "#48484a" : "#d1d1d6" }}
              >
                {playerAvatar}
              </div>
              <div>
                <p style={{ color: textSub, fontSize: "9px" }}>詐騙犯代號</p>
                <p className="text-xs font-bold leading-tight" style={{ color: textMain }}>
                  {alias}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">
                <Sparkles className="w-2.5 h-2.5 text-emerald-400" />
                <span className="text-emerald-300 text-[10px] font-semibold">{intelPoints}</span>
              </div>
              <span className="text-amber-400 text-[11px] font-medium">
                ${scamScore.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>

        {/* 遊戲進度統計小卡片 */}
        <motion.div
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="mx-4 mb-4 shrink-0"
        >
          <div
            className="rounded-2xl p-3 backdrop-blur-xl"
            style={{ background: cardBg, border: cardBorder }}
          >
            <div className="grid grid-cols-3 gap-2">
              <StatItem
                icon={<Users className="w-3 h-3" />}
                label="已解鎖"
                value={`${unlockedNpcIds.length}`}
                color="#5ac8fa"
              />
              <StatItem
                icon={<MessageCircle className="w-3 h-3" />}
                label="已加好友"
                value={`${friendNpcIds.length}`}
                color="#34c759"
              />
              <StatItem
                icon={<TrendingUp className="w-3 h-3" />}
                label="詐騙成功"
                value={`${succeededCount}`}
                color="#ff9500"
              />
            </div>
          </div>
        </motion.div>

        {/* iOS App 圖示網格 */}
        <div className="px-5 py-2 shrink-0">
          <div className="grid grid-cols-4 gap-x-4 gap-y-4">
            {apps.map((app, i) => (
              <motion.button
                key={app.key}
                initial={{ opacity: 0, y: 16, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.35, delay: 0.05 * i + 0.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => onOpenApp(app.key)}
                className="flex flex-col items-center gap-1"
              >
                <div className="relative">
                  <div
                    className="w-[56px] h-[56px] flex items-center justify-center"
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
                  style={{ color: textMain }}
                >
                  {app.label}
                </span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* 免責聲明 */}
        <p
          className="text-[9px] text-center leading-tight px-4 mt-3 shrink-0"
          style={{ color: theme === "dark" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)" }}
        >
          本作純屬虛構，旨在透過模擬提升防詐意識。
        </p>
      </div>

      {/* 底部 Dock 欄 - shrink-0 確保永遠完整顯示
          使用 sticky 位置 + safe-area-bottom 處理系統列 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="px-3 pt-2 pb-2 shrink-0"
        style={{ paddingBottom: "calc(0.5rem + env(safe-area-inset-bottom, 0px))" }}
      >
        <div
          className="rounded-[28px] p-2.5 flex items-center justify-around backdrop-blur-2xl"
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
                className="w-[50px] h-[50px] flex items-center justify-center"
                style={{ background: app.bg, borderRadius: "12px" }}
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
    </div>
  );
}

function StatItem({
  icon,
  label,
  value,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color: string;
}) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <div className="flex items-center gap-1" style={{ color }}>
        {icon}
        <span className="text-[10px] font-medium">{label}</span>
      </div>
      <span className="text-sm font-bold" style={{ color }}>
        {value}
      </span>
    </div>
  );
}

/** iOS 主畫面大時鐘 */
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
  const d = new Date();
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}


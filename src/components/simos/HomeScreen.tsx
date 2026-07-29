"use client";

import { motion } from "framer-motion";
import { MessageCircle, Skull, Trophy, Settings as SettingsIcon, Sparkles, Phone, Compass, Safari } from "lucide-react";
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

// Dock 欄佔位 App（之後會加入功能）
interface DockTile {
  key: string;
  label: string;
  icon: React.ReactNode;
  bg: string;
}

export function HomeScreen({ onOpenApp, intelPoints, scamScore }: HomeScreenProps) {
  const conversations = useGameStore((s) => s.conversations);
  const alias = useGameStore((s) => s.alias);
  const playerAvatar = useGameStore((s) => s.playerAvatar);
  const theme = useGameStore((s) => s.theme);

  // 計算未讀訊息數
  const unreadCount = Object.values(conversations).filter((c) => {
    if (c.status !== "active") return false;
    const msgs = c.messages;
    if (msgs.length === 0) return false;
    const lastMsg = msgs[msgs.length - 1];
    return lastMsg.role === "npc";
  }).length;

  // 桌面 App（遊戲核心功能）
  const apps: IOSAppTile[] = [
    {
      key: "telechat",
      label: "TeleChat",
      icon: <MessageCircle className="w-8 h-8 text-white" strokeWidth={2} fill="white" />,
      bg: "linear-gradient(135deg, #5ac8fa 0%, #007aff 100%)",
      badge: unreadCount > 0 ? unreadCount : undefined,
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

  // Dock 欄 App（跨分頁常用，佔位，之後加功能）
  const dockApps: DockTile[] = [
    {
      key: "phone",
      label: "電話",
      icon: <Phone className="w-6 h-6 text-white" strokeWidth={2} fill="white" />,
      bg: "linear-gradient(135deg, #34c759 0%, #248a3d 100%)",
    },
    {
      key: "messages",
      label: "訊息",
      icon: <MessageCircle className="w-6 h-6 text-white" strokeWidth={2} fill="white" />,
      bg: "linear-gradient(135deg, #5ac8fa 0%, #007aff 100%)",
    },
    {
      key: "browser",
      label: "瀏覽器",
      icon: <Compass className="w-6 h-6 text-white" strokeWidth={2} />,
      bg: "linear-gradient(135deg, #007aff 0%, #0040dd 100%)",
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
      {/* 上半部內容區 - 移除雙重時間，直接從玩家資訊卡開始 */}
      <div className="flex-1 min-h-0 flex flex-col overflow-y-auto">
        {/* 玩家資訊小卡片 */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mx-4 mb-2 mt-3 shrink-0"
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
                <p style={{ color: textSub, fontSize: "9px" }}>CC園區員工代號</p>
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

        {/* iOS App 圖示網格 */}
        <div className="px-5 py-3 shrink-0">
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

      {/* 底部 Dock 欄 - 與桌面 App 不同（電話/訊息/瀏覽器佔位）
          底部不貼死螢幕，預留 safe-area-bottom 空間 */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.4 }}
        className="px-3 pt-2 shrink-0"
        style={{
          paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom, 0px))",
        }}
      >
        <div
          className="rounded-[28px] p-2.5 flex items-center justify-around backdrop-blur-2xl"
          style={{
            background: theme === "dark" ? "rgba(58, 58, 60, 0.6)" : "rgba(255, 255, 255, 0.6)",
            border: theme === "dark" ? "1px solid rgba(255,255,255,0.1)" : "1px solid rgba(0,0,0,0.06)",
          }}
        >
          {dockApps.map((app) => (
            <button
              key={`dock-${app.key}`}
              onClick={() => {
                // 佔位 App 提示之後加入功能
                alert(`${app.label} App 即將推出，敬請期待！`);
              }}
              className="relative active:scale-90 transition"
              aria-label={app.label}
            >
              <div
                className="w-[50px] h-[50px] flex items-center justify-center opacity-60"
                style={{ background: app.bg, borderRadius: "12px" }}
              >
                {app.icon}
              </div>
            </button>
          ))}
        </div>
      </motion.div>
    </div>
  );
}

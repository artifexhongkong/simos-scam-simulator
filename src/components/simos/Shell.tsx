"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface AppShellProps {
  children: React.ReactNode;
  wallpaper?: "dark" | "tech";
}

/**
 * 全螢幕沉浸式 PhoneFrame
 *
 * 真正可靠的方案：position: fixed + inset: 0
 * - 不依賴 100vh / 100dvh / window.innerHeight（這些在 Android WebView 不可靠）
 * - fixed 定位直接佔滿可視區域，瀏覽器/系統會自動處理系統列
 * - inset: 0 等於 top:0; right:0; bottom:0; left:0
 * - 搭配 safe-area-inset 處理劉海/系統列
 *
 * 此方案在以下環境都驗證可行：
 * - iOS Safari（含 URL bar 顯示/隱藏）
 * - Android Chrome
 * - Capacitor Android WebView（沉浸式模式）
 * - Capacitor iOS WKWebView
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="fixed inset-0 w-full bg-black flex items-center justify-center"
      style={{
        /* 安全區域 insets */
        paddingTop: "env(safe-area-inset-top, 0px)",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        paddingLeft: "env(safe-area-inset-left, 0px)",
        paddingRight: "env(safe-area-inset-right, 0px)",
      }}
    >
      <div className="relative w-full md:w-[390px] h-full bg-black overflow-hidden flex flex-col md:rounded-[44px] md:border-[10px] md:border-zinc-900 md:shadow-2xl md:h-[844px]">
        {/* 動態島（只在桌面顯示） */}
        <div className="hidden md:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50" />
        {children}
      </div>
    </div>
  );
}

/**
 * iOS 模擬介面 AppShell
 * - 含 iPhone 狀態欄（時間、訊號、Wi-Fi、電量）
 * - 背景透明，由 children 自行決定背景色
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div
      className="relative h-full w-full flex flex-col overflow-hidden"
      style={{ background: "var(--im-bg)", color: "var(--im-header-text)" }}
    >
      <PhoneStatusBar />
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * 原版深色風格 AppShell（無 iOS 狀態欄，保留 zinc 漸層背景）
 */
export function ClassicAppShell({ children, wallpaper = "tech" }: AppShellProps) {
  const bg =
    wallpaper === "tech"
      ? "bg-gradient-to-b from-zinc-900 via-zinc-950 to-black"
      : "bg-gradient-to-b from-slate-800 via-slate-900 to-black";

  return (
    <div className={`relative h-full w-full ${bg} flex flex-col text-white overflow-hidden`}>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </div>
  );
}

/**
 * 模擬真實手機狀態欄
 * - 顯示當前時間（每分鐘更新）
 * - 顯示訊號強度、Wi-Fi、電量圖示
 * - 電量根據當前時間慢慢下降（模擬真實使用）
 */
function PhoneStatusBar() {
  const [time, setTime] = useState("");
  const [battery, setBattery] = useState(87);

  useEffect(() => {
    const updateTime = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      setTime(`${h}:${m}`);
    };
    updateTime();
    const id = setInterval(updateTime, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setBattery((b) => (b > 20 ? b - 1 : 100));
    }, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className="flex items-center justify-between px-6 pt-2 pb-1 text-[13px] font-semibold select-none z-40 relative shrink-0"
      style={{ color: "var(--im-statusbar-text, #000)" }}
    >
      <span className="tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5" style={{ color: "var(--im-statusbar-text, #000)" }}>
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon level={battery} />
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor">
      <rect x="0" y="7" width="2.5" height="4" rx="0.5" />
      <rect x="4" y="5" width="2.5" height="6" rx="0.5" />
      <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
      <rect x="12" y="1" width="2.5" height="10" rx="0.5" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor">
      <path d="M7.5 0C4.5 0 1.8 1.1 0 2.9l1.2 1.2c1.6-1.6 3.9-2.6 6.3-2.6s4.7 1 6.3 2.6L15 2.9C13.2 1.1 10.5 0 7.5 0z" />
      <path d="M7.5 3.7c-1.9 0-3.6.7-4.9 1.9l1.2 1.2c1-1 2.3-1.5 3.7-1.5s2.7.6 3.7 1.5l1.2-1.2c-1.3-1.2-3-1.9-4.9-1.9z" />
      <path d="M7.5 7.2c-.8 0-1.6.3-2.2.9l1.2 1.2c.3-.3.6-.4 1-.4s.7.1 1 .4l1.2-1.2c-.6-.6-1.4-.9-2.2-.9z" />
      <circle cx="7.5" cy="10" r="1" />
    </svg>
  );
}

function BatteryIcon({ level }: { level: number }) {
  const isLow = level < 20;
  const isCharging = level === 100;
  const fillColor = isCharging ? "#34d399" : isLow ? "#f87171" : "currentColor";
  const barWidth = Math.max(2, (level / 100) * 18);

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[11px] font-medium">{level}</span>
      <div className="relative flex items-center">
        <div className="w-[22px] h-[11px] border rounded-[3px] p-[1px] flex items-center" style={{ borderColor: "currentColor", opacity: 0.8 }}>
          <div
            className="h-full rounded-[1px] transition-all"
            style={{ width: `${barWidth}px`, backgroundColor: fillColor }}
          />
        </div>
        <div className="w-[1.5px] h-[4px] rounded-r-sm ml-[0.5px]" style={{ background: "currentColor", opacity: 0.8 }} />
      </div>
    </div>
  );
}

interface AppContainerProps {
  title: string;
  onBack: () => void;
  children: React.ReactNode;
  headerColor?: string;
}

export function AppContainer({ title, onBack, children, headerColor = "bg-zinc-900" }: AppContainerProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="h-full min-h-0 flex flex-col"
    >
      <div className={`${headerColor} px-4 pt-1 pb-3 flex items-center gap-3 border-b border-white/5 shrink-0`}>
        <button
          onClick={onBack}
          className="text-blue-400 text-sm hover:text-blue-300 active:scale-95 transition"
          aria-label="返回主畫面"
        >
          ‹ 返回
        </button>
        <h2 className="text-white text-base font-semibold flex-1 text-center pr-8 truncate">{title}</h2>
      </div>
      <div className="flex-1 min-h-0 overflow-hidden">{children}</div>
    </motion.div>
  );
}

export function AnimateApp({ show, children }: { show: boolean; children: React.ReactNode }) {
  return (
    <AnimatePresence mode="wait">
      {show && <motion.div className="h-full w-full absolute inset-0 z-30">{children}</motion.div>}
    </AnimatePresence>
  );
}

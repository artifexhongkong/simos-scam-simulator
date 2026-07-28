"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

interface AppShellProps {
  children: React.ReactNode;
  wallpaper?: "dark" | "tech";
}

/**
 * 全螢幕沉浸式 PhoneFrame
 * - 在網頁端：模擬手機外框，但內容填滿整個視窗
 * - 在 Capacitor APK：因 MainActivity 啟用 immersive sticky 模式，
 *   Android 系統狀態欄與導航欄會自動隱藏，由 App 完全佔用螢幕
 *
 * 重要：使用 100dvh（dynamic viewport height）而非 100vh
 *  - 100vh 在行動瀏覽器會包含 URL bar 高度，導致底部被切斷
 *  - 100dvh 會隨 URL bar 顯示/隱藏動態調整，確保底部永遠可見
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="w-full flex items-center justify-center md:py-0 bg-black"
      style={{ minHeight: "100dvh" }}
    >
      <div className="relative w-full md:w-[390px] bg-black overflow-hidden flex flex-col h-[100dvh] md:h-[844px]">
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
 * - 內容區用 flex-1 + min-h-0 確保不超出視窗
 */
export function AppShell({ children }: AppShellProps) {
  return (
    <div className="relative h-full w-full flex flex-col text-white overflow-hidden bg-black">
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
      style={{ color: "var(--im-statusbar-text, #fff)", background: "transparent" }}
    >
      <span className="tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5">
        <SignalIcon />
        <WifiIcon />
        <BatteryIcon level={battery} />
      </div>
    </div>
  );
}

function SignalIcon() {
  return (
    <svg width="16" height="11" viewBox="0 0 16 11" fill="currentColor" className="text-white">
      <rect x="0" y="7" width="2.5" height="4" rx="0.5" />
      <rect x="4" y="5" width="2.5" height="6" rx="0.5" />
      <rect x="8" y="3" width="2.5" height="8" rx="0.5" />
      <rect x="12" y="1" width="2.5" height="10" rx="0.5" />
    </svg>
  );
}

function WifiIcon() {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="currentColor" className="text-white">
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
  const fillColor = isCharging ? "#34d399" : isLow ? "#f87171" : "#ffffff";
  const barWidth = Math.max(2, (level / 100) * 18);

  return (
    <div className="flex items-center gap-0.5">
      <span className="text-[11px] font-medium text-white/90">{level}</span>
      <div className="relative flex items-center">
        <div className="w-[22px] h-[11px] border border-white/80 rounded-[3px] p-[1px] flex items-center">
          <div
            className="h-full rounded-[1px] transition-all"
            style={{ width: `${barWidth}px`, backgroundColor: fillColor }}
          />
        </div>
        <div className="w-[1.5px] h-[4px] bg-white/80 rounded-r-sm ml-[0.5px]" />
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

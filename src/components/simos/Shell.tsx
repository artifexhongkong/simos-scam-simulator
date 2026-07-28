"use client";

import { motion, AnimatePresence } from "framer-motion";

interface AppShellProps {
  children: React.ReactNode;
  wallpaper?: "dark" | "tech";
}

/**
 * 全螢幕沉浸式 PhoneFrame
 * - 在網頁端：模擬手機外框，但內容填滿整個視窗
 * - 在 Capacitor APK：因 MainActivity 啟用 immersive sticky 模式，
 *   Android 系統狀態欄與導航欄會自動隱藏，由 App 完全佔用螢幕
 */
export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-black flex items-center justify-center md:py-0">
      {/* 手機外框（在桌面上顯示邊框，行動裝置則全螢幕） */}
      <div className="relative w-full md:w-[390px] md:h-[844px] h-screen min-h-screen bg-black md:rounded-[44px] md:border-[10px] md:border-zinc-900 md:shadow-2xl overflow-hidden">
        {/* 動態島（只在桌面顯示） */}
        <div className="hidden md:block absolute top-2 left-1/2 -translate-x-1/2 w-28 h-7 bg-black rounded-full z-50" />
        {children}
      </div>
    </div>
  );
}

export function AppShell({ children, wallpaper = "tech" }: AppShellProps) {
  const bg =
    wallpaper === "tech"
      ? "bg-gradient-to-b from-zinc-900 via-zinc-950 to-black"
      : "bg-gradient-to-b from-slate-800 via-slate-900 to-black";

  return (
    <div className={`relative h-full w-full ${bg} flex flex-col text-white overflow-hidden`}>
      {/* 不再顯示自製狀態欄 - 讓遊戲完全沉浸式 */}
      <div className="flex-1 overflow-hidden">{children}</div>
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
      className="h-full flex flex-col"
    >
      <div className={`${headerColor} px-4 pt-2 pb-3 flex items-center gap-3 border-b border-white/5`}>
        <button
          onClick={onBack}
          className="text-blue-400 text-sm hover:text-blue-300 active:scale-95 transition"
          aria-label="返回主畫面"
        >
          ‹ 返回
        </button>
        <h2 className="text-white text-base font-semibold flex-1 text-center pr-8 truncate">{title}</h2>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
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

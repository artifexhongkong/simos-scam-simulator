"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Wifi, BatteryFull, Signal } from "lucide-react";

export function StatusBar() {
  const [time, setTime] = useState("");

  useEffect(() => {
    const update = () => {
      const d = new Date();
      const h = d.getHours().toString().padStart(2, "0");
      const m = d.getMinutes().toString().padStart(2, "0");
      setTime(`${h}:${m}`);
    };
    update();
    const id = setInterval(update, 30000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex items-center justify-between px-6 pt-3 pb-1 text-white text-sm font-medium select-none">
      <span className="tracking-tight">{time}</span>
      <div className="flex items-center gap-1.5">
        <Signal className="w-3.5 h-3.5" />
        <Wifi className="w-3.5 h-3.5" />
        <BatteryFull className="w-4 h-4" />
      </div>
    </div>
  );
}

interface AppShellProps {
  children: React.ReactNode;
  wallpaper?: "dark" | "tech";
}

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen w-full bg-zinc-950 flex items-center justify-center md:py-6">
      {/* 手機外框（在桌面上顯示邊框） */}
      <div className="relative w-full md:w-[390px] md:h-[844px] h-screen bg-black md:rounded-[44px] md:border-[10px] md:border-zinc-900 md:shadow-2xl overflow-hidden">
        {/* 動態島 */}
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
      <StatusBar />
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

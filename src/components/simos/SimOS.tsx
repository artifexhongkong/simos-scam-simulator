"use client";

import { motion } from "framer-motion";
import { PhoneFrame, AppShell } from "./Shell";
import { HomeScreen } from "./HomeScreen";
import { TeleChatApp } from "@/components/apps/telechat/TeleChatApp";
import { InfoBrokerApp } from "@/components/apps/broker/InfoBrokerApp";
import { LeaderboardApp } from "@/components/apps/leaderboard/LeaderboardApp";
import { SettingsApp } from "@/components/apps/settings/SettingsApp";
import { useGameStore } from "@/lib/game/store";
import { useEffect, useState } from "react";

export type AppName = "home" | "telechat" | "broker" | "leaderboard" | "settings";

export function SimOS() {
  const [activeApp, setActiveApp] = useState<AppName>("home");
  const [hydrated, setHydrated] = useState(false);

  const intelPoints = useGameStore((s) => s.intelPoints);
  const scamScore = useGameStore((s) => s.scamScore);

  // Client 端 hydration
  useEffect(() => {
    useGameStore.persist.rehydrate();
    // 用 microtask 避免在 effect 同步呼叫 setState
    Promise.resolve().then(() => setHydrated(true));
  }, []);

  // 全螢幕沉浸式：嘗試隱藏瀏覽器/系統的 URL bar 與 status bar
  useEffect(() => {
    if (typeof window === "undefined") return;

    const requestFullscreen = async () => {
      try {
        // 嘗試進入 fullscreen mode（部分瀏覽器需要用戶手勢，這裡不強制）
        // const el = document.documentElement;
        // if (el.requestFullscreen) await el.requestFullscreen();
      } catch {
        // ignore
      }
    };

    // 滾動到頂部隱藏 URL bar
    const scrollToTop = () => {
      window.scrollTo(0, 1);
    };
    setTimeout(scrollToTop, 100);

    // 監聽 resize 重新隱藏 URL bar
    window.addEventListener("resize", scrollToTop);
    window.addEventListener("orientationchange", scrollToTop);

    requestFullscreen();

    return () => {
      window.removeEventListener("resize", scrollToTop);
      window.removeEventListener("orientationchange", scrollToTop);
    };
  }, []);

  if (!hydrated) {
    return (
      <PhoneFrame>
        <AppShell>
          <div className="h-full flex items-center justify-center">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-white/60 text-sm"
            >
              啟動 SimOS...
            </motion.div>
          </div>
        </AppShell>
        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full" />
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <AppShell>
        {activeApp === "home" && (
          <HomeScreen onOpenApp={setActiveApp} intelPoints={intelPoints} scamScore={scamScore} />
        )}

        {activeApp === "telechat" && <TeleChatApp onBack={() => setActiveApp("home")} />}
        {activeApp === "broker" && <InfoBrokerApp onBack={() => setActiveApp("home")} />}
        {activeApp === "leaderboard" && <LeaderboardApp onBack={() => setActiveApp("home")} />}
        {activeApp === "settings" && <SettingsApp onBack={() => setActiveApp("home")} />}
      </AppShell>

      {/* Home indicator */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full" />
    </PhoneFrame>
  );
}

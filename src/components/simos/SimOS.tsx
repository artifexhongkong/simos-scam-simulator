"use client";

import { motion } from "framer-motion";
import { PhoneFrame, AppShell } from "./Shell";
import { HomeScreen } from "./HomeScreen";
import { TeleChatApp } from "@/components/apps/telechat/TeleChatApp";
import { InfoBrokerApp } from "@/components/apps/broker/InfoBrokerApp";
import { LeaderboardApp } from "@/components/apps/leaderboard/LeaderboardApp";
import { useGameStore } from "@/lib/game/store";
import { useEffect, useState } from "react";

export type AppName = "home" | "telechat" | "broker" | "leaderboard";

export function SimOS() {
  const [activeApp, setActiveApp] = useState<AppName>("home");
  const [hydrated, setHydrated] = useState(false);

  const intelPoints = useGameStore((s) => s.intelPoints);
  const scamScore = useGameStore((s) => s.scamScore);

  // Client 端 hydration
  useEffect(() => {
    useGameStore.persist.rehydrate();
    setHydrated(true);
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
        {activeApp === "home" && <HomeScreen onOpenApp={setActiveApp} intelPoints={intelPoints} scamScore={scamScore} />}

        {activeApp === "telechat" && (
          <TeleChatApp onBack={() => setActiveApp("home")} />
        )}
        {activeApp === "broker" && (
          <InfoBrokerApp onBack={() => setActiveApp("home")} />
        )}
        {activeApp === "leaderboard" && (
          <LeaderboardApp onBack={() => setActiveApp("home")} />
        )}
      </AppShell>

      {/* Home indicator */}
      <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-32 h-1 bg-white/40 rounded-full" />
    </PhoneFrame>
  );
}

"use client";

import { motion } from "framer-motion";
import { PhoneFrame, AppShell } from "./Shell";
import { HomeScreen } from "./HomeScreen";
import { TeleChatApp } from "@/components/apps/telechat/TeleChatApp";
import { InfoBrokerApp } from "@/components/apps/broker/InfoBrokerApp";
import { LeaderboardApp } from "@/components/apps/leaderboard/LeaderboardApp";
import { SettingsApp } from "@/components/apps/settings/SettingsApp";
import { MessagesApp } from "@/components/apps/messages/MessagesApp";
import { DarkNetApp } from "@/components/apps/darknet/DarkNetApp";
import { SmsNotificationBanner } from "@/components/simos/SmsNotificationBanner";
import { DebugFloatingButton } from "@/components/debug/DebugFloatingButton";
import { useGameStore } from "@/lib/game/store";
import { useEffect, useState } from "react";

export type AppName = "home" | "telechat" | "broker" | "leaderboard" | "settings" | "messages" | "darknet";

export function SimOS() {
  const [activeApp, setActiveApp] = useState<AppName>("home");
  const [hydrated, setHydrated] = useState(false);
  const [pendingSmsId, setPendingSmsId] = useState<string | null>(null);

  const theme = useGameStore((s) => s.theme);

  useEffect(() => {
    useGameStore.persist.rehydrate();
    Promise.resolve().then(() => setHydrated(true));
  }, []);

  // 套用深色/淺色主題到 body
  useEffect(() => {
    if (typeof document === "undefined") return;
    const body = document.body;
    if (theme === "dark") {
      body.classList.add("dark-theme");
    } else {
      body.classList.remove("dark-theme");
    }
  }, [theme]);

  if (!hydrated) {
    return (
      <PhoneFrame>
        <AppShell>
          <div className="h-full flex items-center justify-center">
            <motion.div
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="text-sm"
              style={{ color: "var(--im-header-text, #fff)" }}
            >
              啟動 SimOS...
            </motion.div>
          </div>
        </AppShell>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <AppShell>
        {activeApp === "home" && <HomeScreen onOpenApp={setActiveApp} />}
        {activeApp === "telechat" && <TeleChatApp onBack={() => setActiveApp("home")} />}
        {activeApp === "broker" && <InfoBrokerApp onBack={() => setActiveApp("home")} />}
        {activeApp === "leaderboard" && <LeaderboardApp onBack={() => setActiveApp("home")} />}
        {activeApp === "settings" && <SettingsApp onBack={() => setActiveApp("home")} />}
        {activeApp === "messages" && <MessagesApp onBack={() => setActiveApp("home")} initialSmsId={pendingSmsId} onConsumedSmsId={() => setPendingSmsId(null)} />}
        {activeApp === "darknet" && <DarkNetApp onBack={() => setActiveApp("home")} />}

        {/* SMS 通知橫幅（最頂層，類似手機短信通知） */}
        <SmsNotificationBanner onOpenMessages={(smsId) => { setPendingSmsId(smsId); setActiveApp("messages"); }} />

        {/* Debug 浮窗按鈕（懸浮在所有頁面之上） */}
        <DebugFloatingButton />
      </AppShell>
    </PhoneFrame>
  );
}

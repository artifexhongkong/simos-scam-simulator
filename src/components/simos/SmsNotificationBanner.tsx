"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useGameStore } from "@/lib/game/store";

/**
 * SMS 通知橫幅
 *
 * 當有新的未讀短訊時，在畫面最上方顯示一條類似手機短信通知的橫幅。
 * 自動消失，點擊可關閉。
 */
export function SmsNotificationBanner() {
  const smsMessages = useGameStore((s) => s.smsMessages);
  const unreadSmsCount = useGameStore((s) => s.unreadSmsCount);
  const [visible, setVisible] = useState(false);
  const [currentSms, setCurrentSms] = useState(smsMessages[0]);

  // 當有新簡訊時顯示橫幅
  useEffect(() => {
    if (unreadSmsCount > 0 && smsMessages.length > 0) {
      const latest = smsMessages[0];
      // 只在「新」簡訊時顯示（避免每次渲染都彈出）
      if (currentSms?.id !== latest.id) {
        setCurrentSms(latest);
        setVisible(true);
        const timer = setTimeout(() => setVisible(false), 5000);
        return () => clearTimeout(timer);
      }
    }
  }, [smsMessages, unreadSmsCount, currentSms]);

  if (!currentSms || !visible) return null;

  const typeColors = {
    traffic: "#ff9500",
    risk: "#ff3b30",
    system: "#007aff",
    promo: "#34c759",
  };

  const typeIcons = {
    traffic: "📶",
    risk: "⚠️",
    system: "📱",
    promo: "🎁",
  };

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          style={{
            position: "fixed",
            top: "max(8px, env(safe-area-inset-top, 0px))",
            left: 8,
            right: 8,
            zIndex: 10001,
          }}
          onClick={() => setVisible(false)}
        >
          <div
            className="rounded-2xl p-3 backdrop-blur-2xl shadow-lg"
            style={{
              background: "rgba(30, 30, 32, 0.95)",
              border: `1px solid ${typeColors[currentSms.type]}40`,
              boxShadow: `0 4px 20px ${typeColors[currentSms.type]}30`,
            }}
          >
            <div className="flex items-start gap-2.5">
              {/* 圖示 */}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-lg shrink-0"
                style={{ background: `${typeColors[currentSms.type]}30` }}
              >
                {typeIcons[currentSms.type]}
              </div>

              {/* 內容 */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2 mb-0.5">
                  <span className="text-[12px] font-semibold text-white/90 truncate">
                    {currentSms.sender}
                  </span>
                  <span className="text-[10px] text-white/40 shrink-0">
                    {new Date(currentSms.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-[11px] font-medium text-white/70 mb-0.5 truncate">
                  {currentSms.subject}
                </p>
                <p className="text-[11px] text-white/50 line-clamp-2 leading-tight">
                  {currentSms.body}
                </p>
              </div>

              {/* 未讀數 */}
              {unreadSmsCount > 1 && (
                <span
                  className="shrink-0 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold flex items-center justify-center"
                  style={{ background: typeColors[currentSms.type], color: "#fff" }}
                >
                  {unreadSmsCount}
                </span>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

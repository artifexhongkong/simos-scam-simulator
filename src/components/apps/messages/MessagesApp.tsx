"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Trash2, CheckCheck, Mail, AlertTriangle, Wifi, Gift, Smartphone } from "lucide-react";
import { useGameStore, type SmsMessage } from "@/lib/game/store";

export function MessagesApp({ onBack }: { onBack: () => void }) {
  const smsMessages = useGameStore((s) => s.smsMessages);
  const unreadSmsCount = useGameStore((s) => s.unreadSmsCount);
  const markSmsRead = useGameStore((s) => s.markSmsRead);
  const markAllSmsRead = useGameStore((s) => s.markAllSmsRead);
  const deleteSms = useGameStore((s) => s.deleteSms);

  const [activeSms, setActiveSms] = useState<SmsMessage | null>(null);

  const cardBg = "var(--im-bubble-npc-bg)";
  const cardBorder = "var(--im-header-border)";
  const textMain = "var(--im-header-text)";
  const textSub = "var(--im-bubble-system-text)";

  const typeConfig = {
    traffic: { icon: <Wifi className="w-4 h-4" />, color: "#ff9500", label: "流量" },
    risk: { icon: <AlertTriangle className="w-4 h-4" />, color: "#ff3b30", label: "風控" },
    system: { icon: <Smartphone className="w-4 h-4" />, color: "#007aff", label: "系統" },
    promo: { icon: <Gift className="w-4 h-4" />, color: "#34c759", label: "推廣" },
  };

  const handleOpenSms = (sms: SmsMessage) => {
    setActiveSms(sms);
    if (!sms.read) markSmsRead(sms.id);
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden" style={{ background: "var(--im-bg)" }}>
      {/* iOS 風格導航欄 */}
      <div className="flex items-center px-2 py-2 border-b backdrop-blur-xl shrink-0" style={{ background: "var(--im-header-bg)", borderColor: cardBorder }}>
        <button onClick={onBack} className="flex items-center gap-1 text-[17px] font-normal px-1 active:opacity-50 transition" style={{ color: "var(--im-link-text)" }}>
          <ChevronUp className="w-5 h-5 rotate-[-90deg]" /><span>返回</span>
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold" style={{ color: textMain }}>訊息</h2>
        <div className="w-[60px] flex justify-end">
          {unreadSmsCount > 0 && (
            <button
              onClick={markAllSmsRead}
              className="p-1.5 active:opacity-50 transition"
              style={{ color: "var(--im-link-text)" }}
              title="全部標為已讀"
            >
              <CheckCheck className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {/* 短訊列表 */}
      <div className="flex-1 min-h-0 overflow-y-auto scroll-safe-bottom">
        {smsMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-8">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3 opacity-30" style={{ background: cardBg }}>
              <Mail className="w-8 h-8" style={{ color: textSub }} />
            </div>
            <p className="text-sm font-medium mb-1" style={{ color: textMain }}>沒有簡訊</p>
            <p className="text-xs" style={{ color: textSub }}>電信公司的通知會顯示在這裡</p>
          </div>
        ) : (
          <ul>
            {smsMessages.map((sms) => {
              const config = typeConfig[sms.type];
              return (
                <motion.li
                  key={sms.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  style={{ borderBottom: `1px solid ${cardBorder}` }}
                >
                  <button
                    onClick={() => handleOpenSms(sms)}
                    className="w-full px-4 py-3 flex items-start gap-3 transition text-left active:opacity-60"
                    style={{ background: "var(--im-bg)" }}
                  >
                    {/* 未讀圓點 */}
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: sms.read ? "transparent" : config.color }} />

                    {/* 類型圖示 */}
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${config.color}20`, color: config.color }}
                    >
                      {config.icon}
                    </div>

                    {/* 內容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className={`text-sm truncate ${sms.read ? "font-normal" : "font-semibold"}`} style={{ color: textMain }}>
                          {sms.sender}
                        </span>
                        <span className="text-[10px] shrink-0" style={{ color: textSub }}>
                          {formatTime(sms.ts)}
                        </span>
                      </div>
                      <p className={`text-[12px] truncate mt-0.5 ${sms.read ? "font-normal" : "font-medium"}`} style={{ color: textMain }}>
                        {sms.subject}
                      </p>
                      <p className="text-[11px] truncate mt-0.5" style={{ color: textSub }}>
                        {sms.body}
                      </p>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>

      {/* 短訊詳情彈窗 */}
      <AnimatePresence>
        {activeSms && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setActiveSms(null)}
            className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-3"
          >
            <motion.div
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full rounded-3xl border overflow-hidden max-h-[85%] flex flex-col"
              style={{ background: "var(--im-header-bg)", borderColor: "var(--im-header-border)" }}
            >
              {/* 標題 */}
              <div className="p-5 border-b" style={{ borderColor: "var(--im-header-border)" }}>
                <div className="flex items-center gap-3 mb-2">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center"
                    style={{ background: `${typeConfig[activeSms.type].color}20`, color: typeConfig[activeSms.type].color }}
                  >
                    {typeConfig[activeSms.type].icon}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-bold" style={{ color: textMain }}>{activeSms.sender}</h3>
                    <p className="text-xs" style={{ color: textSub }}>
                      {new Date(activeSms.ts).toLocaleString("zh-TW")}
                    </p>
                  </div>
                </div>
                <h4 className="text-sm font-semibold" style={{ color: textMain }}>{activeSms.subject}</h4>
              </div>

              {/* 內容 */}
              <div className="p-5 overflow-y-auto">
                <div
                  className="rounded-2xl p-4"
                  style={{ background: "var(--im-bubble-npc-bg)" }}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap" style={{ color: textMain }}>
                    {activeSms.body}
                  </p>
                </div>

                {/* 提示 */}
                <p className="text-[10px] mt-3 text-center" style={{ color: textSub }}>
                  此為系統模擬簡訊，無法回覆
                </p>
              </div>

              {/* 底部按鈕 */}
              <div className="p-4 border-t flex gap-2" style={{ borderColor: "var(--im-header-border)" }}>
                <button
                  onClick={() => {
                    deleteSms(activeSms.id);
                    setActiveSms(null);
                  }}
                  className="flex-1 py-3 rounded-xl text-sm font-medium active:scale-95 transition flex items-center justify-center gap-1.5"
                  style={{ background: "var(--im-bubble-npc-bg)", color: "#ff3b30" }}
                >
                  <Trash2 className="w-4 h-4" /> 刪除
                </button>
                <button
                  onClick={() => setActiveSms(null)}
                  className="flex-1 py-3 rounded-xl text-sm font-semibold active:scale-95 transition"
                  style={{ background: "var(--im-link-text)", color: "#fff" }}
                >
                  關閉
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function formatTime(ts: number): string {
  const now = Date.now();
  const diff = now - ts;
  const min = Math.floor(diff / 60000);
  const hour = Math.floor(diff / 3600000);
  const day = Math.floor(diff / 86400000);

  if (min < 1) return "剛剛";
  if (min < 60) return `${min}分鐘前`;
  if (hour < 24) return `${hour}小時前`;
  if (day < 7) return `${day}天前`;
  return new Date(ts).toLocaleDateString("zh-TW", { month: "short", day: "numeric" });
}

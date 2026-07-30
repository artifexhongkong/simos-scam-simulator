"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronUp, Trash2, CheckCheck, Mail, AlertTriangle, Wifi, Gift, Smartphone, Send, ArrowLeft } from "lucide-react";
import { useGameStore, type SmsMessage } from "@/lib/game/store";

export function MessagesApp({ onBack, initialSmsId, onConsumedSmsId }: { onBack: () => void; initialSmsId?: string | null; onConsumedSmsId?: () => void }) {
  const smsMessages = useGameStore((s) => s.smsMessages);
  const unreadSmsCount = useGameStore((s) => s.unreadSmsCount);
  const markSmsRead = useGameStore((s) => s.markSmsRead);
  const markAllSmsRead = useGameStore((s) => s.markAllSmsRead);
  const deleteSms = useGameStore((s) => s.deleteSms);
  const replySms = useGameStore((s) => s.replySms);

  const [activeSmsId, setActiveSmsId] = useState<string | null>(initialSmsId ?? null);

  // 當 initialSmsId 變化時，更新 activeSmsId 並標記已讀
  useEffect(() => {
    if (initialSmsId) {
      setActiveSmsId(initialSmsId);
      markSmsRead(initialSmsId);
      onConsumedSmsId?.();
    }
  }, [initialSmsId, markSmsRead, onConsumedSmsId]);

  const activeSms = smsMessages.find((m) => m.id === activeSmsId) || null;

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
    setActiveSmsId(sms.id);
    if (!sms.read) markSmsRead(sms.id);
  };

  // === 詳情頁（全螢幕 iOS Messages 風格）===
  if (activeSms) {
    return (
      <SmsDetailView
        sms={activeSms}
        onBack={() => setActiveSmsId(null)}
        onDelete={() => {
          deleteSms(activeSms.id);
          setActiveSmsId(null);
        }}
        onReply={(text) => replySms(activeSms.id, text)}
        typeConfig={typeConfig}
      />
    );
  }

  // === 列表頁 ===
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
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mb-3 opacity-30" style={{ background: "var(--im-bubble-npc-bg)" }}>
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
                    <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: sms.read ? "transparent" : config.color }} />
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ background: `${config.color}20`, color: config.color }}
                    >
                      {config.icon}
                    </div>
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
                        {sms.replies && sms.replies.length > 0 ? sms.replies[sms.replies.length - 1].text : sms.body}
                      </p>
                    </div>
                  </button>
                </motion.li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// === 簡訊詳情頁（全螢幕 iOS Messages 風格）===
function SmsDetailView({
  sms,
  onBack,
  onDelete,
  onReply,
  typeConfig,
}: {
  sms: SmsMessage;
  onBack: () => void;
  onDelete: () => void;
  onReply: (text: string) => void;
  typeConfig: Record<string, { icon: React.ReactNode; color: string; label: string }>;
}) {
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const config = typeConfig[sms.type];

  const textMain = "var(--im-header-text)";
  const textSub = "var(--im-bubble-system-text)";

  // 自動捲動到底部
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [sms.replies?.length]);

  const handleSend = () => {
    const trimmed = input.trim();
    if (!trimmed) return;
    onReply(trimmed);
    setInput("");
    // 重置 textarea 高度
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 構建訊息列表：原始簡訊 + 所有回覆
  const allMessages: { id: string; text: string; fromPlayer: boolean; ts: number }[] = [
    { id: "original", text: sms.body, fromPlayer: false, ts: sms.ts },
    ...(sms.replies || []).map((r) => ({ id: r.id, text: r.text, fromPlayer: r.fromPlayer, ts: r.ts })),
  ];

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden" style={{ background: "var(--im-bg)" }}>
      {/* iOS 風格導航欄 */}
      <div className="flex items-center px-2 py-2 border-b backdrop-blur-xl shrink-0 z-20" style={{ background: "var(--im-header-bg)", borderColor: "var(--im-header-border)" }}>
        <button onClick={onBack} className="flex items-center gap-1 text-[17px] font-normal px-1 active:opacity-50 transition" style={{ color: "var(--im-link-text)" }}>
          <ArrowLeft className="w-5 h-5" /><span>返回</span>
        </button>
        <div className="flex-1 flex flex-col items-center justify-center">
          <div className="flex items-center gap-1.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center"
              style={{ background: `${config.color}20`, color: config.color }}
            >
              {config.icon}
            </div>
            <span className="text-[16px] font-semibold truncate max-w-[140px]" style={{ color: textMain }}>
              {sms.sender}
            </span>
          </div>
        </div>
        <div className="w-[60px] flex justify-end">
          <button
            onClick={onDelete}
            className="p-1.5 active:opacity-50 transition"
            style={{ color: "var(--im-link-text)" }}
            title="刪除"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 訊息列表（聊天氣泡） */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto px-3 py-4 space-y-1.5"
      >
        {/* 日期分隔 */}
        <div className="flex items-center justify-center mb-2">
          <span className="text-[10px] font-medium px-2.5 py-1 rounded-full" style={{ background: "var(--im-bubble-system-bg)", color: textSub }}>
            {new Date(sms.ts).toLocaleString("zh-TW", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
          </span>
        </div>

        {allMessages.map((msg, i) => (
          <MessageBubble key={msg.id} text={msg.text} fromPlayer={msg.fromPlayer} ts={msg.ts} showTime={i === 0 || i === allMessages.length - 1} />
        ))}
      </div>

      {/* 輸入框（iOS Messages 風格） */}
      <div
        className="px-2 py-2 border-t backdrop-blur-xl shrink-0"
        style={{ background: "var(--im-header-bg)", borderColor: "var(--im-header-border)" }}
      >
        <div className="flex items-end gap-1.5">
          <div
            className="flex-1 flex items-end rounded-[18px] border overflow-hidden"
            style={{
              background: "var(--im-input-bg)",
              borderColor: "var(--im-input-border)",
            }}
          >
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                // 自動調整高度
                e.target.style.height = "auto";
                e.target.style.height = Math.min(e.target.scrollHeight, 80) + "px";
              }}
              onKeyDown={handleKeyDown}
              placeholder="簡訊回覆..."
              rows={1}
              className="flex-1 max-h-20 resize-none bg-transparent px-3 py-1.5 text-[16px] leading-[20px] focus:outline-none"
              style={{
                color: "var(--im-input-text)",
                minHeight: "32px",
              }}
            />
          </div>
          {input.trim().length > 0 && (
            <button
              onClick={handleSend}
              className="w-7 h-7 rounded-full flex items-center justify-center active:scale-90 transition shrink-0"
              style={{
                background: "var(--im-link-text)",
                color: "#ffffff",
              }}
              aria-label="送出"
            >
              <ArrowUpIcon />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// 訊息氣泡
function MessageBubble({ text, fromPlayer, ts, showTime }: { text: string; fromPlayer: boolean; ts: number; showTime: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${fromPlayer ? "justify-end" : "justify-start"}`}
    >
      <div
        className={`max-w-[75%] rounded-[18px] px-3.5 py-2 text-[15px] leading-[20px]`}
        style={{
          background: fromPlayer ? "var(--im-bubble-player-bg)" : "var(--im-bubble-npc-bg)",
          color: fromPlayer ? "var(--im-bubble-player-text)" : "var(--im-bubble-npc-text)",
          borderBottomRightRadius: fromPlayer ? 6 : 18,
          borderBottomLeftRadius: fromPlayer ? 18 : 6,
        }}
      >
        <p className="whitespace-pre-wrap break-words">{text}</p>
      </div>
    </motion.div>
  );
}

// iOS 風格向上箭頭
function ArrowUpIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
      <path d="M8 3.5L3 8.5L4.05 9.55L7.2 6.4V13H8.8V6.4L11.95 9.55L13 8.5L8 3.5Z" />
    </svg>
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

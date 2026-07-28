"use client";

import { motion } from "framer-motion";
import { X, Building, Heart, Clock, TrendingUp, UserCheck } from "lucide-react";
import type { NpcProfile } from "@/lib/game/npcs";

interface QuickPhrasesProps {
  npc: NpcProfile;
  onPick: (text: string) => void;
  onClose: () => void;
}

interface PhraseCategory {
  id: string;
  label: string;
  icon: React.ReactNode;
  color: string;
  phrases: string[];
}

const CATEGORIES: PhraseCategory[] = [
  {
    id: "official",
    label: "官方機構偽裝",
    icon: <Building className="w-3.5 h-3.5" />,
    color: "text-blue-400",
    phrases: [
      "您好，這裡是公積金局，關於您的退休金帳戶有異常需要協助處理",
      "我是銀行客服專員，您的帳戶出現異常登入，請協助驗證身分",
      "警察局通知，您的身分證被盜用於詐騙案件，請配合調查",
      "海關通知您有一個海外包裹被扣留，需繳交保證金才能放行",
      "衛生局通知，您的健保卡有異常使用紀錄，請立即處理",
    ],
  },
  {
    id: "emotion",
    label: "情感攻勢",
    icon: <Heart className="w-3.5 h-3.5" />,
    color: "text-pink-400",
    phrases: [
      "我是您女兒的同事，她託我聯繫您，她最近很擔心您",
      "我們認識好一陣子了，我覺得你跟別人不一樣",
      "你一個人在家一定很孤單吧，我陪你聊聊",
      "我把你當成自己的家人，所以才想幫你這個忙",
      "你這麼善良，我相信你不會拒絕幫我一個小忙",
    ],
  },
  {
    id: "urgent",
    label: "緊急催促",
    icon: <Clock className="w-3.5 h-3.5" />,
    color: "text-red-400",
    phrases: [
      "這件事很緊急，必須在 24 小時內處理，不然會被凍結",
      "請您現在馬上配合，不然帳戶會被永久鎖定",
      "限時優惠只到今天，錯過就沒了",
      "我現在就在處理您的案件，請立刻提供資料",
      "再不處理就來不及了，會被罰更多錢",
    ],
  },
  {
    id: "invest",
    label: "投資機會",
    icon: <TrendingUp className="w-3.5 h-3.5" />,
    color: "text-emerald-400",
    phrases: [
      "我有內部投資管道，月息 5%，比銀行高很多",
      "這是私募白名單，一般人進不來，我特地為你保留",
      "上車機會難得，早期投資者已經賺 3 倍了",
      "我有量化交易策略，穩定獲利，風險極低",
      "這個專案只開放給 VIP 客戶，你女兒也是我們的客戶",
    ],
  },
  {
    id: "verify",
    label: "身分驗證",
    icon: <UserCheck className="w-3.5 h-3.5" />,
    color: "text-amber-400",
    phrases: [
      "為了驗證您的身分，請先轉一筆小額到我們的保障帳戶",
      "請提供您的 OTP 驗證碼，我們需要確認是您本人",
      "請告訴我您的銀行帳號，我幫您設定保障機制",
      "請提供身分證字號和生日，我幫您查詢異常紀錄",
      "請到 ATM 操作驗證程序，我會一步步教您",
    ],
  },
];

export function QuickPhrases({ npc, onPick, onClose }: QuickPhrasesProps) {
  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: "auto" }}
      exit={{ opacity: 0, height: 0 }}
      className="overflow-hidden mb-2"
    >
      <div
        className="rounded-2xl border p-3 max-h-[300px] overflow-y-auto"
        style={{
          background: "var(--im-input-bg)",
          borderColor: "var(--im-header-border)",
        }}
      >
        <div className="flex items-center justify-between mb-2">
          <div className="text-[12px] font-semibold" style={{ color: "var(--im-header-text)" }}>
            快捷话术庫
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full active:scale-95"
            style={{ color: "var(--im-bubble-system-text)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-3">
          {CATEGORIES.map((cat) => (
            <div key={cat.id}>
              <div className={`flex items-center gap-1 text-[11px] font-medium mb-1.5 ${cat.color}`}>
                {cat.icon}
                <span>{cat.label}</span>
              </div>
              <div className="space-y-1">
                {cat.phrases.map((p, i) => (
                  <button
                    key={`${cat.id}-${i}`}
                    onClick={() => onPick(p)}
                    className="w-full text-left px-2.5 py-1.5 rounded-lg text-[12px] leading-relaxed active:scale-[0.98] transition"
                    style={{
                      background: "var(--im-bubble-npc-bg)",
                      color: "var(--im-bubble-npc-text)",
                    }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

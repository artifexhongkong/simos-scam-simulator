"use client";

import { motion } from "framer-motion";
import { X } from "lucide-react";

interface ImageMaterialsProps {
  onPick: (mat: { type: string; label: string }) => void;
  onClose: () => void;
}

interface ImageMaterial {
  type: string;
  label: string;
  emoji: string;
  desc: string;
  bg: string;
}

const MATERIALS: ImageMaterial[] = [
  {
    type: "police_id",
    label: "警察證",
    emoji: "🪪",
    desc: "偽造的警政署職員證",
    bg: "from-blue-600 to-blue-800",
  },
  {
    type: "bank_notice",
    label: "銀行通知",
    emoji: "🏦",
    desc: "偽造的銀行簡訊截圖",
    bg: "from-emerald-600 to-emerald-800",
  },
  {
    type: "gov_letter",
    label: "政府公文",
    emoji: "📜",
    desc: "偽造的公積金局通知函",
    bg: "from-amber-600 to-amber-800",
  },
  {
    type: "investment_app",
    label: "投資App截圖",
    emoji: "📈",
    desc: "偽造的高收益投資平台截圖",
    bg: "from-purple-600 to-purple-800",
  },
  {
    type: "id_card",
    label: "身分證",
    emoji: "🆔",
    desc: "偽造的身分證影本",
    bg: "from-rose-600 to-rose-800",
  },
  {
    type: "transfer_receipt",
    label: "轉帳截圖",
    emoji: "💸",
    desc: "偽造的他人轉帳成功截圖（製造從眾壓力）",
    bg: "from-cyan-600 to-cyan-800",
  },
  {
    type: "court_summon",
    label: "法院傳票",
    emoji: "⚖️",
    desc: "偽造的地檢署傳票",
    bg: "from-zinc-600 to-zinc-800",
  },
  {
    type: "lottery_win",
    label: "中獎通知",
    emoji: "🎉",
    desc: "偽造的彩券中獎通知",
    bg: "from-orange-500 to-red-600",
  },
];

export function ImageMaterials({ onPick, onClose }: ImageMaterialsProps) {
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
            📎 圖片素材（偽造）
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full active:scale-95"
            style={{ color: "var(--im-bubble-system-text)" }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {MATERIALS.map((mat) => (
            <button
              key={mat.type}
              onClick={() => onPick({ type: mat.type, label: mat.label })}
              className="text-left rounded-xl overflow-hidden active:scale-95 transition"
            >
              <div className={`bg-gradient-to-br ${mat.bg} h-16 flex items-center justify-center text-3xl`}>
                {mat.emoji}
              </div>
              <div
                className="p-2"
                style={{
                  background: "var(--im-bubble-npc-bg)",
                  color: "var(--im-bubble-npc-text)",
                }}
              >
                <div className="text-[11px] font-semibold leading-tight">{mat.label}</div>
                <div className="text-[9px] opacity-70 leading-tight mt-0.5">{mat.desc}</div>
              </div>
            </button>
          ))}
        </div>

        <p className="text-[9px] mt-2 leading-tight" style={{ color: "var(--im-bubble-system-text)" }}>
          💡 發送圖片素材可提升說服力，但過度使用會引起市民警覺
        </p>
      </div>
    </motion.div>
  );
}

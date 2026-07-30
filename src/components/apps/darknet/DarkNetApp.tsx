"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  RotateCw,
  Lock,
  Search,
  ShoppingCart,
  Phone,
  ShieldAlert,
  Check,
  AlertTriangle,
  Globe,
  User,
  PlayCircle,
} from "lucide-react";
import { useGameStore } from "@/lib/game/store";

type Page = "home" | "phone-shop" | "confirm";

export function DarkNetApp({ onBack }: { onBack: () => void }) {
  const [page, setPage] = useState<Page>("home");
  const [url, setUrl] = useState("darknet://home");
  const [showPurchaseResult, setShowPurchaseResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [showAdModal, setShowAdModal] = useState(false);

  const darkCoin = useGameStore((s) => s.darkCoin);
  const riskLevel = useGameStore((s) => s.riskLevel);
  const alias = useGameStore((s) => s.alias);
  const phoneNumber = useGameStore((s) => s.phoneNumber);
  const buyPhoneNumber = useGameStore((s) => s.buyPhoneNumber);
  const buyPhoneNumberByAd = useGameStore((s) => s.buyPhoneNumberByAd);

  const PHONE_PRICE = 350;

  const navigate = (target: Page, newUrl: string) => {
    setPage(target);
    setUrl(newUrl);
  };

  const handleBuyWithDrc = () => {
    const result = buyPhoneNumber();
    if (result.ok) {
      setShowPurchaseResult({
        ok: true,
        msg: `購買成功！新代號：${result.newAlias}。風控值已重置為 0。`,
      });
    } else {
      setShowPurchaseResult({
        ok: false,
        msg: result.error || "購買失敗",
      });
    }
    setTimeout(() => setShowPurchaseResult(null), 4000);
  };

  const handleBuyWithAd = () => {
    setShowAdModal(true);
  };

  const handleAdComplete = () => {
    const result = buyPhoneNumberByAd();
    setShowAdModal(false);
    if (result.ok) {
      setShowPurchaseResult({
        ok: true,
        msg: `廣告兌換成功！新代號：${result.newAlias}。風控值已重置為 0。`,
      });
      setTimeout(() => setShowPurchaseResult(null), 4000);
    }
  };

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden" style={{ background: "#0a0a0c" }}>
      {/* 瀏覽器頂部導航欄 */}
      <div
        className="flex items-center gap-1 px-2 py-2 shrink-0"
        style={{ background: "#1c1c1e", borderBottom: "1px solid #2c2c2e" }}
      >
        <button
          onClick={() => navigate("home", "darknet://home")}
          className="p-1.5 rounded-lg active:opacity-50 transition"
          style={{ color: url === "darknet://home" ? "#ff9500" : "#8e8e93" }}
          disabled={page === "home"}
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button
          className="p-1.5 rounded-lg active:opacity-50 transition opacity-40"
          style={{ color: "#8e8e93" }}
          disabled
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button
          onClick={() => navigate(page, url)}
          className="p-1.5 rounded-lg active:opacity-50 transition"
          style={{ color: "#8e8e93" }}
        >
          <RotateCw className="w-4 h-4" />
        </button>

        {/* 網址列 */}
        <div
          className="flex-1 flex items-center gap-1.5 px-3 py-1.5 rounded-full"
          style={{ background: "#2c2c2e" }}
        >
          <Lock className="w-3 h-3 shrink-0" style={{ color: "#34c759" }} />
          <span className="text-[12px] font-mono truncate" style={{ color: "#8e8e93" }}>
            {url}
          </span>
        </div>
      </div>

      {/* 頁面內容 */}
      <div className="flex-1 min-h-0 overflow-y-auto">
        {page === "home" && <HomePage onNavigate={navigate} riskLevel={riskLevel} darkCoin={darkCoin} />}
        {page === "phone-shop" && (
          <PhoneShopPage
            darkCoin={darkCoin}
            riskLevel={riskLevel}
            alias={alias}
            phoneNumber={phoneNumber}
            onBuyDrc={handleBuyWithDrc}
            onBuyAd={handleBuyWithAd}
            phonePrice={PHONE_PRICE}
          />
        )}
      </div>

      {/* 廣告彈窗 */}
      <AdModal
        visible={showAdModal}
        onComplete={handleAdComplete}
        onClose={() => setShowAdModal(false)}
      />

      {/* 購買結果 Toast */}
      <AnimatePresence>
        {showPurchaseResult && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="absolute bottom-4 left-4 right-4 z-50"
          >
            <div
              className="rounded-2xl p-4 backdrop-blur-xl"
              style={{
                background: showPurchaseResult.ok ? "rgba(48,209,88,0.15)" : "rgba(255,59,48,0.15)",
                border: `1px solid ${showPurchaseResult.ok ? "rgba(48,209,88,0.3)" : "rgba(255,59,48,0.3)"}`,
              }}
            >
              <div className="flex items-start gap-2.5">
                {showPurchaseResult.ok ? (
                  <Check className="w-5 h-5 shrink-0" style={{ color: "#30d158" }} />
                ) : (
                  <AlertTriangle className="w-5 h-5 shrink-0" style={{ color: "#ff3b30" }} />
                )}
                <p className="text-sm flex-1" style={{ color: "#fff" }}>
                  {showPurchaseResult.msg}
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 底部返回按鈕 */}
      <div
        className="px-3 py-2 shrink-0 flex items-center justify-between"
        style={{ background: "#1c1c1e", borderTop: "1px solid #2c2c2e" }}
      >
        <button
          onClick={onBack}
          className="text-[13px] font-medium active:opacity-50 transition"
          style={{ color: "#ff9500" }}
        >
          離開黑網
        </button>
        <span className="text-[10px] font-mono" style={{ color: "#48484a" }}>
          Tor Network · Encrypted
        </span>
      </div>
    </div>
  );
}

// === 黑網首頁 ===
function HomePage({
  onNavigate,
  riskLevel,
  darkCoin,
}: {
  onNavigate: (page: Page, url: string) => void;
  riskLevel: number;
  darkCoin: number;
}) {
  const services = [
    {
      id: "phone-shop",
      title: "免洗號碼商店",
      desc: "購買新電話號碼，清除風控記錄",
      icon: <Phone className="w-5 h-5" />,
      color: "#ff9500",
      url: "darknet://phone-shop",
      badge: riskLevel >= 80 ? "緊急" : undefined,
    },
    {
      id: "identity",
      title: "身份偽造服務",
      desc: "護照・身分證・銀行帳戶（即將推出）",
      icon: <User className="w-5 h-5" />,
      color: "#5856d6",
      url: "darknet://identity",
      disabled: true,
    },
    {
      id: "traffic",
      title: "流量黑市",
      desc: "低價購買大流量 SIM 卡（即將推出）",
      icon: <Globe className="w-5 h-5" />,
      color: "#5ac8fa",
      url: "darknet://traffic",
      disabled: true,
    },
  ];

  return (
    <div className="p-4">
      {/* 黑網 Logo */}
      <div className="text-center py-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-3"
          style={{ background: "linear-gradient(135deg, #1c1c1e 0%, #000 100%)", border: "1px solid #2c2c2e" }}
        >
          <Globe className="w-8 h-8" style={{ color: "#ff9500" }} />
        </div>
        <h1 className="text-xl font-bold mb-1" style={{ color: "#ff9500" }}>
          黑網
        </h1>
        <p className="text-[11px]" style={{ color: "#48484a" }}>
          DarkNet Marketplace · Tor Hidden Service
        </p>
      </div>

      {/* 風控警告 */}
      {riskLevel >= 60 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl p-3 mb-4"
          style={{
            background: riskLevel >= 80 ? "rgba(255,59,48,0.1)" : "rgba(255,149,0,0.1)",
            border: `1px solid ${riskLevel >= 80 ? "rgba(255,59,48,0.3)" : "rgba(255,149,0,0.3)"}`,
          }}
        >
          <div className="flex items-start gap-2">
            <ShieldAlert
              className="w-4 h-4 shrink-0 mt-0.5"
              style={{ color: riskLevel >= 80 ? "#ff3b30" : "#ff9500" }}
            />
            <div className="flex-1">
              <p className="text-[12px] font-semibold mb-0.5" style={{ color: riskLevel >= 80 ? "#ff3b30" : "#ff9500" }}>
                {riskLevel >= 80 ? "風控值危險！" : "風控值偏高"}
              </p>
              <p className="text-[11px] leading-relaxed" style={{ color: "#aeaeb2" }}>
                當前風控值 {riskLevel}/100。
                {riskLevel >= 80
                  ? "建議立即購買新號碼，避免被警方反詐專線標記。"
                  : "考慮購買新號碼以降低風險。"}
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* 服務列表 */}
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "#48484a" }}>
        熱門服務
      </p>

      <div className="space-y-2">
        {services.map((svc) => (
          <button
            key={svc.id}
            onClick={() => !svc.disabled && onNavigate(svc.id as Page, svc.url)}
            disabled={svc.disabled}
            className="w-full rounded-2xl p-3.5 flex items-center gap-3 transition active:scale-[0.98] disabled:opacity-40"
            style={{
              background: "#1c1c1e",
              border: "1px solid #2c2c2e",
            }}
          >
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: `${svc.color}20`, color: svc.color }}
            >
              {svc.icon}
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold" style={{ color: "#fff" }}>
                  {svc.title}
                </h3>
                {svc.badge && (
                  <span
                    className="px-1.5 py-0.5 rounded-full text-[9px] font-bold"
                    style={{ background: "#ff3b30", color: "#fff" }}
                  >
                    {svc.badge}
                  </span>
                )}
                {svc.disabled && (
                  <span className="text-[9px]" style={{ color: "#48484a" }}>
                    即將推出
                  </span>
                )}
              </div>
              <p className="text-[11px] mt-0.5 truncate" style={{ color: "#8e8e93" }}>
                {svc.desc}
              </p>
            </div>
          </button>
        ))}
      </div>

      {/* 餘額顯示 */}
      <div
        className="mt-4 rounded-2xl p-3 flex items-center justify-between"
        style={{ background: "#1c1c1e", border: "1px solid #2c2c2e" }}
      >
        <span className="text-[11px]" style={{ color: "#8e8e93" }}>
          你的錢包餘額
        </span>
        <span className="text-sm font-bold" style={{ color: "#bf5af2" }}>
          {darkCoin} DRC
        </span>
      </div>

      {/* 免責聲明 */}
      <p className="text-[9px] text-center mt-4 leading-relaxed" style={{ color: "#48484a" }}>
        本服務為遊戲模擬，所有交易均為虛擬。
        <br />
        現實中請勿從事任何違法活動。
      </p>
    </div>
  );
}

// === 免洗號碼商店頁面 ===
function PhoneShopPage({
  darkCoin,
  riskLevel,
  alias,
  phoneNumber,
  onBuyDrc,
  onBuyAd,
  phonePrice,
}: {
  darkCoin: number;
  riskLevel: number;
  alias: string;
  phoneNumber: string;
  onBuyDrc: () => void;
  onBuyAd: () => void;
  phonePrice: number;
}) {
  const [confirming, setConfirming] = useState<"drc" | "ad" | null>(null);
  const canAfford = darkCoin >= phonePrice;

  return (
    <div className="p-4">
      {/* 頁面標題 */}
      <div className="text-center py-4">
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-2"
          style={{ background: "rgba(255,149,0,0.1)" }}
        >
          <Phone className="w-7 h-7" style={{ color: "#ff9500" }} />
        </div>
        <h2 className="text-lg font-bold mb-1" style={{ color: "#fff" }}>
          免洗號碼商店
        </h2>
        <p className="text-[11px]" style={{ color: "#8e8e93" }}>
          購買新電話號碼（代號不變）
        </p>
      </div>

      {/* 當前狀態 */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{ background: "#1c1c1e", border: "1px solid #2c2c2e" }}
      >
        <p className="text-[10px] font-semibold uppercase tracking-wide mb-3" style={{ color: "#48484a" }}>
          當前身份
        </p>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-[12px]" style={{ color: "#8e8e93" }}>代號</span>
            <span className="text-[12px] font-mono" style={{ color: "#fff" }}>{alias}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[12px]" style={{ color: "#8e8e93" }}>電話號碼</span>
            <span className="text-[12px] font-mono" style={{ color: "#ff9500" }}>{phoneNumber}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[12px]" style={{ color: "#8e8e93" }}>風控值</span>
            <span
              className="text-[12px] font-bold"
              style={{ color: riskLevel >= 80 ? "#ff3b30" : riskLevel >= 60 ? "#ff9500" : "#34c759" }}
            >
              {riskLevel}/100
            </span>
          </div>
        </div>
      </div>

      {/* 購買方案 */}
      <div
        className="rounded-2xl p-4 mb-4"
        style={{
          background: "linear-gradient(135deg, rgba(255,149,0,0.1) 0%, rgba(255,107,0,0.05) 100%)",
          border: "1px solid rgba(255,149,0,0.3)",
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold" style={{ color: "#ff9500" }}>免洗號碼套餐</h3>
            <p className="text-[10px]" style={{ color: "#8e8e93" }}>全新身份 + 風控歸零</p>
          </div>
        </div>

        <div className="space-y-1.5 mb-4">
          {[
            "全新隨機電話號碼",
            "代號維持不變",
            "風控值重置為 0",
            "保留所有 DRC、流量、積分",
            "保留好友與情報",
          ].map((feature) => (
            <div key={feature} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 shrink-0" style={{ color: "#34c759" }} />
              <span className="text-[12px]" style={{ color: "#aeaeb2" }}>{feature}</span>
            </div>
          ))}
        </div>

        {/* 兩個購買按鈕 */}
        {!confirming ? (
          <div className="space-y-2">
            {/* DRC 購買 */}
            <button
              onClick={() => setConfirming("drc")}
              disabled={!canAfford}
              className="w-full py-3 rounded-xl text-sm font-bold active:scale-95 transition disabled:opacity-40 flex items-center justify-center gap-2"
              style={{
                background: canAfford ? "#ff9500" : "#2c2c2e",
                color: canAfford ? "#fff" : "#48484a",
              }}
            >
              <ShoppingCart className="w-4 h-4" />
              {canAfford ? `支付 ${phonePrice} DRC` : `DRC 不足（需 ${phonePrice}）`}
            </button>

            {/* 看廣告免費購買 */}
            <button
              onClick={() => setConfirming("ad")}
              className="w-full py-3 rounded-xl text-sm font-bold active:scale-95 transition flex items-center justify-center gap-2"
              style={{
                background: "rgba(0,122,255,0.15)",
                color: "#0a84ff",
                border: "1px solid rgba(0,122,255,0.3)",
              }}
            >
              <PlayCircle className="w-4 h-4" />
              看廣告免費領取
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <p className="text-[11px] text-center" style={{ color: confirming === "drc" ? "#ff9500" : "#0a84ff" }}>
              {confirming === "drc"
                ? `確認支付 ${phonePrice} DRC？`
                : "觀看 5 秒廣告後免費獲得新號碼？"}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium active:scale-95 transition"
                style={{ background: "#2c2c2e", color: "#8e8e93" }}
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (confirming === "drc") onBuyDrc();
                  else onBuyAd();
                  setConfirming(null);
                }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold active:scale-95 transition"
                style={{
                  background: confirming === "drc" ? "#34c759" : "#0a84ff",
                  color: "#fff",
                }}
              >
                確認
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 注意事項 */}
      <div
        className="rounded-2xl p-3"
        style={{ background: "rgba(255,149,0,0.05)", border: "1px solid rgba(255,149,0,0.15)" }}
      >
        <p className="text-[10px] leading-relaxed" style={{ color: "#8e8e93" }}>
          ⚠ 購買新號碼後，當前代號將被替換。已購買的情報、好友、對話記錄會保留，但風控值歸零。新號碼需重新建立信任。
        </p>
      </div>
    </div>
  );
}

// 廣告彈窗
function AdModal({
  visible,
  onComplete,
  onClose,
}: {
  visible: boolean;
  onComplete: () => void;
  onClose: () => void;
}) {
  const [countdown, setCountdown] = useState(5);
  const [completed, setCompleted] = useState(false);

  // 廣告倒數計時
  useEffect(() => {
    if (!visible) return;
    setCountdown(5);
    setCompleted(false);
    const timer = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          setCompleted(true);
          clearInterval(timer);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [visible]);

  if (!visible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="absolute inset-0 z-[60] bg-black flex flex-col items-center justify-center"
    >
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <div
          className="w-full max-w-xs aspect-video rounded-2xl flex flex-col items-center justify-center mb-4 relative overflow-hidden"
          style={{
            background: "linear-gradient(135deg, #1c1c1e 0%, #2c2c2e 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
          }}
        >
          <div className="text-5xl mb-3">📱</div>
          <p className="text-white text-lg font-bold mb-1">黑網 Pro</p>
          <p className="text-white/60 text-xs">無限免洗號碼・優先身份</p>
          {!completed && (
            <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center">
              <div className="text-white text-4xl font-bold mb-2">{countdown}</div>
              <p className="text-white/60 text-xs">廣告播放中...</p>
            </div>
          )}
        </div>
        <p className="text-white/40 text-[10px] text-center leading-relaxed">
          {completed ? "✓ 廣告播放完畢" : "觀看完整廣告後即可免費獲得新號碼"}
        </p>
      </div>
      <div className="px-6 py-4 border-t border-white/10 w-full">
        {completed ? (
          <button
            onClick={onComplete}
            className="w-full py-3 rounded-xl bg-emerald-500 text-white text-sm font-bold active:scale-95 transition"
          >
            領取新號碼
          </button>
        ) : (
          <button
            onClick={onClose}
            className="w-full py-3 rounded-xl text-sm font-medium"
            style={{ color: "rgba(255,255,255,0.3)" }}
          >
            廣告 · 剩餘 {countdown} 秒
          </button>
        )}
      </div>
    </motion.div>
  );
}

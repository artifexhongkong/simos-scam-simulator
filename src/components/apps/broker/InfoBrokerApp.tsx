"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Lock, CheckCircle2, Eye, Skull, Fingerprint, Copy, Check, Coins, ChevronUp, Zap, TrendingUp, RefreshCw } from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { NPCS, type NpcProfile } from "@/lib/game/npcs";

export function InfoBrokerApp({ onBack }: { onBack: () => void }) {
  const darkCoin = useGameStore((s) => s.darkCoin);
  const riskLevel = useGameStore((s) => s.riskLevel);
  const unlockedNpcIds = useGameStore((s) => s.unlockedNpcIds);
  const premiumNpcIds = useGameStore((s) => s.premiumNpcIds);
  const conversations = useGameStore((s) => s.conversations);
  const purchaseIntel = useGameStore((s) => s.purchaseIntel);
  const convertScamToCoin = useGameStore((s) => s.convertScamToCoin);
  const scamScore = useGameStore((s) => s.scamScore);
  const convertedAmount = useGameStore((s) => s.convertedAmount);
  const addTraffic = useGameStore((s) => s.addTraffic);
  const dataTraffic = useGameStore((s) => s.dataTraffic);

  const [activeNpc, setActiveNpc] = useState<NpcProfile | null>(null);
  const [purchasing, setPurchasing] = useState(false);
  const [showShop, setShowShop] = useState(false);
  const [shuffleKey, setShuffleKey] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  // 未知目標的「批次」索引：下拉刷新會輪換顯示不同的未知目標子集
  // 每批顯示 3 個未知 NPC，下拉刷新後換下一批（循環）
  const [unknownBatchIdx, setUnknownBatchIdx] = useState(0);
  const UNKNOWN_BATCH_SIZE = 3;

  // 每 15 秒隨機更換未知目標的 emoji
  useEffect(() => {
    const id = setInterval(() => setShuffleKey(k => k + 1), 15000);
    return () => clearInterval(id);
  }, []);

  // 下拉刷新
  const scrollRef = useRef<HTMLDivElement>(null);
  const touchStartY = useRef(0);
  const [pullDistance, setPullDistance] = useState(0);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      touchStartY.current = e.touches[0].clientY;
    }
  }, []);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (touchStartY.current === 0) return;
    const diff = e.touches[0].clientY - touchStartY.current;
    if (diff > 0 && scrollRef.current && scrollRef.current.scrollTop === 0) {
      setPullDistance(Math.min(diff * 0.5, 80));
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    if (pullDistance > 60) {
      setRefreshing(true);
      // 實際刷新：輪換未知目標批次 + 重設 emoji shuffleKey
      setUnknownBatchIdx(idx => idx + 1);
      setShuffleKey(k => k + 1);
      setTimeout(() => setRefreshing(false), 800);
    }
    setPullDistance(0);
    touchStartY.current = 0;
  }, [pullDistance]);

  // 隨機未知目標的 emoji
  const unknownEmojis = ["🔒", "❓", "👤", "🎭", "🕵️", "💀", "🫥", "🔇"];
  const getUnknownEmoji = (npcId: string) => {
    const seed = npcId.charCodeAt(0) + shuffleKey;
    return unknownEmojis[seed % unknownEmojis.length];
  };

  const priceMultiplier = 1 + (riskLevel / 100);

  const handleBuy = (npc: NpcProfile, premium: boolean) => {
    setPurchasing(true);
    setTimeout(() => {
      const ok = purchaseIntel(npc.id, premium);
      setPurchasing(false);
      if (ok) setActiveNpc(npc);
    }, 600);
  };

  const convertibleCoin = Math.floor((scamScore - convertedAmount) / 1000) * 10;

  const cardBg = "var(--im-bubble-npc-bg)";
  const cardBorder = "var(--im-header-border)";
  const textMain = "var(--im-header-text)";
  const textSub = "var(--im-bubble-system-text)";

  return (
    <div className="h-full min-h-0 flex flex-col overflow-hidden" style={{ background: "var(--im-bg)" }}>
      {/* iOS 風格導航欄 */}
      <div className="flex items-center px-2 py-2 border-b backdrop-blur-xl shrink-0" style={{ background: "var(--im-header-bg)", borderColor: cardBorder }}>
        <button onClick={onBack} className="flex items-center gap-1 text-[17px] font-normal px-1 active:opacity-50 transition" style={{ color: "var(--im-link-text)" }}>
          <ChevronUp className="w-5 h-5 rotate-[-90deg]" /><span>返回</span>
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold pr-12" style={{ color: textMain }}>情報販子</h2>
      </div>

      {/* 暗網幣 + 風控值 banner */}
      <div className="px-4 py-2 border-b shrink-0 flex items-center justify-between" style={{ background: "var(--im-header-bg)", borderColor: cardBorder }}>
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4" style={{ color: "#bf5af2" }} />
          <span className="text-sm font-bold" style={{ color: "#bf5af2" }}>{darkCoin}</span>
          <span className="text-[10px]" style={{ color: textSub }}>DRC</span>
        </div>
        {riskLevel > 0 && (
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-full" style={{ background: riskLevel > 60 ? "rgba(255,59,48,0.1)" : riskLevel > 30 ? "rgba(255,149,0,0.1)" : "rgba(52,199,89,0.1)" }}>
            <span className="text-[10px]" style={{ color: riskLevel > 60 ? "#ff3b30" : riskLevel > 30 ? "#ff9500" : "#34c759" }}>
              風控 {riskLevel}% {riskLevel > 0 && `(情報+${Math.round(priceMultiplier * 100 - 100)}%)`}
            </span>
          </div>
        )}
        <button onClick={() => setShowShop(!showShop)} className="text-[11px] font-medium active:scale-95" style={{ color: "var(--im-link-text)" }}>
          補給站
        </button>
      </div>

      {/* 補給站面板 */}
      <AnimatePresence>
        {showShop && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden shrink-0" style={{ background: "var(--im-header-bg)", borderBottom: `1px solid ${cardBorder}` }}>
            <div className="p-3 space-y-2">
              <p className="text-[11px] font-semibold" style={{ color: textSub }}>補給站</p>
              <button
                onClick={() => { if (darkCoin >= 30) { addTraffic(2000); useGameStore.setState((s) => ({ darkCoin: s.darkCoin - 30 })); } }}
                disabled={darkCoin < 30}
                className="w-full flex items-center justify-between p-2.5 rounded-lg active:scale-95 transition disabled:opacity-40"
                style={{ background: cardBg }}
              >
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4" style={{ color: "#5ac8fa" }} />
                  <div className="text-left">
                    <p className="text-xs font-medium" style={{ color: textMain }}>免洗 SIM 卡（+2GB）</p>
                    <p className="text-[10px]" style={{ color: textSub }}>補充流量，避免號碼被封</p>
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: "#bf5af2" }}>30 DRC</span>
              </button>
              <button
                onClick={() => { convertScamToCoin(); }}
                disabled={convertibleCoin <= 0}
                className="w-full flex items-center justify-between p-2.5 rounded-lg active:scale-95 transition disabled:opacity-40"
                style={{ background: cardBg }}
              >
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" style={{ color: "#34c759" }} />
                  <div className="text-left">
                    <p className="text-xs font-medium" style={{ color: textMain }}>洗錢兌換（$1000 → 10 DRC）</p>
                    <p className="text-[10px]" style={{ color: textSub }}>可兌換 {convertibleCoin} DRC</p>
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: "#34c759" }}>兌換</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 目標列表 - 已完成(成功/封鎖/警覺)的移除，已購買的往上排，支援下拉刷新 */}
      <div
        ref={scrollRef}
        className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3 scroll-safe-bottom"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 下拉刷新指示器 */}
        {(pullDistance > 0 || refreshing) && (
          <div className="flex items-center justify-center py-2" style={{ height: refreshing ? 40 : pullDistance }}>
            <RefreshCw
              className={`w-5 h-5 ${refreshing ? "animate-spin" : ""}`}
              style={{ color: textSub, transform: `rotate(${pullDistance * 3}deg)` }}
            />
            <span className="ml-2 text-[11px]" style={{ color: textSub }}>
              {refreshing ? "刷新中..." : pullDistance > 60 ? "鬆開刷新" : "下拉刷新"}
            </span>
          </div>
        )}

        <p className="text-xs px-1" style={{ color: textSub }}>可購買的情報（風控值影響價格·下拉刷新輪換未知目標）</p>

        {/* 已解鎖的 NPC（已購買情報）：固定顯示在上方 */}
        {NPCS
          .filter((npc) => {
            // 移除已成功詐騙、被封鎖、警覺終止的 NPC
            const conv = conversations[npc.id];
            if (conv?.status === "succeeded") return false;
            if (conv?.status === "blocked") return false;
            if (conv?.status === "cautious") return false;
            return unlockedNpcIds.includes(npc.id); // 只顯示已解鎖的
          })
          .map((npc) => {
          const unlocked = unlockedNpcIds.includes(npc.id);
          const premium = premiumNpcIds.includes(npc.id);
          const basePrice = npc.price;
          const premiumPrice = npc.price * 2;
          const actualBase = Math.ceil(basePrice * priceMultiplier);
          const actualPremium = Math.ceil(premiumPrice * priceMultiplier);
          const canAffordBase = darkCoin >= actualBase;
          const canAffordPremium = darkCoin >= actualPremium && unlocked;

          return (
            <div key={npc.id} className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
              <div className="p-3 flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 relative" style={{ background: "var(--im-input-bg)" }}>
                  {unlocked ? npc.avatar : (
                    <>
                      <span className="opacity-40">{getUnknownEmoji(npc.id)}</span>
                      <div className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                        <Lock className="w-5 h-5" style={{ color: textSub }} />
                      </div>
                    </>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-semibold" style={{ color: textMain }}>{unlocked ? npc.displayName : "未知目標"}</h4>
                    {unlocked && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1" style={{ background: "rgba(52,199,89,0.15)", color: "#34c759" }}><CheckCircle2 className="w-2.5 h-2.5" /> 已解鎖</span>}
                    {premium && <span className="px-1.5 py-0.5 rounded-full text-[9px] font-medium flex items-center gap-1" style={{ background: "rgba(255,149,0,0.15)", color: "#ff9500" }}><Zap className="w-2.5 h-2.5" /> 精準有料</span>}
                  </div>
                  {unlocked ? (
                    <p className="text-xs mt-0.5 truncate" style={{ color: textSub }}>{npc.background.slice(0, 40)}...</p>
                  ) : (
                    <p className="text-xs mt-0.5" style={{ color: textSub }}>特質：{npc.hookTags.slice(0, 2).join("・")}</p>
                  )}
                </div>
              </div>

              <div className="px-3 pb-3 flex gap-2">
                {!unlocked ? (
                  <button
                    onClick={() => handleBuy(npc, false)}
                    disabled={!canAffordBase || purchasing}
                    className="flex-1 py-2 rounded-lg text-xs font-medium active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                    style={{ background: canAffordBase ? "#bf5af2" : "var(--im-input-bg)", color: canAffordBase ? "#fff" : textSub }}
                  >
                    <Coins className="w-3.5 h-3.5" /> 普通料子 ({actualBase} DRC)
                  </button>
                ) : !premium ? (
                  <button
                    onClick={() => handleBuy(npc, true)}
                    disabled={!canAffordPremium || purchasing}
                    className="flex-1 py-2 rounded-lg text-xs font-medium active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                    style={{ background: canAffordPremium ? "#ff9500" : "var(--im-input-bg)", color: canAffordPremium ? "#fff" : textSub }}
                  >
                    <Zap className="w-3.5 h-3.5" /> 精準有料 ({actualPremium} DRC)
                  </button>
                ) : (
                  <button onClick={() => setActiveNpc(npc)} className="flex-1 py-2 rounded-lg text-xs font-medium active:scale-95 transition flex items-center justify-center gap-1.5" style={{ background: "var(--im-input-bg)", color: textMain }}>
                    <Eye className="w-3.5 h-3.5" /> 查看情報
                  </button>
                )}
                {unlocked && <button onClick={() => setActiveNpc(npc)} className="px-3 py-2 rounded-lg text-xs font-medium active:scale-95 transition" style={{ background: "var(--im-input-bg)", color: textMain }}><Eye className="w-3.5 h-3.5" /></button>}
              </div>
            </div>
          );
        })}

        {/* 未知目標分隔提示（下拉刷新會輪換此區塊的未知 NPC） */}
        {(() => {
          const unknownCount = NPCS.filter((npc) => {
            const conv = conversations[npc.id];
            if (conv?.status === "succeeded") return false;
            if (conv?.status === "blocked") return false;
            if (conv?.status === "cautious") return false;
            return !unlockedNpcIds.includes(npc.id);
          }).length;
          const totalBatches = Math.max(1, Math.ceil(unknownCount / UNKNOWN_BATCH_SIZE));
          const currentBatch = (unknownBatchIdx % totalBatches) + 1;
          return (
            <div className="flex items-center gap-2 px-1 pt-2" style={{ color: textSub }}>
              <div className="flex-1 h-px" style={{ background: "var(--im-header-border)" }} />
              <span className="text-[10px]">未知目標 · 第 {currentBatch}/{totalBatches} 批 · 下拉刷新輪換</span>
              <div className="flex-1 h-px" style={{ background: "var(--im-header-border)" }} />
            </div>
          );
        })()}

        {/* 未知目標（尚未購買情報）：每批顯示 3 個，下拉刷新輪換 */}
        {(() => {
          const unknownNpcs = NPCS.filter((npc) => {
            const conv = conversations[npc.id];
            if (conv?.status === "succeeded") return false;
            if (conv?.status === "blocked") return false;
            if (conv?.status === "cautious") return false;
            return !unlockedNpcIds.includes(npc.id);
          });

          if (unknownNpcs.length === 0) {
            return (
              <div className="text-center py-6 text-xs" style={{ color: textSub }}>
                已掌握所有目標的情報
              </div>
            );
          }

          // 用 unknownBatchIdx 作為種子做偽隨機排序
          // 只在用戶下拉刷新時變化（每 15 秒的自動 emoji 刷新不影響 NPC 順序，避免畫面跳動）
          const seed = unknownBatchIdx * 31;
          const shuffled = [...unknownNpcs].sort((a, b) => {
            const ha = (a.id.charCodeAt(0) * 17 + a.id.charCodeAt(a.id.length - 1) * 13 + seed) % 97;
            const hb = (b.id.charCodeAt(0) * 17 + b.id.charCodeAt(b.id.length - 1) * 13 + seed) % 97;
            return ha - hb;
          });

          // 計算當前批次的起始位置（循環輪換）
          const totalBatches = Math.max(1, Math.ceil(shuffled.length / UNKNOWN_BATCH_SIZE));
          const currentBatch = unknownBatchIdx % totalBatches;
          const startIdx = currentBatch * UNKNOWN_BATCH_SIZE;
          const visibleNpcs = shuffled.slice(startIdx, startIdx + UNKNOWN_BATCH_SIZE);

          return visibleNpcs.map((npc) => {
            const basePrice = npc.price;
            const actualBase = Math.ceil(basePrice * priceMultiplier);
            const canAffordBase = darkCoin >= actualBase;

            return (
              <div key={`${npc.id}-${unknownBatchIdx}`} className="rounded-2xl overflow-hidden" style={{ background: cardBg, border: `1px solid ${cardBorder}` }}>
                <div className="p-3 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl shrink-0 relative" style={{ background: "var(--im-input-bg)" }}>
                    <span className="opacity-40">{getUnknownEmoji(npc.id)}</span>
                    <div className="absolute inset-0 rounded-2xl bg-black/50 backdrop-blur-[2px] flex items-center justify-center">
                      <Lock className="w-5 h-5" style={{ color: textSub }} />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold" style={{ color: textMain }}>未知目標</h4>
                    </div>
                    <p className="text-xs mt-0.5" style={{ color: textSub }}>特質：{npc.hookTags.slice(0, 2).join("・")}</p>
                  </div>
                </div>

                <div className="px-3 pb-3 flex gap-2">
                  <button
                    onClick={() => handleBuy(npc, false)}
                    disabled={!canAffordBase || purchasing}
                    className="flex-1 py-2 rounded-lg text-xs font-medium active:scale-95 transition flex items-center justify-center gap-1.5 disabled:opacity-40"
                    style={{ background: canAffordBase ? "#bf5af2" : "var(--im-input-bg)", color: canAffordBase ? "#fff" : textSub }}
                  >
                    <Coins className="w-3.5 h-3.5" /> 普通料子 ({actualBase} DRC)
                  </button>
                </div>
              </div>
            );
          });
        })()}
      </div>

      <AnimatePresence>
        {activeNpc && <IntelDetailModal npc={activeNpc} premium={premiumNpcIds.includes(activeNpc.id)} onClose={() => setActiveNpc(null)} />}
      </AnimatePresence>
    </div>
  );
}

function IntelDetailModal({ npc, premium, onClose }: { npc: NpcProfile; premium: boolean; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const textMain = "var(--im-header-text)";
  const textSub = "var(--im-bubble-system-text)";

  const copyId = async () => {
    try {
      await navigator.clipboard.writeText(npc.telechatId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {}
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} className="absolute inset-0 z-40 bg-black/80 backdrop-blur-sm flex items-end md:items-center justify-center p-3">
      <motion.div initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }} transition={{ type: "spring", stiffness: 300, damping: 30 }} onClick={(e) => e.stopPropagation()} className="w-full rounded-3xl border overflow-hidden max-h-[85%] flex flex-col" style={{ background: "var(--im-header-bg)", borderColor: "var(--im-header-border)" }}>
        <div className="p-5 border-b" style={{ borderColor: "var(--im-header-border)" }}>
          <div className="flex items-center gap-3">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-4xl" style={{ background: "var(--im-bubble-npc-bg)" }}>{npc.avatar}</div>
            <div>
              <h3 className="text-lg font-bold" style={{ color: textMain }}>{npc.displayName}</h3>
              <p className="text-xs" style={{ color: textSub }}>年齡 {npc.age} 歲{premium ? " · 精準有料" : " · 普通料子"}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-4 overflow-y-auto">
          <div className="rounded-xl p-3" style={{ background: "var(--im-bubble-npc-bg)" }}>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: textSub }}>TeleChat ID（用於加好友）</p>
            <div className="flex items-center justify-between gap-2">
              <code className="text-sm font-mono break-all flex-1" style={{ color: "#bf5af2" }}>{npc.telechatId}</code>
              <button onClick={copyId} className={`shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium transition active:scale-95 flex items-center gap-1.5 ${copied ? "bg-emerald-500 text-white" : ""}`} style={!copied ? { background: "var(--im-input-bg)", color: textMain } : {}}>
                {copied ? <><Check className="w-3.5 h-3.5" /> 已複製</> : <><Copy className="w-3.5 h-3.5" /> 複製</>}
              </button>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: textSub }}>背景調查</p>
            <p className="text-sm leading-relaxed" style={{ color: textMain }}>{npc.background}</p>
          </div>
          <div>
            <p className="text-[10px] font-medium uppercase tracking-wide mb-2" style={{ color: textSub }}>可利用特質</p>
            <div className="flex flex-wrap gap-1.5">
              {npc.hookTags.map((tag) => (
                <span key={tag} className="px-2.5 py-1 rounded-full text-[11px] font-medium" style={{ background: "rgba(255,149,0,0.1)", border: "1px solid rgba(255,149,0,0.2)", color: "#ff9500" }}>{tag}</span>
              ))}
            </div>
          </div>
          {premium && (
            <div className="rounded-xl p-3" style={{ background: "rgba(255,149,0,0.08)", border: "1px solid rgba(255,149,0,0.2)" }}>
              <p className="text-[10px] font-medium uppercase tracking-wide mb-1.5" style={{ color: "#ff9500" }}>🔓 精準有料 · 核心痛點</p>
              <p className="text-sm leading-relaxed" style={{ color: textMain }}>{npc.hiddenPersonality}</p>
              <p className="text-[10px] mt-2" style={{ color: textSub }}>💡 在對話中踩中這些痛點，詐騙成功率大幅提升</p>
            </div>
          )}
          {!premium && (
            <div className="rounded-xl p-3" style={{ background: "rgba(255,149,0,0.05)", border: "1px solid rgba(255,149,0,0.15)" }}>
              <p className="text-[10px] flex items-center gap-1" style={{ color: "#ff9500" }}><Zap className="w-3 h-3" /> 購買「精準有料」可解鎖核心痛點，提升詐騙成功率</p>
            </div>
          )}
        </div>
        <div className="p-4 border-t" style={{ borderColor: "var(--im-header-border)" }}>
          <button onClick={onClose} className="w-full py-3 rounded-xl text-sm font-semibold active:scale-95 transition" style={{ background: "var(--im-link-text)", color: "#fff" }}>知道了，去 TeleChat 加好友</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

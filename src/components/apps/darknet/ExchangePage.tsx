"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, Coins, X, Check, AlertTriangle, Search } from "lucide-react";

export interface DrcSeller {
  id: string;
  name: string;
  avatar: string;
  baseRate: number; // 每 $100 → baseRate DRC
  desc: string;
  minAmount: number; // 最低交易金額 $
}

// 12 名賣家，不同匯率、最低金額、庫存
const SELLER_TEMPLATES: DrcSeller[] = [
  { id: "s1", name: "老王", avatar: "🧓", baseRate: 0.8, desc: "老實人，匯率低但穩定", minAmount: 100 },
  { id: "s2", name: "蛇頭", avatar: "🐍", baseRate: 1.0, desc: "地下錢莊龍頭", minAmount: 500 },
  { id: "s3", name: "鬼影", avatar: "👻", baseRate: 1.5, desc: "神秘中間商，高匯率大單", minAmount: 5000 },
  { id: "s4", name: "加密哥", avatar: "🤖", baseRate: 1.2, desc: "加密貨幣洗錢，到帳快", minAmount: 1000 },
  { id: "s5", name: "阿彪", avatar: "🐯", baseRate: 0.9, desc: "東南亞管道，量大從優", minAmount: 300 },
  { id: "s6", name: "暗影", avatar: "🌑", baseRate: 1.1, desc: "專業洗錢團隊", minAmount: 800 },
  { id: "s7", name: "金牙", avatar: "🦷", baseRate: 1.3, desc: "香港地下銀行", minAmount: 2000 },
  { id: "s8", name: "零號", avatar: "0️⃣", baseRate: 0.7, desc: "新手洗錢，匯率低無門檻", minAmount: 50 },
  { id: "s9", name: "毒蛛", avatar: "🕷️", baseRate: 1.4, desc: "高風險高回報", minAmount: 3000 },
  { id: "s10", name: "快閃", avatar: "⚡", baseRate: 1.05, desc: "快速到帳，匯率中等", minAmount: 200 },
  { id: "s11", name: "鑽石", avatar: "💎", baseRate: 1.25, desc: "高端客戶專屬", minAmount: 1500 },
  { id: "s12", name: "幽靈", avatar: "🌫️", baseRate: 1.6, desc: "最高匯率，但只收超大單", minAmount: 10000 },
];

interface ActiveSeller extends DrcSeller {
  currentRate: number; // 當前匯率（每次進入隨機波動）
  stock: number; // 剩餘 DRC 庫存
}

function generateSellers(): ActiveSeller[] {
  return SELLER_TEMPLATES.map((s) => {
    // 匯率隨機波動 ±15%
    const fluctuation = (Math.random() - 0.5) * 0.3;
    const currentRate = Math.round((s.baseRate * (1 + fluctuation)) * 100) / 100;
    // 庫存隨機 50-500 DRC
    const stock = Math.floor(Math.random() * 450) + 50;
    return { ...s, currentRate, stock };
  }).sort((a, b) => a.currentRate - b.currentRate); // 按匯率排序
}

export function ExchangePage({
  scamScore,
  convertedAmount,
  darkCoin,
  onExchange,
}: {
  scamScore: number;
  convertedAmount: number;
  darkCoin: number;
  onExchange: (amount: number, rate: number, sellerId: string) => { ok: boolean; error?: string; drcGained?: number };
}) {
  const available = scamScore - convertedAmount;
  const [sellers, setSellers] = useState<ActiveSeller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<ActiveSeller | null>(null);
  const [inputAmount, setInputAmount] = useState("");
  const [quickDrc, setQuickDrc] = useState(""); // 頂部快速購買 DRC 數量
  const [quickMinRate, setQuickMinRate] = useState(""); // 最低匯率篩選
  const [resultMsg, setResultMsg] = useState<{ ok: boolean; msg: string } | null>(null);

  // 每次進入時生成新賣家列表（匯率 + 庫存隨機）
  useEffect(() => {
    setSellers(generateSellers());
  }, []);

  const flashResult = (ok: boolean, msg: string) => {
    setResultMsg({ ok, msg });
    setTimeout(() => setResultMsg(null), 4000);
  };

  // 快速購買：按 DRC 數量 + 匯率下限自動找賣家
  const handleQuickBuy = () => {
    const targetDrc = parseInt(quickDrc, 10);
    if (isNaN(targetDrc) || targetDrc <= 0) {
      flashResult(false, "請輸入有效的 DRC 數量");
      return;
    }

    const minRate = parseFloat(quickMinRate) || 0;

    let remainingDrc = targetDrc;
    let totalCost = 0;
    const transactions: { seller: ActiveSeller; drc: number; cost: number }[] = [];

    // 按匯率從高到低排序（先找匯率好的），只選符合匯率下限的
    const sortedSellers = [...sellers]
      .filter((s) => s.currentRate >= minRate)
      .sort((a, b) => b.currentRate - a.currentRate);

    if (sortedSellers.length === 0) {
      flashResult(false, `沒有匯率 ≥ ${minRate}x 的賣家`);
      return;
    }

    for (const seller of sortedSellers) {
      if (remainingDrc <= 0) break;
      const availableStock = Math.min(remainingDrc, seller.stock);
      if (availableStock <= 0) continue;
      // 計算需要花多少 $
      const cost = Math.ceil((availableStock / seller.currentRate) * 100);
      if (cost + totalCost > available) {
        // 剩餘金額不夠，計算能買多少
        const remainingMoney = available - totalCost;
        const maxDrc = Math.floor((remainingMoney * seller.currentRate) / 100);
        if (maxDrc <= 0) continue;
        const actualCost = Math.ceil((maxDrc / seller.currentRate) * 100);
        if (actualCost < seller.minAmount) continue;
        transactions.push({ seller, drc: maxDrc, cost: actualCost });
        remainingDrc -= maxDrc;
        totalCost += actualCost;
        break;
      }
      if (cost < seller.minAmount) continue;
      transactions.push({ seller, drc: availableStock, cost });
      remainingDrc -= availableStock;
      totalCost += cost;
    }

    if (remainingDrc > 0) {
      flashResult(false, `符合條件的賣家庫存不足，還差 ${remainingDrc} DRC`);
      return;
    }

    // 執行交易
    let totalDrcGained = 0;
    for (const tx of transactions) {
      const result = onExchange(tx.cost, tx.seller.currentRate, tx.seller.id);
      if (!result.ok) {
        flashResult(false, result.error || "交易失敗");
        return;
      }
      totalDrcGained += result.drcGained || 0;
      // 減少賣家庫存
      setSellers((prev) => prev.map((s) => s.id === tx.seller.id ? { ...s, stock: s.stock - tx.drc } : s));
    }

    flashResult(true, `成功購買 ${totalDrcGained} DRC，花費 $${totalCost.toLocaleString()}（${transactions.length} 筆交易）`);
    setQuickDrc("");
  };

  // 預估快速購買成本
  const quickBuyEstimate = useMemo(() => {
    const targetDrc = parseInt(quickDrc, 10);
    if (isNaN(targetDrc) || targetDrc <= 0) return null;
    const minRate = parseFloat(quickMinRate) || 0;
    const eligible = [...sellers].filter((s) => s.currentRate >= minRate).sort((a, b) => b.currentRate - a.currentRate);
    let remaining = targetDrc;
    let totalCost = 0;
    for (const seller of eligible) {
      if (remaining <= 0) break;
      const buy = Math.min(remaining, seller.stock);
      const cost = Math.ceil((buy / seller.currentRate) * 100);
      totalCost += cost;
      remaining -= buy;
    }
    if (remaining > 0) return { cost: totalCost, insufficient: true, remaining };
    return { cost: totalCost, insufficient: false };
  }, [quickDrc, quickMinRate, sellers]);

  // 單獨購買（移除最低金額限制）
  const handleSingleBuy = () => {
    if (!selectedSeller) return;
    const amount = parseInt(inputAmount.replace(/[^0-9]/g, ""), 10);
    if (isNaN(amount) || amount <= 0) return;
    if (amount > available) {
      flashResult(false, `可用金額不足（$${available.toLocaleString()}）`);
      return;
    }

    const maxDrc = Math.floor((amount * selectedSeller.currentRate) / 100);
    if (maxDrc <= 0) {
      flashResult(false, `金額太少，至少需要 $${Math.ceil(100 / selectedSeller.currentRate)}`);
      return;
    }
    if (maxDrc > selectedSeller.stock) {
      flashResult(false, `${selectedSeller.name} 庫存不足（剩 ${selectedSeller.stock} DRC）`);
      return;
    }

    const result = onExchange(amount, selectedSeller.currentRate, selectedSeller.id);
    if (result.ok) {
      flashResult(true, `兌換成功！$${amount.toLocaleString()} → ${result.drcGained} DRC`);
      setSellers((prev) => prev.map((s) => s.id === selectedSeller.id ? { ...s, stock: s.stock - (result.drcGained || 0) } : s));
      setInputAmount("");
      setSelectedSeller(null);
    } else {
      flashResult(false, result.error || "兌換失敗");
    }
  };

  return (
    <div className="p-4">
      {/* 標題 */}
      <div className="text-center py-3">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-2" style={{ background: "rgba(52,199,89,0.1)" }}>
          <TrendingUp className="w-6 h-6" style={{ color: "#34c759" }} />
        </div>
        <h2 className="text-base font-bold" style={{ color: "#fff" }}>暗網外匯</h2>
        <p className="text-[10px]" style={{ color: "#8e8e93" }}>匯率即時波動・庫存有限</p>
      </div>

      {/* 餘額 */}
      <div className="rounded-2xl p-3 mb-3" style={{ background: "#1c1c1e", border: "1px solid #2c2c2e" }}>
        <div className="flex justify-between mb-1">
          <span className="text-[11px]" style={{ color: "#8e8e93" }}>可用金額</span>
          <span className="text-[13px] font-bold" style={{ color: "#34c759" }}>${available.toLocaleString()}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[11px]" style={{ color: "#8e8e93" }}>DRC 餘額</span>
          <span className="text-[13px] font-bold" style={{ color: "#bf5af2" }}>{darkCoin} DRC</span>
        </div>
      </div>

      {/* 快速購買 DRC */}
      <div className="rounded-2xl p-3 mb-3" style={{ background: "rgba(0,122,255,0.08)", border: "1px solid rgba(0,122,255,0.2)" }}>
        <p className="text-[10px] font-semibold mb-2" style={{ color: "#0a84ff" }}>⚡ 快速購買 DRC</p>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={quickDrc}
            onChange={(e) => setQuickDrc(e.target.value.replace(/[^0-9]/g, ""))}
            placeholder="DRC 數量"
            className="flex-1 px-3 py-2 rounded-xl text-sm focus:outline-none"
            style={{ background: "#2c2c2e", color: "#fff", border: "1px solid #3c3c3e" }}
          />
          <input
            type="text"
            value={quickMinRate}
            onChange={(e) => setQuickMinRate(e.target.value.replace(/[^0-9.]/g, ""))}
            placeholder="最低匯率"
            className="w-[80px] px-3 py-2 rounded-xl text-sm focus:outline-none text-center"
            style={{ background: "#2c2c2e", color: "#fff", border: "1px solid #3c3c3e" }}
          />
          <button
            onClick={handleQuickBuy}
            disabled={!quickDrc}
            className="px-4 py-2 rounded-xl text-sm font-bold active:scale-95 transition disabled:opacity-40"
            style={{ background: "#0a84ff", color: "#fff" }}
          >
            購買
          </button>
        </div>
        {/* 預估成本 */}
        {quickBuyEstimate && (
          <div className="rounded-xl p-2 mb-1" style={{ background: "rgba(0,122,255,0.1)" }}>
            {quickBuyEstimate.insufficient ? (
              <p className="text-[10px]" style={{ color: "#ff9500" }}>
                ⚠ 預估 $${quickBuyEstimate.cost.toLocaleString()}，但賣家庫存不足（差 {quickBuyEstimate.remaining} DRC）
              </p>
            ) : (
              <div className="flex justify-between text-[10px]">
                <span style={{ color: "#8e8e93" }}>預估花費</span>
                <span style={{ color: "#0a84ff" }}>$${quickBuyEstimate.cost.toLocaleString()}</span>
              </div>
            )}
          </div>
        )}
        <p className="text-[9px]" style={{ color: "#8e8e93" }}>
          輸入 DRC 數量 + 最低匯率，系統自動從最優賣家開始購買
        </p>
      </div>

      {/* 賣家列表 */}
      <p className="text-[10px] font-semibold uppercase tracking-wide mb-2 px-1" style={{ color: "#48484a" }}>
        賣家列表（{sellers.length} 名）
      </p>

      <div className="space-y-2 mb-4">
        {sellers.map((seller) => {
          const maxDrc = Math.floor((available * seller.currentRate) / 100);
          const canBuy = available > 0 && seller.stock > 0 && maxDrc > 0;
          const lowStock = seller.stock < 50;
          return (
            <button
              key={seller.id}
              onClick={() => canBuy ? setSelectedSeller(seller) : null}
              disabled={!canBuy}
              className="w-full rounded-2xl p-3 flex items-center gap-3 transition active:scale-[0.98] disabled:opacity-30"
              style={{
                background: "#1c1c1e",
                border: "1px solid #2c2c2e",
              }}
            >
              <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl shrink-0" style={{ background: "#2c2c2e" }}>
                {seller.avatar}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-[13px] font-semibold" style={{ color: "#fff" }}>{seller.name}</span>
                  <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(52,199,89,0.15)", color: "#34c759" }}>
                    {seller.currentRate}x
                  </span>
                  {lowStock && (
                    <span className="px-1 py-0.5 rounded text-[8px] font-bold" style={{ background: "rgba(255,149,0,0.15)", color: "#ff9500" }}>
                      低庫存
                    </span>
                  )}
                </div>
                <p className="text-[10px] mt-0.5" style={{ color: "#8e8e93" }}>{seller.desc}</p>
                <div className="flex gap-3 mt-0.5">
                  <span className="text-[9px]" style={{ color: "#bf5af2" }}>庫存 {seller.stock} DRC</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* 結果提示 */}
      <AnimatePresence>
        {resultMsg && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-20 left-4 right-4 z-50"
          >
            <div className="rounded-2xl p-3 backdrop-blur-xl" style={{
              background: resultMsg.ok ? "rgba(48,209,88,0.15)" : "rgba(255,59,48,0.15)",
              border: `1px solid ${resultMsg.ok ? "rgba(48,209,88,0.3)" : "rgba(255,59,48,0.3)"}`,
            }}>
              <div className="flex items-center gap-2">
                {resultMsg.ok ? <Check className="w-4 h-4 shrink-0" style={{ color: "#30d158" }} /> : <AlertTriangle className="w-4 h-4 shrink-0" style={{ color: "#ff3b30" }} />}
                <p className="text-xs flex-1" style={{ color: resultMsg.ok ? "#30d158" : "#ff3b30" }}>{resultMsg.msg}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 單獨購買彈窗 */}
      <AnimatePresence>
        {selectedSeller && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setSelectedSeller(null); setInputAmount(""); }}
            className="absolute inset-0 z-[60] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="rounded-3xl border p-5 max-w-[300px] w-full"
              style={{ background: "#1c1c1e", borderColor: "#2c2c2e" }}
            >
              {/* 賣家資訊 */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: "#2c2c2e" }}>
                  {selectedSeller.avatar}
                </div>
                <div>
                  <h3 className="text-base font-bold" style={{ color: "#fff" }}>{selectedSeller.name}</h3>
                  <p className="text-[11px]" style={{ color: "#8e8e93" }}>
                    匯率 {selectedSeller.currentRate}x ・ 庫存 {selectedSeller.stock} DRC
                  </p>
                </div>
                <button onClick={() => { setSelectedSeller(null); setInputAmount(""); }} className="ml-auto p-1">
                  <X className="w-5 h-5" style={{ color: "#8e8e93" }} />
                </button>
              </div>

              {/* 輸入金額 */}
              <p className="text-[11px] mb-2" style={{ color: "#8e8e93" }}>
                輸入要兌換的金額
              </p>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[14px]" style={{ color: "#8e8e93" }}>$</span>
                <input
                  type="text"
                  value={inputAmount}
                  onChange={(e) => setInputAmount(e.target.value.replace(/[^0-9]/g, ""))}
                  placeholder={available > 0 ? available.toLocaleString() : "0"}
                  autoFocus
                  className="flex-1 px-3 py-2.5 rounded-xl text-sm focus:outline-none"
                  style={{ background: "#2c2c2e", color: "#fff", border: "1px solid #3c3c3e" }}
                />
              </div>

              {/* 預覽 */}
              {inputAmount && (
                <div className="rounded-xl p-2.5 mb-3" style={{ background: "#2c2c2e" }}>
                  <div className="flex justify-between text-[11px]">
                    <span style={{ color: "#8e8e93" }}>花費</span>
                    <span style={{ color: "#34c759" }}>${parseInt(inputAmount || "0").toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-[11px] mt-1">
                    <span style={{ color: "#8e8e93" }}>獲得</span>
                    <span style={{ color: "#bf5af2" }}>{Math.floor(parseInt(inputAmount || "0") * selectedSeller.currentRate / 100)} DRC</span>
                  </div>
                </div>
              )}

              {/* 按鈕 */}
              <button
                onClick={handleSingleBuy}
                disabled={!inputAmount || parseInt(inputAmount) <= 0}
                className="w-full py-3 rounded-xl text-sm font-bold active:scale-95 transition disabled:opacity-40"
                style={{ background: "#34c759", color: "#fff" }}
              >
                確認兌換
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 說明 */}
      <div className="rounded-2xl p-3" style={{ background: "rgba(52,199,89,0.05)", border: "1px solid rgba(52,199,89,0.15)" }}>
        <p className="text-[9px] leading-relaxed" style={{ color: "#8e8e93" }}>
          💡 匯率每次進入會變動（模擬市場波動）。賣家庫存有限，售完為止。可用「快速購買」自動分配到多個賣家。
        </p>
      </div>
    </div>
  );
}

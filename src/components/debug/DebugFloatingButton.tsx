"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bug,
  X,
  Coins,
  Wifi,
  ShieldAlert,
  Trophy,
  CheckCircle2,
  UserX,
  AlertTriangle,
  RotateCcw,
  Zap,
  Gift,
  Plus,
  Minus,
} from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { getAllNpcs } from "@/lib/game/npcs";

/**
 * Debug 浮窗按鈕
 *
 * 浮動在畫面右下角，可拖曳。點擊展開除錯面板，提供：
 * - 資源調整：DRC / 流量 / 風控值 / 詐騙積分
 * - 一鍵詐騙成功 / 失敗 / 警覺終止（對當前活躍對話）
 * - 解鎖所有 NPC / 加所有好友
 * - 重置遊戲
 */
export function DebugFloatingButton() {
  const [expanded, setExpanded] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 });
  const hasMoved = useRef(false);

  // Store state
  const darkCoin = useGameStore((s) => s.darkCoin);
  const dataTraffic = useGameStore((s) => s.dataTraffic);
  const riskLevel = useGameStore((s) => s.riskLevel);
  const scamScore = useGameStore((s) => s.scamScore);
  const conversations = useGameStore((s) => s.conversations);
  const friendNpcIds = useGameStore((s) => s.friendNpcIds);
  const unlockedNpcIds = useGameStore((s) => s.unlockedNpcIds);
  const generatedNpcs = useGameStore((s) => s.generatedNpcs);

  // Store actions
  const addDarkCoin = useGameStore((s) => s.addDarkCoin);
  const addTraffic = useGameStore((s) => s.addTraffic);
  const adjustRisk = useGameStore((s) => s.adjustRisk);
  const setConversationStatus = useGameStore((s) => s.setConversationStatus);
  const resetGame = useGameStore((s) => s.resetGame);
  const setState = useGameStore.setState;

  // 初始位置（右下角）
  useEffect(() => {
    if (typeof window === "undefined") return;
    setPosition({
      x: window.innerWidth - 70,
      y: window.innerHeight - 120,
    });
  }, []);

  // 顯示 toast 提示
  const flashToast = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(null), 1500);
  };

  // 拖曳邏輯
  const handleTouchStart = (e: React.TouchEvent | React.MouseEvent) => {
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    dragStart.current = { x: clientX, y: clientY, posX: position.x, posY: position.y };
    setDragging(true);
    hasMoved.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!dragging) return;
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const dx = clientX - dragStart.current.x;
    const dy = clientY - dragStart.current.y;
    if (Math.abs(dx) > 5 || Math.abs(dy) > 5) hasMoved.current = true;
    const newX = Math.max(0, Math.min(window.innerWidth - 56, dragStart.current.posX + dx));
    const newY = Math.max(0, Math.min(window.innerHeight - 56, dragStart.current.posY + dy));
    setPosition({ x: newX, y: newY });
  };

  const handleTouchEnd = () => {
    setDragging(false);
    // 如果沒有移動，視為點擊 → 展開/收起
    if (!hasMoved.current) {
      setExpanded(!expanded);
    }
  };

  // === Debug 動作 ===

  // 取得當前活躍對話的 NPC
  const getActiveConversationNpc = () => {
    const allNpcs = getAllNpcs(generatedNpcs);
    for (const npc of allNpcs) {
      const conv = conversations[npc.id];
      if (conv?.status === "active") return npc;
    }
    return null;
  };

  // 一鍵詐騙成功
  const handleScamSuccess = () => {
    const npc = getActiveConversationNpc();
    if (!npc) {
      flashToast("沒有活躍對話");
      return;
    }
    const payout = Math.floor(npc.minPayout + Math.random() * (npc.maxPayout - npc.minPayout));
    setConversationStatus(npc.id, "succeeded", payout, "【Debug】一鍵詐騙成功");
    flashToast(`✓ ${npc.displayName} 詐騙成功 +$${payout.toLocaleString()}`);
  };

  // 一鍵詐騙失敗（被封鎖）
  const handleScamBlocked = () => {
    const npc = getActiveConversationNpc();
    if (!npc) {
      flashToast("沒有活躍對話");
      return;
    }
    setConversationStatus(npc.id, "blocked", undefined, "【Debug】一鍵被封鎖");
    flashToast(`✗ ${npc.displayName} 已封鎖`);
  };

  // 一鍵警覺終止
  const handleScamCautious = () => {
    const npc = getActiveConversationNpc();
    if (!npc) {
      flashToast("沒有活躍對話");
      return;
    }
    setConversationStatus(npc.id, "cautious", undefined, "【Debug】一鍵警覺終止");
    flashToast(`⚠ ${npc.displayName} 警覺終止`);
  };

  // 解鎖所有 NPC 情報
  const handleUnlockAll = () => {
    const allNpcs = getAllNpcs(generatedNpcs);
    const newUnlocked = [...new Set([...unlockedNpcIds, ...allNpcs.map((n) => n.id)])];
    setState({ unlockedNpcIds: newUnlocked });
    flashToast(`已解鎖 ${allNpcs.length} 個 NPC 情報`);
  };

  // 加所有 NPC 為好友
  const handleAddAllFriends = () => {
    const allNpcs = getAllNpcs(generatedNpcs);
    const newUnlocked = [...new Set([...unlockedNpcIds, ...allNpcs.map((n) => n.id)])];
    const newFriends = [...new Set([...friendNpcIds, ...allNpcs.map((n) => n.id)])];
    setState({ friendNpcIds: newFriends, unlockedNpcIds: newUnlocked });
    flashToast(`已加 ${allNpcs.length} 個好友`);
  };

  // 一鍵重置遊戲
  const handleResetGame = () => {
    if (confirm("確定要重置遊戲？所有進度將清除！")) {
      resetGame();
      flashToast("遊戲已重置");
    }
  };

  // 資源調整按鈕元件
  const ResourceButton = ({
    icon,
    label,
    value,
    onAdd,
    onMinus,
    addAmount,
    color,
  }: {
    icon: React.ReactNode;
    label: string;
    value: string;
    onAdd: () => void;
    onMinus: () => void;
    addAmount: string;
    color: string;
  }) => (
    <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span style={{ color }}>{icon}</span>
          <span className="text-[11px] font-medium text-white/80">{label}</span>
        </div>
        <span className="text-xs font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="flex gap-1">
        <button
          onClick={onMinus}
          className="flex-1 py-1 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-0.5"
          style={{ background: "rgba(255,69,58,0.15)", color: "#ff453a" }}
        >
          <Minus className="w-3 h-3" /> {addAmount}
        </button>
        <button
          onClick={onAdd}
          className="flex-1 py-1 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-0.5"
          style={{ background: "rgba(48,209,88,0.15)", color: "#30d158" }}
        >
          <Plus className="w-3 h-3" /> {addAmount}
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* 浮窗按鈕 */}
      <motion.div
        style={{
          position: "fixed",
          left: position.x,
          top: position.y,
          zIndex: 9999,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleTouchStart}
        onMouseMove={dragging ? handleTouchMove : undefined}
        onMouseUp={handleTouchEnd}
        onMouseLeave={dragging ? handleTouchEnd : undefined}
        className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
        whileTap={{ scale: 0.9 }}
      >
        <div
          className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg"
          style={{
            background: "linear-gradient(135deg, #ff9500 0%, #ff6b00 100%)",
            boxShadow: "0 4px 12px rgba(255,149,0,0.4)",
          }}
        >
          <Bug className="w-6 h-6 text-white" />
        </div>
        {/* Debug 標籤 */}
        <span
          className="absolute -top-1 -right-1 px-1 py-0.5 rounded-full text-[7px] font-bold"
          style={{ background: "#ff3b30", color: "#fff" }}
        >
          DEBUG
        </span>
      </motion.div>

      {/* 展開的除錯面板 */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            style={{
              position: "fixed",
              left: Math.min(position.x - 160, (typeof window !== "undefined" ? window.innerWidth : 360) - 320),
              top: Math.max(20, position.y - 480),
              zIndex: 9998,
            }}
            className="w-[300px] rounded-2xl overflow-hidden"
          >
            <div
              className="backdrop-blur-2xl"
              style={{
                background: "rgba(20,20,22,0.95)",
                border: "1px solid rgba(255,149,0,0.3)",
              }}
            >
              {/* 標題列 */}
              <div className="flex items-center justify-between px-4 py-3 border-b" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <div className="flex items-center gap-2">
                  <Bug className="w-4 h-4 text-orange-400" />
                  <span className="text-sm font-bold text-white">Debug 面板</span>
                </div>
                <button
                  onClick={() => setExpanded(false)}
                  className="p-1 rounded-full active:scale-95 transition"
                  style={{ color: "rgba(255,255,255,0.5)" }}
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* 內容區 */}
              <div className="p-3 space-y-2.5 max-h-[440px] overflow-y-auto">
                {/* 資源調整區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1">資源調整</p>

                <ResourceButton
                  icon={<Coins className="w-3.5 h-3.5" />}
                  label="暗網幣 DRC"
                  value={darkCoin.toLocaleString()}
                  onAdd={() => { addDarkCoin(100); flashToast("+100 DRC"); }}
                  onMinus={() => { addDarkCoin(-100); flashToast("-100 DRC"); }}
                  addAmount="100"
                  color="#bf5af2"
                />

                <ResourceButton
                  icon={<Wifi className="w-3.5 h-3.5" />}
                  label="流量卡"
                  value={`${(dataTraffic / 1000).toFixed(1)} GB`}
                  onAdd={() => { addTraffic(2000); flashToast("+2 GB"); }}
                  onMinus={() => { addTraffic(-2000); flashToast("-2 GB"); }}
                  addAmount="2GB"
                  color="#5ac8fa"
                />

                <ResourceButton
                  icon={<ShieldAlert className="w-3.5 h-3.5" />}
                  label="風控值"
                  value={`${riskLevel}%`}
                  onAdd={() => { adjustRisk(15); flashToast("+15% 風控"); }}
                  onMinus={() => { adjustRisk(-15); flashToast("-15% 風控"); }}
                  addAmount="15%"
                  color="#ff9500"
                />

                <ResourceButton
                  icon={<Trophy className="w-3.5 h-3.5" />}
                  label="詐騙積分"
                  value={`$${scamScore.toLocaleString()}`}
                  onAdd={() => { setState((s) => ({ scamScore: s.scamScore + 10000 })); flashToast("+$10,000 積分"); }}
                  onMinus={() => { setState((s) => ({ scamScore: Math.max(0, s.scamScore - 10000) })); flashToast("-$10,000 積分"); }}
                  addAmount="10K"
                  color="#ffd60a"
                />

                {/* 快速資源按鈕 */}
                <div className="grid grid-cols-2 gap-1.5 pt-1">
                  <button
                    onClick={() => { addDarkCoin(1000); addTraffic(10000); flashToast("資源大補包"); }}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(191,90,242,0.15)", color: "#bf5af2" }}
                  >
                    <Gift className="w-3 h-3" /> 大補包
                  </button>
                  <button
                    onClick={() => { setState({ riskLevel: 0 }); flashToast("風控值歸零"); }}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(52,199,89,0.15)", color: "#34c759" }}
                  >
                    <ShieldAlert className="w-3 h-3" /> 風控歸零
                  </button>
                </div>

                {/* 對話控制區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1 pt-2">對話控制（活躍對話）</p>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    onClick={handleScamSuccess}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex flex-col items-center gap-0.5"
                    style={{ background: "rgba(48,209,88,0.15)", color: "#30d158" }}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    成功
                  </button>
                  <button
                    onClick={handleScamBlocked}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex flex-col items-center gap-0.5"
                    style={{ background: "rgba(255,69,58,0.15)", color: "#ff453a" }}
                  >
                    <UserX className="w-4 h-4" />
                    封鎖
                  </button>
                  <button
                    onClick={handleScamCautious}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex flex-col items-center gap-0.5"
                    style={{ background: "rgba(255,159,10,0.15)", color: "#ff9500" }}
                  >
                    <AlertTriangle className="w-4 h-4" />
                    警覺
                  </button>
                </div>

                {/* NPC 解鎖區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1 pt-2">NPC 解鎖</p>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    onClick={handleUnlockAll}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(0,122,255,0.15)", color: "#0a84ff" }}
                  >
                    <Zap className="w-3 h-3" /> 解鎖全部情報
                  </button>
                  <button
                    onClick={handleAddAllFriends}
                    className="py-2 rounded-lg text-[10px] font-medium active:scale-95 transition flex items-center justify-center gap-1"
                    style={{ background: "rgba(0,122,255,0.15)", color: "#0a84ff" }}
                  >
                    <Zap className="w-3 h-3" /> 加全部好友
                  </button>
                </div>

                {/* 風險操作區 */}
                <p className="text-[10px] font-semibold text-white/40 uppercase tracking-wide px-1 pt-2">風險操作</p>

                <button
                  onClick={handleResetGame}
                  className="w-full py-2.5 rounded-lg text-[11px] font-semibold active:scale-95 transition flex items-center justify-center gap-1.5"
                  style={{ background: "rgba(255,69,58,0.2)", color: "#ff453a", border: "1px solid rgba(255,69,58,0.3)" }}
                >
                  <RotateCcw className="w-3.5 h-3.5" /> 重置遊戲（清除所有進度）
                </button>
              </div>

              {/* 底部資訊 */}
              <div className="px-4 py-2 border-t flex items-center justify-between" style={{ borderColor: "rgba(255,255,255,0.1)" }}>
                <span className="text-[9px] text-white/30">
                  好友 {friendNpcIds.length} ・ 情報 {unlockedNpcIds.length} ・ 對話 {Object.keys(conversations).length}
                </span>
                <span className="text-[9px] text-orange-400/50">v1.55 DEBUG</span>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Toast 提示 */}
      <AnimatePresence>
        {showToast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
              position: "fixed",
              bottom: 80,
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 10000,
            }}
            className="px-4 py-2 rounded-full text-xs font-medium"
          >
            <div
              className="backdrop-blur-xl px-4 py-2 rounded-full"
              style={{
                background: "rgba(0,0,0,0.85)",
                color: "#fff",
                border: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              {showToast}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

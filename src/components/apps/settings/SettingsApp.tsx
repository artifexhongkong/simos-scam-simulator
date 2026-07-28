"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  User,
  Key,
  Trash2,
  Info,
  Github,
  Save,
  AlertTriangle,
  Sparkles,
  Wifi,
  Shield,
} from "lucide-react";
import { AppContainer } from "@/components/simos/Shell";
import { useGameStore } from "@/lib/game/store";

interface SettingsAppProps {
  onBack: () => void;
}

export function SettingsApp({ onBack }: SettingsAppProps) {
  const alias = useGameStore((s) => s.alias);
  const setAlias = useGameStore((s) => s.setAlias);
  const resetGame = useGameStore((s) => s.resetGame);
  const scamScore = useGameStore((s) => s.scamScore);
  const unlockedNpcIds = useGameStore((s) => s.unlockedNpcIds);
  const friendNpcIds = useGameStore((s) => s.friendNpcIds);

  const [aliasInput, setAliasInput] = useState(alias === "Anonymous" ? "" : alias);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://apihub.agnes-ai.com/v1");
  const [model, setModel] = useState("agnes-2.5-flash");
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  // Load saved Agnes config from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const k = window.localStorage.getItem("simos_agnes_api_key");
    const u = window.localStorage.getItem("simos_agnes_base_url");
    const m = window.localStorage.getItem("simos_agnes_model");
    // 用 microtask 避免在 effect 同步呼叫 setState
    Promise.resolve().then(() => {
      if (k) setApiKey(k);
      if (u) setBaseUrl(u);
      if (m) setModel(m);
    });
  }, []);

  const flashSaved = () => {
    setSavedFlash(true);
    setTimeout(() => setSavedFlash(false), 1500);
  };

  const saveAlias = () => {
    const a = aliasInput.trim() || "Anonymous";
    setAlias(a);
    flashSaved();
  };

  const saveAgnesConfig = () => {
    if (typeof window === "undefined") return;
    if (apiKey.trim()) {
      window.localStorage.setItem("simos_agnes_api_key", apiKey.trim());
    } else {
      window.localStorage.removeItem("simos_agnes_api_key");
    }
    window.localStorage.setItem("simos_agnes_base_url", baseUrl.trim() || "https://apihub.agnes-ai.com/v1");
    window.localStorage.setItem("simos_agnes_model", model.trim() || "agnes-2.5-flash");
    flashSaved();
  };

  const doReset = () => {
    resetGame();
    setConfirmReset(false);
    setAliasInput("");
    onBack();
  };

  return (
    <AppContainer title="設定" onBack={onBack} headerColor="bg-zinc-800">
      <div className="h-full overflow-y-auto">
        {/* Saved flash */}
        {savedFlash && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="sticky top-0 z-10 bg-emerald-500 text-white text-xs text-center py-2 font-medium"
          >
            ✓ 已儲存
          </motion.div>
        )}

        <div className="p-4 space-y-5">
          {/* 玩家別名 */}
          <Section icon={<User className="w-4 h-4" />} title="玩家身份">
            <div className="space-y-2">
              <label className="text-white/50 text-[11px]">玩家別名（顯示在排行榜）</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="例如：DarkPhisher"
                  maxLength={20}
                  className="flex-1 px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-amber-500"
                />
                <button
                  onClick={saveAlias}
                  className="px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 active:scale-95 transition flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> 儲存
                </button>
              </div>
              <p className="text-white/30 text-[10px]">目前：{alias}</p>
            </div>
          </Section>

          {/* Agnes AI 設定 */}
          <Section icon={<Key className="w-4 h-4" />} title="Agnes AI 設定">
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-white/50 text-[11px]">API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/50 text-[11px]">Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://apihub.agnes-ai.com/v1"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-white/50 text-[11px]">Model</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="agnes-2.5-flash"
                  className="w-full px-3 py-2 rounded-lg bg-zinc-800 border border-white/10 text-white text-sm placeholder:text-white/30 focus:outline-none focus:border-emerald-500 font-mono"
                />
              </div>

              <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/15 p-2.5 flex items-start gap-2">
                <Wifi className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-emerald-300/70 text-[10px] leading-relaxed">
                  填入 API key 後 NPC 將由 Agnes AI 即時驅動。未填寫則使用離線規則引擎（依然可玩，但對話較機械）。
                </p>
              </div>

              <button
                onClick={saveAgnesConfig}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> 儲存 Agnes 設定
              </button>
            </div>
          </Section>

          {/* 遊戲統計 */}
          <Section icon={<Sparkles className="w-4 h-4" />} title="遊戲統計">
            <div className="grid grid-cols-3 gap-2">
              <Stat label="積分" value={`$${scamScore.toLocaleString()}`} color="text-amber-300" />
              <Stat label="已解鎖" value={`${unlockedNpcIds.length} 人`} color="text-emerald-300" />
              <Stat label="已加好友" value={`${friendNpcIds.length} 人`} color="text-blue-300" />
            </div>
          </Section>

          {/* 重置遊戲 */}
          <Section icon={<Trash2 className="w-4 h-4" />} title="危險區域">
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-medium hover:bg-red-500/20 active:scale-95 transition"
              >
                重置所有遊戲進度
              </button>
            ) : (
              <div className="space-y-2">
                <div className="rounded-lg bg-red-500/10 border border-red-500/30 p-2.5 flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400 mt-0.5 shrink-0" />
                  <p className="text-red-300 text-[11px] leading-relaxed">
                    此操作將清除所有積分、已解鎖情報、好友列表、對話記錄，且無法復原。確定繼續？
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-lg bg-zinc-700 text-white text-xs font-medium hover:bg-zinc-600 active:scale-95 transition"
                  >
                    取消
                  </button>
                  <button
                    onClick={doReset}
                    className="flex-1 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-500 active:scale-95 transition"
                  >
                    確認重置
                  </button>
                </div>
              </div>
            )}
          </Section>

          {/* 關於 */}
          <Section icon={<Info className="w-4 h-4" />} title="關於">
            <div className="space-y-2 text-xs text-white/70 leading-relaxed">
              <p>
                <span className="text-white font-semibold">SimOS</span> — 詐騙模擬器 v1.0
              </p>
              <p className="text-white/50">
                一款沉浸式行動模擬遊戲。玩家扮演詐騙犯，操作模擬手機作業系統，透過情報販子購買目標個資、在 TeleChat 加好友、利用純文字對話詐騙由 Agnes AI 驅動的 NPC。
              </p>
              <div className="flex items-center gap-1.5 text-emerald-400 mt-2">
                <Shield className="w-3 h-3" />
                <span className="text-[10px]">本作純屬虛構，旨在提升防詐意識</span>
              </div>
              <a
                href="https://github.com/artifexhongkong/simos-scam-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-400 hover:text-blue-300 text-[11px] mt-2"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub Repository
              </a>
            </div>
          </Section>

          <p className="text-white/25 text-[9px] text-center py-2">
            SimOS · 2026 · Anti-Scam Educational Simulation
          </p>
        </div>
      </div>
    </AppContainer>
  );
}

function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-zinc-900/60 border border-white/5 p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="text-amber-400">{icon}</div>
        <h3 className="text-white text-sm font-semibold">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg bg-black/40 p-2.5 text-center">
      <p className="text-white/40 text-[10px] mb-0.5">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

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
  Thermometer,
  Sun,
  Moon,
  Clock,
  Palette,
  Zap,
  CheckCircle2,
  XCircle,
  Loader2,
} from "lucide-react";
import { useGameStore } from "@/lib/game/store";
import { testAgnesConnection } from "@/lib/agnes/engine";

interface SettingsAppProps {
  onBack: () => void;
}

export function SettingsApp({ onBack }: SettingsAppProps) {
  const alias = useGameStore((s) => s.alias);
  const setAlias = useGameStore((s) => s.setAlias);
  const resetGame = useGameStore((s) => s.resetGame);
  const scamScore = useGameStore((s) => s.scamScore);
  const darkCoin = useGameStore((s) => s.darkCoin);
  const dataTraffic = useGameStore((s) => s.dataTraffic);
  const riskLevel = useGameStore((s) => s.riskLevel);

  const theme = useGameStore((s) => s.theme);
  const setTheme = useGameStore((s) => s.setTheme);
  const showTimestamps = useGameStore((s) => s.showTimestamps);
  const toggleTimestamps = useGameStore((s) => s.toggleTimestamps);

  const [aliasInput, setAliasInput] = useState(alias === "Anonymous" ? "" : alias);
  const [apiKey, setApiKey] = useState("");
  const [baseUrl, setBaseUrl] = useState("https://apihub.agnes-ai.com/v1");
  const [model, setModel] = useState("agnes-2.5-flash");
  const [temperature, setTemperature] = useState(0.6);
  const [savedFlash, setSavedFlash] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const k = window.localStorage.getItem("simos_agnes_api_key");
    const u = window.localStorage.getItem("simos_agnes_base_url");
    const m = window.localStorage.getItem("simos_agnes_model");
    const t = window.localStorage.getItem("simos_agnes_temperature");
    Promise.resolve().then(() => {
      if (k) setApiKey(k);
      if (u) setBaseUrl(u);
      if (m) setModel(m);
      if (t) {
        const parsed = parseFloat(t);
        if (!isNaN(parsed)) setTemperature(parsed);
      }
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
    window.localStorage.setItem("simos_agnes_temperature", String(temperature));
    flashSaved();
  };

  const doReset = () => {
    resetGame();
    setConfirmReset(false);
    setAliasInput("");
    onBack();
  };

  // iMessage CSS 變數（與主題連動）
  const cardBg = "var(--im-bubble-npc-bg)";
  const cardBorder = "var(--im-header-border)";
  const textMain = "var(--im-header-text)";
  const textSub = "var(--im-bubble-system-text)";

  return (
    <div
      className="h-full min-h-0 flex flex-col overflow-hidden"
      style={{ background: "var(--im-bg)" }}
    >
      {/* iOS 風格導航欄 */}
      <div
        className="flex items-center px-2 py-2 border-b backdrop-blur-xl shrink-0"
        style={{
          background: "var(--im-header-bg)",
          borderColor: "var(--im-header-border)",
        }}
      >
        <button
          onClick={onBack}
          className="text-[17px] font-normal px-1 active:opacity-50 transition"
          style={{ color: "var(--im-link-text)" }}
        >
          ‹ 返回
        </button>
        <h2 className="flex-1 text-center text-[17px] font-semibold pr-12" style={{ color: textMain }}>
          設定
        </h2>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto scroll-safe-bottom">
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

        <div className="p-4 space-y-4">
          {/* 介面外觀 */}
          <Section icon={<Palette className="w-4 h-4" />} title="介面外觀" cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textSub={textSub}>
            <div className="space-y-3">
              {/* 主題切換 */}
              <div className="space-y-1.5">
                <label className="text-[11px]" style={{ color: textSub }}>主題模式</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setTheme("light")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition ${
                      theme === "light" ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-600"
                    }`}
                    style={theme !== "light" ? { background: "var(--im-bubble-npc-bg)", color: textSub } : {}}
                  >
                    <Sun className="w-3.5 h-3.5" /> 淺色
                  </button>
                  <button
                    onClick={() => setTheme("dark")}
                    className={`flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs font-medium transition ${
                      theme === "dark" ? "bg-blue-600 text-white" : "bg-zinc-200 text-zinc-600"
                    }`}
                    style={theme !== "dark" ? { background: "var(--im-bubble-npc-bg)", color: textSub } : {}}
                  >
                    <Moon className="w-3.5 h-3.5" /> 深色
                  </button>
                </div>
              </div>

              {/* 時間戳開關 */}
              <div
                className="flex items-center justify-between p-2.5 rounded-lg"
                style={{ background: "var(--im-input-bg)" }}
              >
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <div>
                    <p className="text-xs font-medium" style={{ color: textMain }}>顯示訊息時間戳</p>
                    <p className="text-[10px]" style={{ color: textSub }}>在訊息上方顯示時間</p>
                  </div>
                </div>
                <button
                  onClick={toggleTimestamps}
                  className={`w-10 h-6 rounded-full transition relative ${
                    showTimestamps ? "bg-emerald-500" : "bg-zinc-500"
                  }`}
                  aria-label="切換時間戳"
                >
                  <motion.div
                    layout
                    className="w-5 h-5 bg-white rounded-full absolute top-0.5"
                    style={{ left: showTimestamps ? "18px" : "2px" }}
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                  />
                </button>
              </div>
            </div>
          </Section>

          {/* 玩家別名 */}
          <Section icon={<User className="w-4 h-4" />} title="玩家身份" cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textSub={textSub}>
            <div className="space-y-2">
              <label className="text-[11px]" style={{ color: textSub }}>CC園區員工代號</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={aliasInput}
                  onChange={(e) => setAliasInput(e.target.value)}
                  placeholder="例如：DarkPhisher"
                  maxLength={20}
                  className="flex-1 px-3 py-2 rounded-lg text-sm focus:outline-none focus:border-blue-500"
                  style={{
                    background: "var(--im-input-bg)",
                    color: textMain,
                    border: "1px solid var(--im-input-border)",
                  }}
                />
                <button
                  onClick={saveAlias}
                  className="px-3 py-2 rounded-lg bg-amber-500 text-black text-xs font-semibold hover:bg-amber-400 active:scale-95 transition flex items-center gap-1"
                >
                  <Save className="w-3.5 h-3.5" /> 儲存
                </button>
              </div>
              <p className="text-[10px]" style={{ color: textSub }}>目前：{alias}</p>
            </div>
          </Section>

          {/* Agnes AI 設定 */}
          <Section icon={<Key className="w-4 h-4" />} title="Agnes AI 設定" cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textSub={textSub}>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <label className="text-[11px]" style={{ color: textSub }}>API Key</label>
                <input
                  type="password"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500"
                  style={{
                    background: "var(--im-input-bg)",
                    color: textMain,
                    border: "1px solid var(--im-input-border)",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px]" style={{ color: textSub }}>Base URL</label>
                <input
                  type="text"
                  value={baseUrl}
                  onChange={(e) => setBaseUrl(e.target.value)}
                  placeholder="https://apihub.agnes-ai.com/v1"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500"
                  style={{
                    background: "var(--im-input-bg)",
                    color: textMain,
                    border: "1px solid var(--im-input-border)",
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[11px]" style={{ color: textSub }}>Model 名稱</label>
                <input
                  type="text"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  placeholder="agnes-2.5-flash"
                  className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-500"
                  style={{
                    background: "var(--im-input-bg)",
                    color: textMain,
                    border: "1px solid var(--im-input-border)",
                  }}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] flex items-center gap-1" style={{ color: textSub }}>
                    <Thermometer className="w-3 h-3" /> Temperature
                  </label>
                  <span className="text-xs font-mono font-semibold text-emerald-400">
                    {temperature.toFixed(2)}
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.05"
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  className="w-full h-2 bg-zinc-700 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
                <div className="flex justify-between text-[9px]" style={{ color: textSub }}>
                  <span>精確 (0.0)</span>
                  <span>平衡 (0.6)</span>
                  <span>創意 (2.0)</span>
                </div>
                <p className="text-[10px] leading-tight" style={{ color: textSub }}>
                  預設 0.6：降低模型隨機發散，避免脑补與重複
                </p>
              </div>

              <div
                className="rounded-lg p-2.5 flex items-start gap-2"
                style={{ background: "rgba(16, 185, 129, 0.08)", border: "1px solid rgba(16, 185, 129, 0.2)" }}
              >
                <Wifi className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                <p className="text-emerald-500/80 text-[10px] leading-relaxed">
                  App 已內嵌測試 API key，未填寫也能玩。填入自己的 key 可獲得更穩定的 AI 回應。
                </p>
              </div>

              <button
                onClick={saveAgnesConfig}
                className="w-full py-2 rounded-lg bg-emerald-600 text-white text-sm font-semibold hover:bg-emerald-500 active:scale-95 transition flex items-center justify-center gap-1.5"
              >
                <Save className="w-3.5 h-3.5" /> 儲存 Agnes 設定
              </button>

              {/* 測試 AI 連線按鈕 */}
              <TestAIButton />
            </div>
          </Section>

          {/* 遊戲統計 */}
          <Section icon={<Sparkles className="w-4 h-4" />} title="遊戲統計" cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textSub={textSub}>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="總騙金額" value={`$${scamScore.toLocaleString()}`} color="text-amber-500" />
              <Stat label="暗網幣" value={`${darkCoin} DRC`} color="text-purple-500" />
              <Stat label="流量卡" value={`${dataTraffic} GB`} color="text-blue-500" />
              <Stat label="風控值" value={`${riskLevel}/100`} color={riskLevel > 60 ? "text-red-500" : riskLevel > 30 ? "text-orange-500" : "text-emerald-500"} />
            </div>
          </Section>

          {/* 危險區域 */}
          <Section icon={<Trash2 className="w-4 h-4" />} title="危險區域" cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textSub={textSub}>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="w-full py-2.5 rounded-lg text-sm font-medium active:scale-95 transition"
                style={{
                  background: "rgba(239, 68, 68, 0.1)",
                  border: "1px solid rgba(239, 68, 68, 0.3)",
                  color: "#ef4444",
                }}
              >
                重置所有遊戲進度
              </button>
            ) : (
              <div className="space-y-2">
                <div
                  className="rounded-lg p-2.5 flex items-start gap-2"
                  style={{ background: "rgba(239, 68, 68, 0.1)", border: "1px solid rgba(239, 68, 68, 0.3)" }}
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                  <p className="text-red-500 text-[11px] leading-relaxed">
                    此操作將清除所有積分、已解鎖情報、好友列表、對話記錄，且無法復原。確定繼續？
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setConfirmReset(false)}
                    className="flex-1 py-2 rounded-lg text-xs font-medium active:scale-95 transition"
                    style={{ background: "var(--im-input-bg)", color: textMain }}
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
          <Section icon={<Info className="w-4 h-4" />} title="關於" cardBg={cardBg} cardBorder={cardBorder} textMain={textMain} textSub={textSub}>
            <div className="space-y-2 text-xs leading-relaxed" style={{ color: textMain }}>
              <p>
                <span className="font-semibold">SimOS</span> — 詐騙模擬器 v2.5 iMessage
              </p>
              <p style={{ color: textSub }}>
                一款沉浸式行動模擬遊戲，高仿 iOS iMessage 介面。玩家扮演 CC園區員工，透過文字誘導普通市民上當。
                含隱藏信任度系統、多結局判定、動態警惕機制、圖片素材回覆、快捷话术庫。
              </p>
              <div className="flex items-center gap-1.5 text-emerald-500 mt-2">
                <Shield className="w-3 h-3" />
                <span className="text-[10px]">本作純屬虛構，旨在提升防詐意識</span>
              </div>
              <a
                href="https://github.com/artifexhongkong/simos-scam-simulator"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-blue-500 hover:text-blue-400 text-[11px] mt-2"
              >
                <Github className="w-3.5 h-3.5" />
                GitHub Repository
              </a>
            </div>
          </Section>

          <p className="text-[9px] text-center py-2" style={{ color: textSub }}>
            SimOS · 2026 · Anti-Scam Educational Simulation
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({
  icon,
  title,
  children,
  cardBg,
  cardBorder,
  textMain,
  textSub,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  cardBg: string;
  cardBorder: string;
  textMain: string;
  textSub: string;
}) {
  return (
    <div
      className="rounded-2xl p-4"
      style={{ background: cardBg, border: cardBorder }}
    >
      <div className="flex items-center gap-2 mb-3">
        <div className="text-amber-500">{icon}</div>
        <h3 className="text-sm font-semibold" style={{ color: textMain }}>{title}</h3>
      </div>
      {children}
    </div>
  );
}

function TestAIButton() {
  const [status, setStatus] = useState<"idle" | "testing" | "ok" | "fail">("idle");
  const [message, setMessage] = useState("");
  const [reply, setReply] = useState("");

  const handleTest = async () => {
    setStatus("testing");
    setMessage("");
    setReply("");
    const result = await testAgnesConnection();
    if (result.ok) {
      setStatus("ok");
      setMessage(result.message);
      setReply(result.reply || "");
    } else {
      setStatus("fail");
      setMessage(result.message);
    }
  };

  return (
    <div className="space-y-2">
      <button
        onClick={handleTest}
        disabled={status === "testing"}
        className="w-full py-2 rounded-lg text-sm font-semibold active:scale-95 transition flex items-center justify-center gap-1.5"
        style={{
          background: status === "ok" ? "rgba(16, 185, 129, 0.15)" : status === "fail" ? "rgba(239, 68, 68, 0.15)" : "var(--im-input-bg)",
          color: status === "ok" ? "#10b981" : status === "fail" ? "#ef4444" : "var(--im-link-text)",
          border: status === "ok" ? "1px solid rgba(16, 185, 129, 0.3)" : status === "fail" ? "1px solid rgba(239, 68, 68, 0.3)" : "1px solid var(--im-input-border)",
        }}
      >
        {status === "testing" ? (
          <><Loader2 className="w-3.5 h-3.5 animate-spin" /> 測試中...</>
        ) : status === "ok" ? (
          <><CheckCircle2 className="w-3.5 h-3.5" /> AI 連線正常</>
        ) : status === "fail" ? (
          <><XCircle className="w-3.5 h-3.5" /> 連線失敗，點擊重試</>
        ) : (
          <><Zap className="w-3.5 h-3.5" /> 測試 AI 連線</>
        )}
      </button>
      {message && (
        <div
          className="text-[11px] px-3 py-2 rounded-lg"
          style={{
            background: status === "ok" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
            color: status === "ok" ? "#10b981" : "#ef4444",
          }}
        >
          {message}
          {reply && <div className="mt-1 opacity-80">AI 回應：{reply}</div>}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="rounded-lg p-2.5 text-center" style={{ background: "var(--im-input-bg)" }}>
      <p className="text-[10px] mb-0.5" style={{ color: "var(--im-bubble-system-text)" }}>{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  );
}

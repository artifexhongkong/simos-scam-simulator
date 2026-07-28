"use client";

import { useEffect, useState } from "react";

/**
 * 動態計算 App 可視高度
 *
 * 問題背景：
 * - 100vh 在行動瀏覽器包含 URL bar 高度，會導致底部被切斷
 * - 100dvh 在 Android WebView 不被支援（只有 iOS Safari 支援）
 * - Capacitor WebView 的 visualViewport 不會隨系統列隱藏更新
 * - 沉浸式模式下系統列高度變化不會觸發標準 resize
 *
 * 解決方案：
 * 用 JavaScript 多重監聽 + 動態設定 --app-height CSS 變數
 * 1. window.innerHeight（標準）
 * 2. visualViewport.height（iOS Safari 精準）
 * 3. document.documentElement.clientHeight（fallback）
 * 4. 多重事件監聽：resize / orientationchange / visualViewport.resize / fullscreenchange
 * 5. 定時輪詢（500ms）作為最後保險
 */
export function useAppHeight() {
  const [height, setHeight] = useState(0);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const computeHeight = () => {
      let h = 0;
      if (window.visualViewport) {
        h = window.visualViewport.height;
      }
      if (!h || h < 100) {
        h = window.innerHeight;
      }
      if (!h || h < 100) {
        h = document.documentElement.clientHeight;
      }
      if (!h || h < 100) {
        h = 600;
      }

      document.documentElement.style.setProperty("--app-height", `${h}px`);
      setHeight(h);
    };

    computeHeight();

    window.addEventListener("resize", computeHeight);
    window.addEventListener("orientationchange", computeHeight);
    window.addEventListener("fullscreenchange", computeHeight);

    if (window.visualViewport) {
      window.visualViewport.addEventListener("resize", computeHeight);
      window.visualViewport.addEventListener("scroll", computeHeight);
    }

    const t1 = setTimeout(computeHeight, 100);
    const t2 = setTimeout(computeHeight, 500);
    const t3 = setTimeout(computeHeight, 1000);

    const interval = setInterval(computeHeight, 1000);

    return () => {
      window.removeEventListener("resize", computeHeight);
      window.removeEventListener("orientationchange", computeHeight);
      window.removeEventListener("fullscreenchange", computeHeight);
      if (window.visualViewport) {
        window.visualViewport.removeEventListener("resize", computeHeight);
        window.visualViewport.removeEventListener("scroll", computeHeight);
      }
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearInterval(interval);
    };
  }, []);

  return height;
}

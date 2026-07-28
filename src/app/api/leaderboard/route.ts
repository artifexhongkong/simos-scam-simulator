import { NextResponse } from "next/server";
import { RIVAL_SCAMMERS } from "@/lib/game/npcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// 取得即時排行榜（含波動）
export async function GET() {
  const now = Date.now();
  // 給虛擬對手加上小波動，模擬即時榜單
  const rivals = RIVAL_SCAMMERS.map((r) => {
    const fluct = Math.floor((Math.random() - 0.4) * 5000); // 偏正波動
    return {
      ...r,
      totalScam: Math.max(0, r.totalScam + fluct),
    };
  }).sort((a, b) => b.totalScam - a.totalScam);

  return NextResponse.json({
    rivals,
    updatedAt: now,
  });
}

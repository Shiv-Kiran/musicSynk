import { NextRequest, NextResponse } from "next/server";

import { getDashboardView } from "@/lib/server/provider";

export async function GET(request: NextRequest) {
  const limitParam = request.nextUrl.searchParams.get("limit");
  const limit = limitParam ? Number(limitParam) : 30;
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, limit)) : 30;

  return NextResponse.json(await getDashboardView(safeLimit));
}

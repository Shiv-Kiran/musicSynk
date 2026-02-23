import { NextResponse } from "next/server";

import { triggerManualSync } from "@/lib/server/provider";

export async function POST() {
  const result = await triggerManualSync();
  return NextResponse.json(result);
}

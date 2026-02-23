import { NextResponse } from "next/server";

import { triggerManualSync } from "@/lib/mock/store";

export async function POST() {
  const result = triggerManualSync();
  return NextResponse.json(result);
}

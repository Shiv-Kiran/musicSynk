import { NextResponse } from "next/server";

import { startInitialScan } from "@/lib/server/provider";

export async function POST() {
  return NextResponse.json(await startInitialScan());
}

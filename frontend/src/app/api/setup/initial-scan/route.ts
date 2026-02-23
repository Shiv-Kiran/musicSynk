import { NextResponse } from "next/server";

import { startInitialScan } from "@/lib/mock/store";

export async function POST() {
  return NextResponse.json(startInitialScan());
}

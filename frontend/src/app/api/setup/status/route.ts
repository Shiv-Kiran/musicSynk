import { NextResponse } from "next/server";

import { getSetupStatusView } from "@/lib/mock/store";

export async function GET() {
  return NextResponse.json(getSetupStatusView());
}

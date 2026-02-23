import { NextResponse } from "next/server";

import { getSetupStatusView } from "@/lib/server/provider";

export async function GET() {
  return NextResponse.json(await getSetupStatusView());
}

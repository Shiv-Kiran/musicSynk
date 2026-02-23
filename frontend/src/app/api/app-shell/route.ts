import { NextResponse } from "next/server";

import { getAppShellStatusView } from "@/lib/server/provider";

export async function GET() {
  return NextResponse.json(await getAppShellStatusView());
}

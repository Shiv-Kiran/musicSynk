import { NextResponse } from "next/server";

import { getAppShellStatusView } from "@/lib/mock/store";

export async function GET() {
  return NextResponse.json(getAppShellStatusView());
}

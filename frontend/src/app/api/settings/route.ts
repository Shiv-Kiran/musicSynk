import { NextResponse } from "next/server";

import { getSettingsView, updateSettings } from "@/lib/server/provider";

export async function GET() {
  return NextResponse.json(await getSettingsView());
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(await updateSettings(body));
}

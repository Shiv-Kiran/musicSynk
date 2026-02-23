import { NextResponse } from "next/server";

import { getSettingsView, updateSettings } from "@/lib/mock/store";

export async function GET() {
  return NextResponse.json(getSettingsView());
}

export async function POST(request: Request) {
  const body = await request.json();
  return NextResponse.json(updateSettings(body));
}

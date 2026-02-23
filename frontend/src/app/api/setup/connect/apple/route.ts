import { NextResponse } from "next/server";

import { mockConnectApple } from "@/lib/mock/store";

export async function POST() {
  return NextResponse.json(mockConnectApple());
}

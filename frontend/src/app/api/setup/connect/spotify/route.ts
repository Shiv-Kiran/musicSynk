import { NextResponse } from "next/server";

import { mockConnectSpotify } from "@/lib/mock/store";

export async function POST() {
  return NextResponse.json(mockConnectSpotify());
}

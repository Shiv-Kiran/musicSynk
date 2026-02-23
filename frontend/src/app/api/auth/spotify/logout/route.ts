import { NextResponse } from "next/server";

import { disconnectSpotify } from "@/lib/server/provider";

export async function POST() {
  const setup = await disconnectSpotify();
  return NextResponse.json(setup);
}

import { NextResponse } from "next/server";

import { connectSpotify } from "@/lib/server/provider";

export async function POST() {
  return NextResponse.json(await connectSpotify());
}

import { NextResponse } from "next/server";

import { connectApple } from "@/lib/server/provider";

export async function POST() {
  return NextResponse.json(await connectApple());
}

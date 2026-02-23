import { NextResponse } from "next/server";

import { dismissUnmatchedSong } from "@/lib/server/provider";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = await dismissUnmatchedSong(id);

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}

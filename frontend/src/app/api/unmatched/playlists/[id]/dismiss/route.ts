import { NextResponse } from "next/server";

import { dismissUnmatchedPlaylist } from "@/lib/mock/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = dismissUnmatchedPlaylist(id);

  if (!result.ok) {
    return NextResponse.json(result, { status: 404 });
  }

  return NextResponse.json(result);
}

import { NextResponse } from "next/server";

import { applyBestGuessForUnmatchedSong } from "@/lib/mock/store";

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const result = applyBestGuessForUnmatchedSong(id);

  if (!result.ok) {
    const status = result.error === "not_found" ? 404 : 400;
    return NextResponse.json(result, { status });
  }

  return NextResponse.json(result);
}

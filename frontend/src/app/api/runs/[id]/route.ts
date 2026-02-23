import { NextResponse } from "next/server";

import { getRunDetailView } from "@/lib/mock/store";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const { id } = await context.params;
  const run = getRunDetailView(id);

  if (!run) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  return NextResponse.json(run);
}

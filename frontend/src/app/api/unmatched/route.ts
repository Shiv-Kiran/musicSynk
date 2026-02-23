import { NextRequest, NextResponse } from "next/server";

import { getUnmatchedListView } from "@/lib/mock/store";
import type { SourceService } from "@/lib/types";

function parseSource(value: string | null): "all" | SourceService | undefined {
  if (!value) return undefined;
  if (value === "all" || value === "spotify" || value === "apple_music") return value;
  return undefined;
}

function parseStatus(value: string | null): "all" | "pending" | "dismissed" | undefined {
  if (!value) return undefined;
  if (value === "all" || value === "pending" || value === "dismissed") return value;
  return undefined;
}

function parseSort(
  value: string | null,
): "newest" | "oldest" | "playlist" | "reason" | undefined {
  if (!value) return undefined;
  if (value === "newest" || value === "oldest" || value === "playlist" || value === "reason") {
    return value;
  }
  return undefined;
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;

  return NextResponse.json(
    getUnmatchedListView({
      status: parseStatus(params.get("status")),
      sourceService: parseSource(params.get("sourceService")),
      playlist: params.get("playlist") ?? undefined,
      runId: params.get("runId") ?? undefined,
      sort: parseSort(params.get("sort")),
    }),
  );
}

import { UnmatchedPage } from "@/components/unmatched-page";
import { getUnmatchedListView } from "@/lib/server/provider";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function UnmatchedRoute({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const sourceService = firstParam(params.sourceService);
  const playlist = firstParam(params.playlist);
  const runId = firstParam(params.runId);
  const sort = firstParam(params.sort);
  const status = firstParam(params.status);

  const data = await getUnmatchedListView({
    sourceService:
      sourceService === "spotify" || sourceService === "apple_music" || sourceService === "all"
        ? sourceService
        : undefined,
    playlist: playlist ?? undefined,
    runId: runId ?? undefined,
    sort:
      sort === "newest" || sort === "oldest" || sort === "playlist" || sort === "reason"
        ? sort
        : undefined,
    status: status === "all" || status === "pending" || status === "dismissed" ? status : undefined,
  });

  return <UnmatchedPage initialData={data} />;
}

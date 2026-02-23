import { redirect } from "next/navigation";

import { SetupWizard } from "@/components/setup-wizard";
import { getSetupStatusView } from "@/lib/server/provider";

export default async function SetupPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const status = await getSetupStatusView();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const errorValue = resolvedSearchParams?.error;
  const oauthError = typeof errorValue === "string" ? errorValue : null;

  if (status.setupComplete) {
    redirect("/dashboard");
  }

  return <SetupWizard initialStatus={status} oauthError={oauthError} />;
}

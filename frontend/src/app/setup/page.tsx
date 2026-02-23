import { redirect } from "next/navigation";

import { SetupWizard } from "@/components/setup-wizard";
import { getSetupStatusView } from "@/lib/server/provider";

export default async function SetupPage() {
  const status = await getSetupStatusView();

  if (status.setupComplete) {
    redirect("/dashboard");
  }

  return <SetupWizard initialStatus={status} />;
}

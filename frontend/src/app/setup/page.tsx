import { redirect } from "next/navigation";

import { SetupWizard } from "@/components/setup-wizard";
import { getSetupStatusView } from "@/lib/mock/store";

export default function SetupPage() {
  const status = getSetupStatusView();

  if (status.setupComplete) {
    redirect("/dashboard");
  }

  return <SetupWizard initialStatus={status} />;
}

import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShellLayout } from "@/components/app-shell-layout";
import { getAppShellStatusView, getSetupStatusView } from "@/lib/server/provider";

export default async function ShellLayout({ children }: { children: ReactNode }) {
  const setup = await getSetupStatusView();
  if (!setup.setupComplete) {
    redirect("/setup");
  }
  const shellStatus = await getAppShellStatusView();
  return <AppShellLayout shellStatus={shellStatus}>{children}</AppShellLayout>;
}

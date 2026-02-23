import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { AppShellLayout } from "@/components/app-shell-layout";
import { getAppShellStatusView, getSetupStatusView } from "@/lib/mock/store";

export default function ShellLayout({ children }: { children: ReactNode }) {
  const setup = getSetupStatusView();
  if (!setup.setupComplete) {
    redirect("/setup");
  }
  const shellStatus = getAppShellStatusView();
  return <AppShellLayout shellStatus={shellStatus}>{children}</AppShellLayout>;
}

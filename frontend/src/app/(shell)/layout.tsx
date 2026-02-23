import type { ReactNode } from "react";

import { AppShellLayout } from "@/components/app-shell-layout";
import { getAppShellStatusView } from "@/lib/mock/store";

export default function ShellLayout({ children }: { children: ReactNode }) {
  const shellStatus = getAppShellStatusView();
  return <AppShellLayout shellStatus={shellStatus}>{children}</AppShellLayout>;
}

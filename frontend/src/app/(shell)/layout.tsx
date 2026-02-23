import type { ReactNode } from "react";

import { AppShellLayout } from "@/components/app-shell-layout";
import type { AppShellStatus } from "@/lib/types";

const placeholderShellStatus: AppShellStatus = {
  spotifyAuth: "healthy",
  appleAuth: "healthy",
  pendingUnmatchedCount: 4,
};

export default function ShellLayout({ children }: { children: ReactNode }) {
  return (
    <AppShellLayout shellStatus={placeholderShellStatus}>{children}</AppShellLayout>
  );
}

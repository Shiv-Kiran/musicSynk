import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AppShellLayout } from "./app-shell-layout";

const pathnameState = {
  value: "/dashboard",
};

vi.mock("next/navigation", () => ({
  usePathname: () => pathnameState.value,
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
    ...props
  }: {
    children: React.ReactNode;
    href: string;
  }) => (
    <a href={href} {...props}>
      {children}
    </a>
  ),
}));

describe("AppShellLayout", () => {
  beforeEach(() => {
    pathnameState.value = "/dashboard";
  });

  it("shows unmatched badge only when pending count is positive", () => {
    const { rerender } = render(
      <AppShellLayout
        shellStatus={{
          spotifyAuth: "healthy",
          appleAuth: "missing",
          pendingUnmatchedCount: 3,
        }}
      >
        <div>content</div>
      </AppShellLayout>,
    );

    expect(screen.getByText("Unmatched")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("Spotify")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();

    rerender(
      <AppShellLayout
        shellStatus={{
          spotifyAuth: "healthy",
          appleAuth: "healthy",
          pendingUnmatchedCount: 0,
        }}
      >
        <div>content</div>
      </AppShellLayout>,
    );

    expect(screen.queryByLabelText("Pending unmatched items")).not.toBeInTheDocument();
  });
});

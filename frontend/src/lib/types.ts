export type AuthHealth = "healthy" | "invalid" | "missing";

export type AppShellStatus = {
  spotifyAuth: AuthHealth;
  appleAuth: AuthHealth;
  pendingUnmatchedCount: number;
};

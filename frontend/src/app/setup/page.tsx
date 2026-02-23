export default function SetupPage() {
  return (
    <main className="app-boot">
      <section className="boot-panel">
        <header className="boot-header">
          <div className="boot-logo">
            <span className="boot-logo-mark" aria-hidden="true">
              ♪
            </span>
            <span>music sync</span>
          </div>
          <span className="boot-chip">setup wizard</span>
        </header>

        <div className="boot-card">
          <h1>Setup flow placeholder</h1>
          <p>
            The next commit adds the 3-step onboarding flow (Spotify, Apple Music,
            initial scan) and auto-redirect behavior when setup is incomplete.
          </p>
        </div>
      </section>
    </main>
  );
}

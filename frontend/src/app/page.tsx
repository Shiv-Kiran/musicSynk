export default function Home() {
  return (
    <main className="app-boot">
      <section className="boot-panel" aria-labelledby="boot-title">
        <header className="boot-header">
          <div className="boot-logo">
            <span className="boot-logo-mark" aria-hidden="true">
              ♪
            </span>
            <span>music sync</span>
          </div>
          <span className="boot-chip">fast-track ui scaffold</span>
        </header>

        <div className="boot-grid">
          <div className="boot-card">
            <h1 id="boot-title">Maintenance-first control panel in progress</h1>
            <p>
              This is the base Next.js scaffold commit. Next commits will add the
              sidebar shell, dashboard, setup wizard, unmatched triage, and
              settings using mock API contracts.
            </p>
          </div>

          <div className="boot-card" aria-label="Upcoming sections">
            <ul className="boot-list">
              <li>
                <span className="boot-dot" aria-hidden="true" />
                Dashboard status banner and run history
              </li>
              <li>
                <span className="boot-dot" aria-hidden="true" />
                Setup wizard with background-first initial scan UX
              </li>
              <li>
                <span className="boot-dot" aria-hidden="true" />
                Inline unmatched triage with best-guess shortcut
              </li>
            </ul>
          </div>
        </div>
      </section>
    </main>
  );
}

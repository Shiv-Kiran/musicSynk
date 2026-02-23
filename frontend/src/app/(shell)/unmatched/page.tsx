import styles from "../page-header.module.css";

export default function UnmatchedPage() {
  return (
    <section>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Unmatched</h1>
          <p className={styles.subtitle}>
            Inline triage for songs and playlists that need review.
          </p>
        </div>
        <span className={styles.pill}>4 pending</span>
      </header>

      <div className={styles.placeholder}>
        This page will become the fast inline review workflow: best-guess shortcut,
        dismiss, filters, and optimistic updates.
      </div>
    </section>
  );
}

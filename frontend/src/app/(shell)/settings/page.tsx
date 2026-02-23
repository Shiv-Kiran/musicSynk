import styles from "../page-header.module.css";

export default function SettingsPage() {
  return (
    <section>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Settings</h1>
          <p className={styles.subtitle}>
            Notifications, match sensitivity, and playlist exclusions.
          </p>
        </div>
        <span className={styles.pill}>minimal mvp</span>
      </header>

      <div className={styles.placeholder}>
        Settings UI will be added after dashboard and unmatched so the core review
        flows are testable first.
      </div>
    </section>
  );
}

import styles from "../page-header.module.css";

export default function DashboardPage() {
  return (
    <section>
      <header className={styles.header}>
        <div>
          <h1 className={styles.title}>Dashboard</h1>
          <p className={styles.subtitle}>
            Last-run status, sync summary, and a clean run history list live here.
          </p>
        </div>
        <span className={styles.pill}>coming next</span>
      </header>

      <div className={styles.placeholder}>
        Maintenance-first dashboard UI will be implemented in the next commit with a
        status banner, summary strip, and expandable run history.
      </div>
    </section>
  );
}

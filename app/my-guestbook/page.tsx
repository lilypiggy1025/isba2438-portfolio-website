import type { Metadata } from "next";
import BlogShell from "../blogs/BlogShell";
import Guestbook from "./Guestbook";
import styles from "./guestbook.module.css";

export const metadata: Metadata = { title: "My Guestbook | LIWEN CHEN" };

export default function MyGuestbookPage() {
  return <div className={styles.page}><BlogShell>
    <div className={styles.intro}>
      <div className={styles.titleBlock}>
        <h1>My Guestbook</h1>
        <p>Leave a little note, share a little thought.</p>
      </div>
      <div className={styles.invitation}>
        <span className={styles.botanical} aria-hidden="true">❦</span>
        <p>A few words from you,<br />a keepsake for this little corner.</p>
      </div>
    </div>
    <Guestbook />
  </BlogShell></div>;
}

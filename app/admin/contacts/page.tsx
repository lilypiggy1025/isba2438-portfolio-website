import type { Metadata } from "next";
import BlogShell from "../../blogs/BlogShell";
import ContactSubmissions from "./ContactSubmissions";
import styles from "./contacts.module.css";

export const metadata: Metadata = { title: "Contact Submissions | LIWEN CHEN", robots: { index: false, follow: false } };

export default function ContactsAdminPage() {
  return <div className={styles.page}><BlogShell>
    <div className={styles.intro}>
      <h1>Contact Submissions</h1>
      <p>Administrator access</p>
    </div>
    <ContactSubmissions />
  </BlogShell></div>;
}

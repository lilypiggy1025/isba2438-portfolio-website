import { Suspense, type ReactNode } from "react";
import Link from "next/link";
import localFont from "next/font/local";
import Navigation from "../components/Navigation";
import headerStyles from "../page.module.css";
import styles from "./blog.module.css";

const pinyon = localFont({
  src: "../../public/fonts/PinyonScript-Regular.ttf",
  variable: "--font-pinyon",
  display: "swap",
});

export default function BlogShell({ children }: { children: ReactNode }) {
  return (
    <div className={styles.page + " " + pinyon.variable}>
      <header className={headerStyles.header}>
        <Link href="/" className={headerStyles.wordmark} aria-label="Portfolio home">Portfolio<span aria-hidden="true">✧</span></Link>
        <Suspense fallback={null}><Navigation /></Suspense>
      </header>
      <main className={styles.main}>{children}</main>
    </div>
  );
}

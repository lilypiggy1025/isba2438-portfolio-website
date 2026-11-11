import Navigation from "../components/Navigation";
import type { Metadata } from "next";
import Link from "next/link";
import localFont from "next/font/local";
import headerStyles from "../page.module.css";
import styles from "../contact-me-server-form/page.module.css";
import ContactForm from "./ContactApiForm";

const pinyon = localFont({ src: "../../public/fonts/PinyonScript-Regular.ttf", variable: "--font-pinyon", display: "swap", weight: "400" });
export const metadata: Metadata = { title: "Contact Me | LIWEN CHEN" };

export default function ContactPage() {
  return <div className={`${styles.page} ${pinyon.variable}`}>
    <header className={headerStyles.header}>
      <Link href="/" className={headerStyles.wordmark} aria-label="Portfolio home">Portfolio<span aria-hidden="true">✧</span></Link>
      <Navigation />
    </header>
    <main className={styles.content}>
      <section className={styles.invitation} aria-label="Let's keep in touch">
        <div className={styles.doodles} aria-hidden="true">
          <svg className={styles.topStar} viewBox="0 0 40 50" fill="none"><path d="m20 2 4 17 14 6-14 5-4 18-4-18L2 25l14-6L20 2Z" /></svg>
          <span className={styles.heartOne}>♡</span><span className={styles.heartTwo}>♡</span>
        </div>
        <p className={styles.firstLine}>Let&apos;s keep</p>
        <p className={styles.secondLine}>in touch <span className={styles.heart}>♡</span></p>
        <p className={styles.subtitle}>I&apos;d love to hear from you!</p>
        <svg className={styles.wave} viewBox="0 0 380 110" fill="none" aria-hidden="true">
          <path d="M8 36C66 97 119 5 180 43S275 105 338 47" strokeDasharray="5 7" />
          <path d="m351 21 4 16 15 6-15 5-4 17-4-17-15-5 15-6 4-16Z" />
        </svg>
      </section>
      <ContactForm />
    </main>
  </div>;
}

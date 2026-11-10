import Navigation from "./components/Navigation";
import Link from "next/link";
import localFont from "next/font/local";
import styles from "./page.module.css";
import PhotoTrail from "./components/PhotoTrail";

const pinyon = localFont({
  src: "../public/fonts/PinyonScript-Regular.ttf",
  variable: "--font-pinyon",
  display: "swap",
  weight: "400",
});


// Fixed positions keep the decorative field consistent across server renders.
const sparkles = Array.from({ length: 165 }, (_, index) => ({
  left: ((index * 61 + 7) % 997) / 10,
  top: ((index * 137 + 23) % 983) / 10,
  size: index % 9 === 0 ? 15 : index % 4 === 0 ? 8 : 3,
  sage: index % 3 === 0,
  star: index % 4 === 0,
}));

export default function Home() {
  return (
    <main className={`${styles.cover} ${pinyon.variable}`}>
      <div className={styles.sparkles} aria-hidden="true">
        {sparkles.map((sparkle, index) => (
          <span
            key={index}
            className={`${styles.sparkle} ${sparkle.star ? styles.star : ""} ${sparkle.sage ? styles.sage : ""}`}
            style={{ left: `${sparkle.left}%`, top: `${sparkle.top}%`, width: sparkle.size, height: sparkle.size }}
          />
        ))}
      </div>
      <header className={styles.header}>
        <Link href="/" className={styles.wordmark} aria-label="Portfolio home">Portfolio<span aria-hidden="true">✧</span></Link>
        <Navigation />
      </header>
      <div className={styles.welcome}>
        <h1><span className={styles.serif}>welcome to my</span><span className={styles.script}>portfolio</span></h1>
      </div>
      <PhotoTrail />
    </main>
  );
}

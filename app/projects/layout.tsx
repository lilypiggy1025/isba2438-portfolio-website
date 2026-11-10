import Link from "next/link";
import localFont from "next/font/local";
import headerStyles from "../page.module.css";
import styles from "./page.module.css";
import ProjectsNavigation from "./ProjectsNavigation";

const pinyon = localFont({ src: "../../public/fonts/PinyonScript-Regular.ttf", variable: "--font-pinyon", display: "swap", weight: "400" });

export default function ProjectsLayout({ children }: { children: React.ReactNode }) {
  return <div className={`${styles.page} ${pinyon.variable}`}>
    <header className={headerStyles.header}>
      <Link href="/" className={headerStyles.wordmark} aria-label="Portfolio home">Portfolio<span aria-hidden="true">✧</span></Link>
      <ProjectsNavigation />
    </header>
    {children}
  </div>;
}

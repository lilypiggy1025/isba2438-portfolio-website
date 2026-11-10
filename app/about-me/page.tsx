import Navigation from "../components/Navigation";
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import localFont from "next/font/local";
import headerStyles from "../page.module.css";
import styles from "./page.module.css";

const pinyon = localFont({
  src: "../../public/fonts/PinyonScript-Regular.ttf",
  variable: "--font-pinyon",
  display: "swap",
  weight: "400",
});

export const metadata: Metadata = { title: "About Me | LIWEN CHEN" };


export default function AboutMe() {
  return (
    <div className={`${styles.page} ${pinyon.variable}`}>
      {/* Reuse Home's exact header classes without altering its approved source. */}
      <header className={headerStyles.header}>
        <Link href="/" className={headerStyles.wordmark} aria-label="Portfolio home">Portfolio<span aria-hidden="true">✧</span></Link>
        <Navigation />
      </header>
      <main className={styles.composition}>
        <div className={styles.collage} role="img" aria-label="Liwen Chen’s portrait in a layered sage scrapbook collage">
          <div className={styles.kraftPaper}>
            <Image className={styles.kraftTexture} src="/decorations/kraft-paper.PNG" width={1171} height={1561} sizes="(max-width: 760px) 65vw, 340px" alt="" />
          </div>
          <Image className={styles.gingham} src="/decorations/green-gingham.PNG" width={1179} height={1572} sizes="(max-width: 760px) 65vw, 340px" alt="" />
          <div className={styles.photoFrame}>
            <Image className={styles.portrait} src="/about-me-photo.jpg" alt="Liwen Chen" fill sizes="(max-width: 760px) 65vw, 340px" />
          </div>
          <Image className={styles.metalClip} src="/decorations/metal-clip.PNG" width={858} height={460} sizes="110px" alt="" />
          <div className={styles.buttonPosition} aria-hidden="true">
            <Image className={styles.sewingButton} src="/decorations/brown-button.PNG" width={1637} height={1595} sizes="90px" alt="" />
          </div>
          <div className={styles.cloverPosition} aria-hidden="true">
            <svg width="0" height="0" className={styles.colorFilter} aria-hidden="true">
              <defs>
                <filter id="clover-sage" colorInterpolationFilters="sRGB">
                  {/* Green chroma mask: neutral whites receive no treatment. */}
                  <feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  -3 6 -3 0 0" result="greenMask" />
                  <feColorMatrix in="SourceGraphic" type="saturate" values="1.15" result="muted" />
                  <feComponentTransfer in="muted" result="deeper">
                    <feFuncR type="linear" slope="0.65" />
                    <feFuncG type="linear" slope="0.78" />
                    <feFuncB type="linear" slope="0.52" />
                  </feComponentTransfer>
                  <feComposite in="deeper" in2="greenMask" operator="in" result="greenTreatment" />
                  <feComposite in="greenTreatment" in2="SourceGraphic" operator="atop" />
                </filter>
              </defs>
            </svg>
            <Image className={styles.clover} src="/decorations/green-clover-new.PNG" width={650} height={680} sizes="120px" alt="" />
          </div>
        </div>
        <section className={styles.introduction} aria-labelledby="about-heading">
          <h1 id="about-heading">Hi!&nbsp;&nbsp;I&apos;m Liwen Chen.</h1>
          <p className={styles.subtitle}>This is my world.</p>
          <div className={styles.informationCard}>
            <p>I&apos;m from Nantong, Jiangsu, China. I&apos;m currently studying in the United States. I&apos;m a friendly, open-minded, and curious person who loves exploring new things and different cultures.</p>
            <p>In my free time, I enjoy traveling, listening to music, and photography. I love capturing special moments and finding inspiration in everyday life.</p>
          </div>
          <Link className={styles.contact} href="/contact-me-server-form">contact me →</Link>
        </section>
      </main>
    </div>
  );
}

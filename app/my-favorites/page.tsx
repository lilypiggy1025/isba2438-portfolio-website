import type { Metadata } from "next";
import Image from "next/image";
import BlogShell from "../blogs/BlogShell";
import Favorites from "./Favorites";
import styles from "./favorites.module.css";

export const metadata: Metadata = { title: "My Favorites | LIWEN CHEN" };

export default function MyFavoritesPage() {
  return <div className={styles.page}><BlogShell>
    <div className={styles.titleComposition}>
      <div className={`${styles.polaroid} ${styles.firstPhoto}`} aria-hidden="true">
        <Image src="/favotites/IMG_3187.jpg" alt="" width={1162} height={1549} sizes="(max-width: 480px) 110px, 150px" />
      </div>
      <div className={styles.intro}>
        <h1>My Favorites</h1>
        <p>A little collection of movies, books, music, and websites I love.</p>
      </div>
      <div className={`${styles.polaroid} ${styles.pinkPhoto}`} aria-hidden="true">
        <Image src="/favotites/IMG_3189.jpg" alt="" width={698} height={932} sizes="(max-width: 480px) 110px, 150px" />
      </div>
    </div>
    <div className={styles.contentComposition}>
    <Favorites />
    <div className={styles.collectionPhoto} aria-hidden="true">
      <div className={`${styles.polaroid} ${styles.lastPhoto}`}>
        <Image src="/favotites/IMG_3188.jpg" alt="" width={1164} height={1552} sizes="(max-width: 480px) 120px, 170px" />
      </div>
    </div>
    </div>
  </BlogShell></div>;
}

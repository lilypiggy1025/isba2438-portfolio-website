import Image from "next/image";
import type { Project } from "@/lib/projects/types";
import Link from "next/link";
import styles from "./InspirationBoard.module.css";

const photos = [
  { file: "IMG_2953.jpg", width: 1170, height: 1560 },
  { file: "IMG_2954.jpg", width: 1168, height: 1558 },
  { file: "IMG_2955.jpg", width: 1171, height: 1561 },
  { file: "IMG_2957.jpg", width: 1172, height: 1563 },
];

export default function InspirationBoard({ project }: { project: Project }) {
  return <main className={styles.board}>
    <div className={styles.titleArea}>
      <h1>{project.title}</h1>
      <p className={styles.subtitle}>{project.subtitle}</p>
      <div className={styles.arrowRow}><Link href="/projects" aria-label="Return to My Projects">
        <Image src="/creative-space/IMG_2966.PNG" alt="" width={525} height={368} className={styles.arrow} />
      </Link></div>
    </div>
    <div className={styles.editorial}>
      <div className={styles.prose}>
        {project.description.split(/\n\s*\n/).filter(Boolean).map((paragraph, index) => {
          const firstSpace = paragraph.indexOf(" ");
          const opening = firstSpace === -1 ? paragraph : paragraph.slice(0, firstSpace);
          const rest = firstSpace === -1 ? "" : paragraph.slice(firstSpace);
          return <p key={index}><span className={styles.openingWord}>{opening}</span>{rest}</p>;
        })}
      </div>
      <div className={styles.collage} aria-label="Photography inspiration scrapbook">
        {photos.map((photo, index) => <figure className={styles.frame} key={photo.file}>
          <Image src={`/inspiration-board/${photo.file}`} alt={`Photography inspiration, image ${index + 1}`} width={photo.width} height={photo.height} sizes="(max-width: 760px) 38vw, 22vw" />
        </figure>)}
      </div>
    </div>
  </main>;
}

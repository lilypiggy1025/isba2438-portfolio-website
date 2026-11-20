import Image from "next/image";
import Link from "next/link";
import type { Project } from "@/lib/projects/types";
import styles from "./StandardProject.module.css";

export default function StandardProject({ project }: { project: Project }) {
  return <main className={styles.page}>
    <header className={styles.hero}>
      <h1>{project.title}</h1>
      {project.subtitle && <p>{project.subtitle}</p>}
    </header>
    <Link href="/projects" className={styles.back} aria-label="Back to My Projects">
      <Image src="/creative-space/IMG_2966.PNG" alt="" width={525} height={368} sizes="90px" />
    </Link>
    <div className={styles.spread}>
      <div className={styles.photograph}>
        <figure className={styles.polaroid}>
          <Image src={project.image} alt={project.title} width={1000} height={1000}
            sizes="(max-width: 760px) 80vw, 480px" className={styles.image} />
        </figure>
      </div>
      <div className={styles.journal}>
        <span className={styles.ornament} aria-hidden="true">✧</span>
        <div className={styles.description}>{project.description}</div>
      </div>
    </div>
  </main>;
}

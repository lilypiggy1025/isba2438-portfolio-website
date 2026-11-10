import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { projects } from "./projects";
import styles from "./page.module.css";

export const metadata: Metadata = { title: "My Projects | LIWEN CHEN" };

export default function ProjectsPage() {
  return <main className={`${styles.content} ${styles.landing}`}>
    <h1 className={styles.heading}>My Projects</h1>
    <p className={styles.subtitle}>A little creativity, a little inspiration.</p>
    <div className={styles.grid}>{projects.map((project) => <article key={project.slug} className={styles.card}>
      <Image src={project.image} alt="" fill sizes="(max-width: 700px) 85vw, 45vw" className={styles.photo} />
      <div className={styles.shade} />
      <div className={styles.cardContent}>
        <h2>{project.title}</h2>
        <Link className={styles.explore} href={`/projects/${project.slug}`}>Explore <span aria-hidden="true">↗</span><span className={styles.srOnly}> {project.title}</span></Link>
      </div>
    </article>)}</div>
  </main>;
}

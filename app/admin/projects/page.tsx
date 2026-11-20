import type { Metadata } from "next";
import { Suspense } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { readdir } from "node:fs/promises";
import path from "node:path";
import { authorized } from "@/lib/contact/auth";
import BlogShell from "../../blogs/BlogShell";
import ProjectManager from "./ProjectManager";
import styles from "./projects.module.css";

export const metadata: Metadata = { title: "Manage Projects | LIWEN CHEN", robots: { index: false, follow: false } };

async function localImages(directory: string, prefix = ""): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const images = await Promise.all(entries.map(async (entry): Promise<string[]> => {
    const relative = `${prefix}/${entry.name}`;
    if (entry.isDirectory()) return localImages(path.join(directory, entry.name), relative);
    return entry.isFile() && /^\/[A-Za-z0-9_./-]+\.(png|jpe?g|webp|gif|avif)$/i.test(relative) ? [relative] : [];
  }));
  return images.flat().sort();
}

async function Management() {
  await connection();
  const cookieStore = await cookies();
  const initialAuthenticated = authorized(new Request("http://localhost", { headers: { cookie: cookieStore.toString() } }));
  const images = await localImages(path.join(process.cwd(), "public"));
  return <ProjectManager initialAuthenticated={initialAuthenticated} images={images} />;
}

export default function ProjectsAdminPage() {
  return <div className={styles.page}><BlogShell>
    <div className={styles.intro}><h1>Manage Projects</h1><p>Administrator access</p></div>
    <Suspense fallback={<p role="status">Loading project management…</p>}><Management /></Suspense>
  </BlogShell></div>;
}

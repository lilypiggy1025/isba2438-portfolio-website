import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import { projectStore } from "@/lib/projects/storage";
import StandardProject from "./StandardProject";
import CreativeGallery from "./CreativeGallery";
import InspirationBoard from "./InspirationBoard";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await connection();
  const { slug } = await params;
  const project = await projectStore.find(slug);
  if (!project) notFound();
  return { title: `${project.title} | LIWEN CHEN` };
}

export default function ProjectPage({ params }: Props) {
  return <Suspense fallback={<p role="status">Loading project…</p>}>
    <ProjectContent params={params} />
  </Suspense>;
}

async function ProjectContent({ params }: Props) {
  await connection();
  const { slug } = await params;
  const project = await projectStore.find(slug);
  if (!project) notFound();
  switch (project.layout) {
    case "creative-gallery": return <CreativeGallery project={project} />;
    case "inspiration-board": return <InspirationBoard project={project} />;
    case "standard": return <StandardProject project={project} />;
    default: notFound();
  }
}

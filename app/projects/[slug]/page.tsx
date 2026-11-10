import type { Metadata } from "next";
import { Suspense } from "react";
import { notFound } from "next/navigation";
import { projects } from "../projects";
import CreativeGallery from "./CreativeGallery";
import InspirationBoard from "./InspirationBoard";

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return projects.map(({ slug }) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  return { title: `${project.title} | LIWEN CHEN` };
}

export default function ProjectPage({ params }: Props) {
  return <Suspense fallback={<p role="status">Loading project…</p>}>
    <ProjectContent params={params} />
  </Suspense>;
}

async function ProjectContent({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  if (slug === "creative-space") return <CreativeGallery />;
  return <InspirationBoard />;
}

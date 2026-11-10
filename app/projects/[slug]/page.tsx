import type { Metadata } from "next";
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

export default async function ProjectPage({ params }: Props) {
  const { slug } = await params;
  const project = projects.find((item) => item.slug === slug);
  if (!project) notFound();
  if (slug === "creative-space") return <CreativeGallery />;
  return <InspirationBoard />;
}

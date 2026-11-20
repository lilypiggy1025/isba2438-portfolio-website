import { projects } from "../../app/projects/projects";
import type { Project } from "./types";

// Existing projects have no recorded creation date. Use a stable baseline for seed metadata.
const baseline = "1970-01-01T00:00:00.000Z";

export function originalProjects(): Project[] {
  return projects.map((project) => ({
    ...project,
    subtitle: project.slug === "creative-space"
      ? "Click any label to unfold images in that line ✦"
      : "Little moments, endless inspiration ✦",
    description: project.slug === "creative-space" ? "" :
      "Photography has always been one of my favorite ways to capture the little moments in life. I love traveling to new places, exploring unfamiliar streets, and discovering beauty in everyday scenes.\n\nI also enjoy looking through other photographers' work and photo books. Their perspectives inspire me to see the world differently and bring fresh ideas into my own creative journey.",
    layout: project.slug === "creative-space" ? "creative-gallery" : "inspiration-board",
    createdAt: baseline,
    updatedAt: baseline,
  }));
}

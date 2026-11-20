import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { originalProjects } from "./seeds";
import { validateProject } from "./validation";
import type { CreateProjectInput, Project, UpdateProjectInput } from "./types";

export const PROJECTS_FILE = path.join(process.cwd(), "data", "projects.json");

function parseProjects(raw: string): Project[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Project storage must contain an array.");
  const slugs = new Set<string>();
  for (const project of data) {
    if (!project || typeof project !== "object" ||
      !["creative-gallery", "inspiration-board", "standard"].includes(project.layout) ||
      !validateProject(project, project.layout).valid ||
      typeof project.slug !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(project.slug) || slugs.has(project.slug) ||
      typeof project.createdAt !== "string" || !Number.isFinite(Date.parse(project.createdAt)) ||
      typeof project.updatedAt !== "string" || !Number.isFinite(Date.parse(project.updatedAt)) ||
      Date.parse(project.updatedAt) < Date.parse(project.createdAt)) {
      throw new Error("Invalid stored project.");
    }
    slugs.add(project.slug);
  }
  return data;
}

export function createProjectStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();

  async function list(): Promise<Project[]> {
    try {
      return parseProjects(await readFile(file, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return originalProjects();
      throw error;
    }
  }

  async function write(projects: Project[]) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(projects, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  function mutate<T>(operation: (projects: Project[]) => Promise<T>): Promise<T> {
    const pending = queue.then(async () => operation(await list()));
    queue = pending.catch(() => {});
    return pending;
  }

  return {
    list,
    async find(slug: string) {
      return (await list()).find((project) => project.slug === slug);
    },
    create(input: CreateProjectInput): Promise<Project> {
      return mutate(async (projects) => {
        const result = validateProject(input);
        if (!result.valid) throw new Error(Object.values(result.errors).join(" "));
        const base = result.values.title.normalize("NFKD").replace(/\p{M}/gu, "").toLowerCase()
          .replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "project";
        const used = new Set(projects.map((project) => project.slug));
        let slug = base;
        for (let suffix = 2; used.has(slug); suffix++) slug = `${base}-${suffix}`;
        const timestamp = new Date().toISOString();
        const project: Project = { ...result.values, slug, layout: "standard", createdAt: timestamp, updatedAt: timestamp };
        await write([...projects, project]);
        return project;
      });
    },
    update(slug: string, input: UpdateProjectInput): Promise<Project | undefined> {
      return mutate(async (projects) => {
        const existing = projects.find((project) => project.slug === slug);
        const result = validateProject(input, existing?.layout);
        if (!result.valid) throw new Error(Object.values(result.errors).join(" "));
        if (!existing) return undefined;
        const updatedAt = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt))).toISOString();
        const updated = { ...existing, ...result.values, updatedAt };
        await write(projects.map((project) => project.slug === slug ? updated : project));
        return updated;
      });
    },
    delete(slug: string): Promise<boolean> {
      return mutate(async (projects) => {
        if (!projects.some((project) => project.slug === slug)) return false;
        await write(projects.filter((project) => project.slug !== slug));
        return true;
      });
    },
  };
}

export const projectStore = createProjectStore(PROJECTS_FILE);

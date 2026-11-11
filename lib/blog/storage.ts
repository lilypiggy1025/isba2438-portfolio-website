import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { BlogInput } from "./validation";

export type BlogPost = BlogInput & { slug: string; createdAt: string };
export const BLOG_FILE = path.join(process.cwd(), "data", "blog-posts.json");

export function createBlogStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();

  async function list(): Promise<BlogPost[]> {
    try {
      const posts: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(posts)) throw new Error("Blog storage must contain a JSON array.");
      return posts;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  return {
    list,
    async find(slug: string) {
      return (await list()).find((post) => post.slug === slug);
    },
    save(values: BlogInput): Promise<BlogPost> {
      const operation = queue.then(async () => {
        const posts = await list();
        const base = values.title.normalize("NFKD").replace(/\p{M}/gu, "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
        const used = new Set(posts.map((post) => post.slug));
        let slug = base;
        for (let suffix = 2; used.has(slug); suffix++) slug = base + "-" + suffix;

        const post = { ...values, slug, createdAt: new Date().toISOString() };
        await mkdir(path.dirname(file), { recursive: true });
        const temporary = file + "." + randomUUID() + ".tmp";
        try {
          await writeFile(temporary, JSON.stringify([post, ...posts], null, 2) + "\n", { flag: "wx", mode: 0o600 });
          await rename(temporary, file);
        } finally {
          await unlink(temporary).catch(() => {});
        }
        return post;
      });
      queue = operation.catch(() => {});
      return operation;
    },
  };
}

export const blogStore = createBlogStore(BLOG_FILE);

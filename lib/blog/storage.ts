import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateBlog, type BlogInput } from "@/lib/blog/validation";

export type BlogPost = BlogInput & { slug: string; createdAt: string };
export const BLOG_FILE = path.join(process.cwd(), "data", "blog-posts.json");

export function createBlogStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();

  async function list(): Promise<BlogPost[]> {
    try {
      const posts: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(posts)) throw new Error("Blog storage must contain a JSON array.");
      const slugs = new Set<string>();
      for (const post of posts) {
        if (!post || typeof post !== "object" || typeof post.slug !== "string" ||
          !post.slug || slugs.has(post.slug) || typeof post.title !== "string" ||
          typeof post.content !== "string" || typeof post.createdAt !== "string" ||
          !Number.isFinite(Date.parse(post.createdAt))) {
          throw new Error("Invalid stored blog post.");
        }
        slugs.add(post.slug);
      }
      return posts;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async function write(posts: BlogPost[]) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = file + "." + randomUUID() + ".tmp";
    try {
      await writeFile(temporary, JSON.stringify(posts, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }

  function mutate<T>(operation: (posts: BlogPost[]) => Promise<T>): Promise<T> {
    const pending = queue.then(async () => operation(await list()));
    queue = pending.catch(() => {});
    return pending;
  }

  return {
    list,
    async find(slug: string) {
      return (await list()).find((post) => post.slug === slug);
    },
    save(values: BlogInput): Promise<BlogPost> {
      return mutate(async (posts) => {
        const base = values.title.normalize("NFKD").replace(/\p{M}/gu, "")
          .toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "post";
        const used = new Set(posts.map((post) => post.slug));
        let slug = base;
        for (let suffix = 2; used.has(slug); suffix++) slug = base + "-" + suffix;

        const post = { ...values, slug, createdAt: new Date().toISOString() };
        await write([post, ...posts]);
        return post;
      });
    },
    update(slug: string, input: BlogInput): Promise<BlogPost | undefined> {
      return mutate(async (posts) => {
        const result = validateBlog(input);
        if (!result.valid) throw new Error(Object.values(result.errors).join(" "));
        const existing = posts.find((post) => post.slug === slug);
        if (!existing) return undefined;
        const updated = { ...existing, ...result.values };
        await write(posts.map((post) => post.slug === slug ? updated : post));
        return updated;
      });
    },
    delete(slug: string): Promise<boolean> {
      return mutate(async (posts) => {
        if (!posts.some((post) => post.slug === slug)) return false;
        await write(posts.filter((post) => post.slug !== slug));
        return true;
      });
    },
  };
}

export const blogStore = createBlogStore(BLOG_FILE);

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { BlogPost } from "@/lib/blog/storage";
import styles from "./blog.module.css";
import journal from "./journal.module.css";

const publicationDate = new Intl.DateTimeFormat("en", {
  dateStyle: "long",
  timeZone: "UTC",
});

export default function BlogList() {
  const [posts, setPosts] = useState<BlogPost[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      try {
        const response = await fetch("/api/blogs", { signal: controller.signal });
        if (!response.ok) throw new Error("Could not load blog posts.");
        const result: { posts: BlogPost[] } = await response.json();
        if (!controller.signal.aborted) setPosts(result.posts);
      } catch {
        if (!controller.signal.aborted) setError(true);
      }
    }
    void load();
    return () => controller.abort();
  }, []);

  if (error) return <p role="alert" className={styles.error}>Could not load posts. Please refresh to try again.</p>;
  if (!posts) return <p role="status">Loading posts…</p>;
  if (!posts.length) {
    return (
      <div className={journal.empty}>
        <span aria-hidden="true">✧</span>
        <h3>Every story starts somewhere.</h3>
        <Link href="/admin/blogs" className={journal.storyLink}>Create the first post</Link>
      </div>
    );
  }

  return (
    <div className={journal.grid}>
      {posts.map((post) => (
        <article className={journal.story} key={post.slug}>
          <time className={styles.date} dateTime={post.createdAt}>{publicationDate.format(new Date(post.createdAt))}</time>
          <h3><Link href={"/blogs/" + post.slug}>{post.title}</Link></h3>
          <p>{post.content.length > 180 ? post.content.slice(0, 180).trimEnd() + "…" : post.content}</p>
          <Link href={"/blogs/" + post.slug} className={journal.storyLink} aria-label={`Read story: ${post.title}`}>
            Read story <span aria-hidden="true">↗</span>
          </Link>
        </article>
      ))}
    </div>
  );
}

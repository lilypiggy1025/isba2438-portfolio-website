"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { BlogPost } from "@/lib/blog/storage";
import BlogEditor from "../../admin/blogs/BlogEditor";
import styles from "../blog.module.css";

export default function BlogPostActions({ post }: { post: BlogPost }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [refreshing, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const busy = useRef(false);
  const pending = deleting || refreshing;

  async function deletePost() {
    if (busy.current || pending || !window.confirm(`Delete “${post.title}”?`)) return;
    busy.current = true;
    setDeleting(true);
    setError("");
    setStatus("");
    try {
      const response = await fetch(`/api/blogs/${encodeURIComponent(post.slug)}`, { method: "DELETE" });
      if (response.status !== 204) {
        const result = await response.json();
        throw new Error(result.message || "Could not delete the post. Please try again.");
      }
      setStatus("Post deleted. Returning to blogs…");
      startTransition(() => {
        router.replace("/blogs");
        router.refresh();
      });
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not delete the post. Please try again.");
    } finally {
      busy.current = false;
      setDeleting(false);
    }
  }

  return <section className={styles.postActions} aria-label="Manage blog post" aria-busy={pending}>
    {editing ? <>
      <h2>Edit post</h2>
      <BlogEditor key={post.slug} post={post} onCancel={() => {
        setEditing(false);
      }} onSaved={() => {
        setEditing(false);
        setStatus("Post updated.");
        startTransition(() => router.refresh());
      }} />
    </> : <div className={styles.actions}>
      <button type="button" className={styles.button} disabled={pending} onClick={() => {
        setEditing(true);
        setError("");
        setStatus("");
      }}>Edit</button>
      <button type="button" className={styles.button} disabled={pending} onClick={deletePost}>{deleting ? "Deleting…" : "Delete"}</button>
    </div>}
    <p role="alert" className={styles.error}>{error}</p>
    <p role="status">{status}</p>
  </section>;
}

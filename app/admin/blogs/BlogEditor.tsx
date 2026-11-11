"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { BlogErrors } from "@/lib/blog/validation";
import styles from "../../blogs/blog.module.css";

type Feedback =
  | { ok: true; post: { slug: string } }
  | { ok: false; message: string; errors?: BlogErrors };

export default function BlogEditor() {
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const errors = feedback?.ok === false ? feedback.errors : undefined;

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;

    const form = event.currentTarget;
    const body = JSON.stringify(Object.fromEntries(new FormData(form)));
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/blogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result: Feedback = await response.json();
      setFeedback(result);
      if (response.ok && result.ok) form.reset();
    } catch {
      setFeedback({ ok: false, message: "Could not complete the request. Please try again." });
    } finally {
      setPending(false);
    }
  }

  return (
    <form className={styles.card + " " + styles.form} onSubmit={publish} noValidate>
      {feedback?.ok && (
        <p role="status">Post published. <Link href={"/blogs/" + feedback.post.slug}>Read your post</Link></p>
      )}
      {feedback?.ok === false && <p role="alert" className={styles.error}>{feedback.message}</p>}
      <div className={styles.field}>
        <label htmlFor="blog-title">Title:</label>
        <input id="blog-title" name="title" required maxLength={120} disabled={pending}
          aria-invalid={Boolean(errors?.title)} aria-describedby={errors?.title ? "title-error" : undefined} />
        {errors?.title && <p id="title-error" className={styles.error}>{errors.title}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="blog-content">Content:</label>
        <textarea id="blog-content" name="content" rows={10} required maxLength={20000} disabled={pending}
          aria-invalid={Boolean(errors?.content)} aria-describedby={errors?.content ? "content-error" : undefined} />
        {errors?.content && <p id="content-error" className={styles.error}>{errors.content}</p>}
      </div>
      <button type="submit" className={styles.button} disabled={pending}>{pending ? "Publishing…" : "Publish post"}</button>
    </form>
  );
}

"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";
import type { BlogErrors } from "@/lib/blog/validation";
import styles from "../../blogs/blog.module.css";

type Feedback =
  | { ok: true; post: { slug: string } }
  | { ok: false; message: string; errors?: BlogErrors };

type Props = {
  post?: { slug: string; title: string; content: string };
  onSaved?: () => void;
  onCancel?: () => void;
};

export default function BlogEditor({ post, onSaved, onCancel }: Props) {
  const busy = useRef(false);
  const [pending, setPending] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const errors = feedback?.ok === false ? feedback.errors : undefined;

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy.current) return;

    const form = event.currentTarget;
    const body = JSON.stringify(Object.fromEntries(new FormData(form)));
    busy.current = true;
    setPending(true);
    setFeedback(null);
    try {
      const response = await fetch(post ? `/api/blogs/${encodeURIComponent(post.slug)}` : "/api/blogs", {
        method: post ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const result: Feedback = await response.json();
      setFeedback(result);
      if (response.ok && result.ok) {
        if (post) onSaved?.();
        else form.reset();
      } else if (result.ok) {
        setFeedback({ ok: false, message: "Could not save the post. Please try again." });
      }
    } catch {
      setFeedback({ ok: false, message: "Could not complete the request. Please try again." });
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <form className={styles.card + " " + styles.form} onSubmit={publish} noValidate>
      {feedback?.ok && (
        <p role="status">{post ? "Post updated." : "Post published."} <Link href={"/blogs/" + feedback.post.slug}>Read your post</Link></p>
      )}
      {feedback?.ok === false && <p role="alert" className={styles.error}>{feedback.message}</p>}
      <div className={styles.field}>
        <label htmlFor="blog-title">Title:</label>
        <input id="blog-title" name="title" defaultValue={post?.title} required maxLength={120} disabled={pending}
          aria-invalid={Boolean(errors?.title)} aria-describedby={errors?.title ? "title-error" : undefined} />
        {errors?.title && <p id="title-error" className={styles.error}>{errors.title}</p>}
      </div>
      <div className={styles.field}>
        <label htmlFor="blog-content">Content:</label>
        <textarea id="blog-content" name="content" defaultValue={post?.content} rows={10} required maxLength={20000} disabled={pending}
          aria-invalid={Boolean(errors?.content)} aria-describedby={errors?.content ? "content-error" : undefined} />
        {errors?.content && <p id="content-error" className={styles.error}>{errors.content}</p>}
      </div>
      <div className={styles.actions}>
        <button type="submit" className={styles.button} disabled={pending}>{pending ? (post ? "Saving…" : "Publishing…") : (post ? "Save changes" : "Publish post")}</button>
        {post && <button type="button" className={styles.button} disabled={pending} onClick={onCancel}>Cancel</button>}
      </div>
    </form>
  );
}

import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { blogStore } from "@/lib/blog/storage";
import BlogShell from "../BlogShell";
import styles from "../blog.module.css";

type Props = { params: Promise<{ slug: string }> };

export default function BlogPostPage({ params }: Props) {
  return (
    <BlogShell>
      <Link href="/blogs" className={styles.link}>Back to blog</Link>
      <Suspense fallback={<p role="status">Loading post…</p>}>
        <PostContent params={params} />
      </Suspense>
    </BlogShell>
  );
}

async function PostContent({ params }: Props) {
  const { slug } = await params;
  const post = await blogStore.find(slug);
  if (!post) notFound();

  return (
    <article className={styles.card}>
      <time className={styles.date} dateTime={post.createdAt}>{post.createdAt.slice(0, 10)}</time>
      <h1 className={styles.heading}>{post.title}</h1>
      <p className={styles.content}>{post.content}</p>
    </article>
  );
}

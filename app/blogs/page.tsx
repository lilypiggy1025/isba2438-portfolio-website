import Image from "next/image";
import Link from "next/link";
import BlogList from "./BlogList";
import BlogShell from "./BlogShell";
import styles from "./blog.module.css";
import journal from "./journal.module.css";

export default function BlogsPage() {
  return (
    <BlogShell>
      <section className={journal.hero} aria-labelledby="journal-headline">
        <figure className={`${journal.print} ${journal.firstPrint}`}>
          <Image src="/blog-decor/IMG_2988.jpg" alt="" width={1025} height={732} sizes="(max-width: 650px) 40vw, 200px" />
        </figure>
        <div className={journal.intro}>
          <p className={journal.label}>LIWEN&apos;S CREATIVE JOURNAL</p>
          <h1 id="journal-headline">Little moments, big stories.</h1>
          <p className={journal.subtitle}>A collection of travel notes, creative thoughts, and everyday inspirations.</p>
          <Link href="/admin/blogs" className={`${styles.button} ${journal.createLink}`}>
            Create a blog post
          </Link>
        </div>
        <figure className={`${journal.print} ${journal.secondPrint}`}>
          <Image src="/blog-decor/IMG_2992.jpg" alt="" width={996} height={711} sizes="(max-width: 650px) 40vw, 200px" />
        </figure>
      </section>
      <section className={journal.entries} aria-labelledby="journal-entries">
        <h2 id="journal-entries" className={journal.sectionHeading}>The Journal</h2>
        <BlogList />
      </section>
    </BlogShell>
  );
}

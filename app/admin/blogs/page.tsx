import Image from "next/image";
import Link from "next/link";
import BlogShell from "../../blogs/BlogShell";
import styles from "../../blogs/blog.module.css";
import BlogEditor from "./BlogEditor";
import scrapbook from "./scrapbook.module.css";

const photos = [
  { file: "IMG_2988.jpg", width: 1025, height: 732 },
  { file: "IMG_2989.jpg", width: 1019, height: 728 },
  { file: "IMG_2990.jpg", width: 1008, height: 721 },
  { file: "IMG_2991.jpg", width: 1018, height: 728 },
  { file: "IMG_2992.jpg", width: 996, height: 711 },
  { file: "IMG_2993.jpg", width: 1008, height: 720 },
];

function PhotoColumn({ images, side }: { images: typeof photos; side: "left" | "right" }) {
  return (
    <div className={scrapbook.photos + " " + scrapbook[side]} aria-hidden="true">
      {images.map(({ file, width, height }) => (
        <figure key={file} className={scrapbook.print}>
          <Image
            src={"/blog-decor/" + file}
            alt=""
            width={width}
            height={height}
            sizes="(max-width: 800px) 26vw, 180px"
          />
        </figure>
      ))}
    </div>
  );
}

export default function BlogAdminPage() {
  return (
    <BlogShell>
      <div className={scrapbook.spread}>
        <section className={scrapbook.editor} aria-labelledby="blog-admin-heading">
          <Link href="/blogs" className={styles.link}>View blog posts</Link>
          <h1 id="blog-admin-heading" className={styles.heading}>Create a blog post</h1>
          <BlogEditor />
        </section>
        <PhotoColumn images={photos.slice(0, 3)} side="left" />
        <PhotoColumn images={photos.slice(3)} side="right" />
      </div>
    </BlogShell>
  );
}

"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import styles from "./CreativeGallery.module.css";

const photos = [2958, 2959, 2960, 2961, 2962, 2963].map((number, index) => ({
  src: `/creative-space/IMG_${number}.jpg`, label: `Creative Space photograph ${index + 1}`,
}));

export default function CreativeGallery() {
  const [selected, setSelected] = useState<number | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const isOpen = selected !== null;

  useEffect(() => {
    if (!isOpen) return;
    const modal = dialog.current;
    if (!modal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    modal.showModal();
    return () => {
      modal.close();
      document.body.style.overflow = previousOverflow;
      trigger.current?.focus({ preventScroll: true });
    };
  }, [isOpen]);

  const step = (direction: number) => setSelected((index) => index === null ? null : (index + direction + photos.length) % photos.length);

  return <main className={styles.creative}>
    <div className={styles.titleGroup}>
      <h1>My Creative Space</h1>
      <p className={styles.subtitle}>Click any label to unfold images in that line ✦</p>
    </div>
    <div className={styles.illustrations}>
      <Image src="/creative-space/IMG_2964.jpg" alt="Hand-drawn camera" width={1123} height={1354} className={styles.camera} />
      <Link href="/projects" aria-label="Return to My Projects" className={styles.returnArrow}>
        <Image src="/creative-space/IMG_2966.PNG" alt="" width={525} height={368} />
      </Link>
    </div>
    <div className={styles.gallery} aria-label="Creative Space photographs">
      {photos.map((photo, index) => <button type="button" key={photo.src} className={styles.thumbnail} aria-label={`Enlarge ${photo.label}`} onClick={(event) => { trigger.current = event.currentTarget; setSelected(index); }}>
        <Image src={photo.src} alt={photo.label} fill sizes="(max-width: 760px) 42vw, 15vw" />
      </button>)}
    </div>
    <dialog ref={dialog} className={styles.lightbox} aria-label="Photograph viewer" onCancel={(event) => { event.preventDefault(); setSelected(null); }} onClick={(event) => { if (event.target === event.currentTarget) setSelected(null); }} onKeyDown={(event) => {
      if (event.key === "ArrowLeft") { event.preventDefault(); step(-1); }
      if (event.key === "ArrowRight") { event.preventDefault(); step(1); }
    }}>
      {selected !== null && <>
        <button type="button" className={styles.close} aria-label="Close photograph viewer" onClick={() => setSelected(null)} autoFocus>×</button>
        <button type="button" className={styles.previous} aria-label="Previous photograph" onClick={() => step(-1)}>‹</button>
        <div className={styles.enlarged}>
          <Image src={photos[selected].src} alt={photos[selected].label} fill sizes="100vw" quality={100} unoptimized />
        </div>
        <button type="button" className={styles.next} aria-label="Next photograph" onClick={() => step(1)}>›</button>
        <span className={styles.counter} aria-live="polite">{selected + 1} / {photos.length}</span>
      </>}
    </dialog>
  </main>;
}

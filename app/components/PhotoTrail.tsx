"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import styles from "./PhotoTrail.module.css";

const photos = [2932, 2933, 2934, 2935, 2937, 2939].map(
  (number) => `/photos/IMG_${number}.jpg`,
);
// 1,800ms animations at 110ms spawn intervals need up to 17 slots.
// Extra headroom allows images to load without blocking the next cycle.
const maxCards = 24;

type Card = { id: number; src: string; x: number; y: number; width: number; rotation: number; loaded: boolean };

/** Decorative mouse-only trail, confined to its parent cover. */
export default function PhotoTrail() {
  const overlay = useRef<HTMLDivElement>(null);
  const activeCards = useRef(new Set<number>());
  const sequence = useRef(0);
  const imageIndex = useRef(0);
  const [cards, setCards] = useState<Card[]>([]);

  useEffect(() => {
    const active = activeCards.current;
    const layer = overlay.current;
    const surface = layer?.parentElement;
    if (!layer || !surface) return;

    const preference = window.matchMedia(
      "(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)",
    );
    let previous: { x: number; y: number } | null = null;
    let lastTime = -Infinity;

    const reset = () => {
      previous = null;
      active.clear();
      setCards([]);
    };
    const move = (event: PointerEvent) => {
      if (!preference.matches || event.pointerType !== "mouse") return;
      const now = performance.now();
      const { clientX: x, clientY: y } = event;
      if (previous && Math.hypot(x - previous.x, y - previous.y) < 90) return;
      if (now - lastTime < 110 || active.size >= maxCards) return;
      const bounds = layer.getBoundingClientRect();
      // Rotation-safe margins keep the portrait frame inside the viewport.
      const availableWidth = Math.min(bounds.right, window.innerWidth) - Math.max(bounds.left, 0);
      const availableHeight = Math.min(bounds.bottom, window.innerHeight) - Math.max(bounds.top, 0);
      const width = Math.min(138, availableWidth / 1.4, availableHeight / 1.7);
      if (width < 40) return;
      const margin = width * 0.15;
      const minX = Math.max(0, -bounds.left) + margin;
      const minY = Math.max(0, -bounds.top) + margin;
      const maxX = Math.min(bounds.width, window.innerWidth - bounds.left) - width - margin;
      const maxY = Math.min(bounds.height, window.innerHeight - bounds.top) - width * 4 / 3 - margin;
      const id = sequence.current++;
      const photoIndex = imageIndex.current;
      imageIndex.current = (photoIndex + 1) % photos.length;
      const card: Card = {
        id,
        loaded: false,
        src: photos[photoIndex],
        x: Math.max(minX, Math.min(maxX, x - bounds.left - width / 2)),
        y: Math.max(minY, Math.min(maxY, y - bounds.top - width * 2 / 3)),
        width,
        rotation: [-7, 5, -3, 8, -5, 3][id % 6],
      };
      active.add(id);
      setCards((current) => [...current, card]);
      previous = { x, y };
      lastTime = now;
    };
    const leave = () => { previous = null; };
    surface.addEventListener("pointermove", move, { passive: true });
    surface.addEventListener("pointerleave", leave);
    preference.addEventListener("change", reset);
    window.addEventListener("resize", reset);
    return () => {
      surface.removeEventListener("pointermove", move);
      surface.removeEventListener("pointerleave", leave);
      preference.removeEventListener("change", reset);
      window.removeEventListener("resize", reset);
      active.clear();
    };
  }, []);

  const removeCard = (id: number) => {
    activeCards.current.delete(id);
    setCards((current) => current.filter((card) => card.id !== id));
  };

  return <div ref={overlay} className={styles.overlay} aria-hidden="true">
    {cards.map((card) => <div key={card.id} className={`${styles.card} ${card.loaded ? styles.ready : ""}`}
      onAnimationEnd={(event) => {
        if (event.target === event.currentTarget) removeCard(card.id);
      }}
      style={{
      left: card.x, top: card.y, width: card.width,
      "--rotation": `${card.rotation}deg`,
    } as CSSProperties}>
      <Image src={card.src} alt="" fill sizes="138px" loading="eager" className={styles.photo}
        onLoad={() => setCards((current) => current.map((item) =>
          item.id === card.id ? { ...item, loaded: true } : item,
        ))}
        onError={() => removeCard(card.id)}
      />
    </div>)}
  </div>;
}

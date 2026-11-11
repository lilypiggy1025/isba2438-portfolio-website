"use client";

export default function BlogError({ reset }: { reset: () => void }) {
  return (
    <main style={{ padding: "3rem" }}>
      <h1>Could not load the blog</h1>
      <button type="button" onClick={reset}>Try again</button>
    </main>
  );
}

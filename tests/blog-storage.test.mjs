import { test } from "node:test";
import assert from "node:assert/strict";
import { registerHooks } from "node:module";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "@/lib/blog/validation") {
      return nextResolve(new URL("../lib/blog/validation.ts", import.meta.url).href, context);
    }
    return nextResolve(specifier, context);
  },
});
const { createBlogStore } = await import("../lib/blog/storage.ts");
hooks.deregister();
const values = { title: "Original title", content: "Original content" };

test("blog updates and deletes persist while preserving identity, fields, order, and other posts", async () => {
  const directory = await mkdtemp(join(tmpdir(), "blog-storage-"));
  try {
    const file = join(directory, "posts.json");
    const store = createBlogStore(file);
    assert.deepEqual(await store.list(), []);
    assert.equal(await store.update("missing", values), undefined);
    assert.equal(await store.delete("missing"), false);
    await assert.rejects(readFile(file), { code: "ENOENT" });
    const first = await store.save(values);
    const second = await store.save(values);
    const original = [{ ...second, extra: { keep: true } }, first];
    await writeFile(file, JSON.stringify(original));
    const updated = await store.update(second.slug, { title: " New title ", content: " New content ", slug: "replace", createdAt: "replace", extra: "replace" });
    assert.deepEqual(updated, { ...original[0], title: "New title", content: "New content" });
    const reopened = createBlogStore(file);
    assert.deepEqual(await reopened.list(), [updated, first]);
    const before = await readFile(file, "utf8");
    assert.equal(await store.update("unknown", values), undefined);
    assert.equal(await store.delete("unknown"), false);
    assert.equal(await readFile(file, "utf8"), before);
    assert.equal(await store.delete(second.slug), true);
    assert.deepEqual(await reopened.list(), [first]);
    assert.equal(await reopened.find(second.slug), undefined);
    assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith(".tmp")), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("blog mutations share a queue, including recovery after rejected updates", async () => {
  const directory = await mkdtemp(join(tmpdir(), "blog-concurrency-"));
  try {
    const store = createBlogStore(join(directory, "posts.json"));
    const entries = await Promise.all(Array.from({ length: 10 }, () => store.save(values)));
    const results = await Promise.allSettled([
      store.update(entries[0].slug, { title: " ", content: "invalid" }),
      store.update(entries[0].slug, { title: "Changed", content: "Updated" }),
      store.delete(entries[1].slug),
      store.save({ title: "Concurrent new post", content: "New content" }),
    ]);
    assert.equal(results[0].status, "rejected");
    assert.ok(results.slice(1).every((result) => result.status === "fulfilled"));
    assert.equal((await store.list()).length, 10);
    assert.equal((await store.find(entries[0].slug)).title, "Changed");
    assert.equal(await store.find(entries[1].slug), undefined);
    assert.equal(new Set((await store.list()).map((post) => post.slug)).size, 10);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test("invalid updates and malformed storage never alter the original file", async () => {
  const directory = await mkdtemp(join(tmpdir(), "blog-corruption-"));
  try {
    const file = join(directory, "posts.json");
    const store = createBlogStore(file);
    const entry = await store.save(values);
    const original = await readFile(file, "utf8");
    for (const input of [null, [], {}, { ...values, title: 5 }, { ...values, content: false },
      { ...values, title: "\n " }, { ...values, content: "\t" },
      { ...values, title: "x".repeat(121) }, { ...values, content: "x".repeat(20001) }]) {
      await assert.rejects(store.update(entry.slug, input));
      assert.equal(await readFile(file, "utf8"), original);
    }
    for (const raw of ["{broken", "{}", "[null]", '[{"slug":"test"}]', JSON.stringify([entry, entry])]) {
      await writeFile(file, raw);
      await assert.rejects(store.list());
      await assert.rejects(store.update(entry.slug, values));
      await assert.rejects(store.delete(entry.slug));
      await assert.rejects(store.save(values));
      assert.equal(await readFile(file, "utf8"), raw);
    }
    await writeFile(file, original);
    assert.equal(await store.delete(entry.slug), true);
    assert.deepEqual(await store.list(), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

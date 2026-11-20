import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { validateGuestbook } from "../lib/guestbook/validation.ts";
import { registerHooks } from "node:module";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === "./validation" && context.parentURL?.endsWith("/lib/guestbook/storage.ts")) {
      return nextResolve("./validation.ts", context);
    }
    return nextResolve(specifier, context);
  },
});
const { createGuestbookStore } = await import("../lib/guestbook/storage.ts");
hooks.deregister();

const input = { name: "Liwen", message: "Hello" };

test("guestbook validation trims fields and enforces types and boundaries", () => {
  assert.deepEqual(validateGuestbook({ name: " Liwen ", message: " Hello\n" }).values, input);
  assert.equal(validateGuestbook({ name: "a".repeat(60), message: "b".repeat(500) }).valid, true);
  for (const value of [undefined, null, 4, true, {}, [], "", " \n "]) {
    assert.ok(validateGuestbook({ ...input, name: value }).errors.name);
    assert.ok(validateGuestbook({ ...input, message: value }).errors.message);
  }
  assert.ok(validateGuestbook({ ...input, name: "a".repeat(61) }).errors.name);
  assert.ok(validateGuestbook({ ...input, message: "b".repeat(501) }).errors.message);
  for (const value of [null, [], "text"]) assert.equal(validateGuestbook(value).valid, false);
});

test("guestbook CRUD persists, serializes mutations, and preserves identity", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "portfolio-guestbook-"));
  try {
    const file = path.join(directory, "data", "entries.json");
    const store = createGuestbookStore(file);
    assert.deepEqual(await store.list(), []);
    assert.equal(await store.find("missing"), undefined);
    assert.equal(await store.update("missing", input), undefined);
    assert.equal(await store.delete("missing"), false);
    const entries = await Promise.all(Array.from({ length: 12 }, () => store.create(input)));
    assert.equal(new Set(entries.map((entry) => entry.id)).size, 12);
    assert.equal((await store.list()).length, 12);
    const first = entries[0];
    assert.equal(first.createdAt, first.updatedAt);
    const [updated, deleted] = await Promise.all([
      store.update(first.id, { name: " Updated ", message: " New message " }),
      store.delete(entries[1].id),
      store.create(input),
    ]);
    assert.equal(deleted, true);
    assert.equal(updated.id, first.id);
    assert.equal(updated.createdAt, first.createdAt);
    assert.ok(Date.parse(updated.updatedAt) >= Date.parse(first.updatedAt));
    assert.equal(updated.name, "Updated");
    assert.equal(updated.message, "New message");
    const reopened = createGuestbookStore(file);
    assert.deepEqual(await reopened.find(first.id), updated);
    assert.equal(await reopened.find(entries[1].id), undefined);
    assert.equal((await reopened.list()).length, 12);
    const before = await readFile(file, "utf8");
    await assert.rejects(store.create({ ...input, name: " " }));
    await assert.rejects(store.update(first.id, { ...input, message: 42 }));
    assert.equal(await readFile(file, "utf8"), before);
    await store.create(input);
    assert.deepEqual((await readdir(path.dirname(file))).filter((name) => name.endsWith(".tmp")), []);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

test("guestbook rejects corrupt records without changing storage and recovers after failures", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "portfolio-guestbook-errors-"));
  try {
    const file = path.join(directory, "entries.json");
    const store = createGuestbookStore(file);
    const entry = await store.create(input);
    const corruptValues = ["{broken", "{}", "[null]", JSON.stringify([{ ...entry, name: 5 }]),
      JSON.stringify([{ ...entry, message: " " }]), JSON.stringify([{ ...entry, createdAt: "bad" }]),
      JSON.stringify([{ ...entry, updatedAt: "2000-01-01T00:00:00.000Z" }]),
      JSON.stringify([{ ...entry, id: "" }]), JSON.stringify([entry, entry])];
    for (const raw of corruptValues) {
      await writeFile(file, raw);
      await assert.rejects(store.list());
      await assert.rejects(store.find(entry.id));
      await assert.rejects(store.create(input));
      await assert.rejects(store.update(entry.id, input));
      await assert.rejects(store.delete(entry.id));
      assert.equal(await readFile(file, "utf8"), raw);
    }
    await writeFile(file, "[]");
    await store.create(input);
    const blocked = path.join(directory, "blocked");
    await writeFile(blocked, "not a directory");
    await assert.rejects(createGuestbookStore(path.join(blocked, "entries.json")).create(input));
    assert.equal(await readFile(blocked, "utf8"), "not a directory");
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});

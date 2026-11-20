import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if ((["./seeds", "./validation"].includes(specifier) && context.parentURL?.includes("/lib/projects/")) || specifier === "../../app/projects/projects") {
      return nextResolve(specifier + ".ts", context);
    }
    return nextResolve(specifier, context);
  },
});
const { createProjectStore } = await import("../lib/projects/storage.ts");
const { validateProject } = await import("../lib/projects/validation.ts");
hooks.deregister();
const input = { title: "New project", subtitle: "A subtitle", description: "A description", image: "/projects-creative.jpg", icon: "✧" };

async function isolated(run) {
  const directory = await mkdtemp(join(tmpdir(), "portfolio-projects-"));
  try { await run(join(directory, "projects.json"), directory); }
  finally { await rm(directory, { recursive: true, force: true }); }
}

test("project validation trims text, enforces limits, and rejects invalid paths and types", () => {
  assert.equal(validateProject(input).valid, true);
  assert.equal(validateProject({ ...input, title: " Trimmed " }).values.title, "Trimmed");
  for (const field of Object.keys(input)) {
    for (const value of [undefined, null, 42, false, {}, []]) assert.ok(validateProject({ ...input, [field]: value }).errors[field]);
  }
  for (const field of ["title", "description"]) assert.ok(validateProject({ ...input, [field]: " \n " }).errors[field]);
  for (const [field, max] of Object.entries({ title: 120, subtitle: 200, description: 10000, image: 300, icon: 16 })) {
    assert.ok(validateProject({ ...input, [field]: "x".repeat(max + 1) }).errors[field]);
  }
  assert.equal(validateProject({ ...input, title: "x".repeat(120), description: "x".repeat(10000), subtitle: "", icon: "" }).valid, true);
  for (const image of ["https://example.com/image.jpg", "//example.com/image.jpg", "/../photo.jpg", "/a/./photo.jpg", "/photo.svg", "/photo.jpg?x=1", "/photo\\test.jpg"]) {
    assert.ok(validateProject({ ...input, image }).errors.image);
  }
  for (const value of [null, [], "text"]) assert.equal(validateProject(value).valid, false);
});

test("missing project storage preserves the original seeds without writes or shared references", async () => isolated(async (file) => {
  const store = createProjectStore(file);
  const seeds = await store.list();
  assert.deepEqual(seeds.map(({ slug, title, image, icon, layout }) => ({ slug, title, image, icon, layout })), [
    { slug: "creative-space", title: "My Creative Space", image: "/projects-creative.jpg", icon: "✧", layout: "creative-gallery" },
    { slug: "inspiration-board", title: "My Inspiration Board", image: "/projects-inspiration.jpg", icon: "♡", layout: "inspiration-board" },
  ]);
  assert.equal(seeds[0].subtitle, "Click any label to unfold images in that line ✦");
  assert.equal(seeds[0].description, "");
  assert.equal(seeds[1].subtitle, "Little moments, endless inspiration ✦");
  assert.equal(seeds[1].description, "Photography has always been one of my favorite ways to capture the little moments in life. I love traveling to new places, exploring unfamiliar streets, and discovering beauty in everyday scenes.\n\nI also enjoy looking through other photographers' work and photo books. Their perspectives inspire me to see the world differently and bring fresh ideas into my own creative journey.");
  seeds[0].title = "Changed local copy";
  assert.equal((await store.find("creative-space")).title, "My Creative Space");
  assert.equal(await store.update("missing", input), undefined);
  assert.equal(await store.delete("missing"), false);
  await assert.rejects(readFile(file), { code: "ENOENT" });
  await store.create(input);
  assert.deepEqual((await createProjectStore(file).list()).slice(0, 2), await createProjectStore(file + ".missing").list());
}));

test("project CRUD persists and shares one queue while preserving slugs, metadata, order, and extras", async () => isolated(async (file, directory) => {
  const store = createProjectStore(file);
  const seeds = await store.list();
  await writeFile(file, JSON.stringify([{ ...seeds[0], extra: { keep: true } }, seeds[1]]));
  const updated = await store.update(seeds[0].slug, { ...seeds[0], title: " New title ", slug: "replacement", layout: "standard", createdAt: "replacement" });
  assert.equal(updated.slug, seeds[0].slug);
  assert.equal(updated.createdAt, seeds[0].createdAt);
  assert.equal(updated.layout, seeds[0].layout);
  assert.deepEqual(updated.extra, { keep: true });
  assert.equal(updated.title, "New title");
  assert.deepEqual((await store.list())[1], seeds[1]);
  const created = await Promise.all(Array.from({ length: 8 }, () => store.create(input)));
  assert.equal(new Set(created.map((project) => project.slug)).size, 8);
  assert.equal(created[0].slug, "new-project");
  assert.equal(created[1].slug, "new-project-2");
  const results = await Promise.allSettled([
    store.update(created[0].slug, { ...input, title: " " }),
    store.update(created[0].slug, { ...input, title: "Updated" }),
    store.delete(created[1].slug), store.create({ ...input, title: "Another" }),
  ]);
  assert.equal(results[0].status, "rejected");
  assert.ok(results.slice(1).every((result) => result.status === "fulfilled"));
  const reopened = createProjectStore(file);
  assert.equal((await reopened.list()).length, 10);
  assert.equal((await reopened.find(created[0].slug)).title, "Updated");
  assert.equal(await reopened.find(created[1].slug), undefined);
  assert.ok(Date.parse((await reopened.find(created[0].slug)).updatedAt) >= Date.parse(created[0].createdAt));
  const before = await readFile(file, "utf8");
  assert.equal(await store.update("unknown", input), undefined);
  assert.equal(await store.delete("unknown"), false);
  assert.equal(await readFile(file, "utf8"), before);
  assert.deepEqual((await readdir(directory)).filter((name) => name.endsWith(".tmp")), []);
}));

test("an existing empty array stays empty, and deleting every seed never resurrects them", async () => isolated(async (file) => {
  const store = createProjectStore(file);
  await store.delete("creative-space");
  await store.delete("inspiration-board");
  assert.deepEqual(await createProjectStore(file).list(), []);
  const created = await store.create(input);
  assert.deepEqual(await store.list(), [created]);
  await store.delete(created.slug);
  assert.equal(await readFile(file, "utf8"), "[]\n");
}));

test("malformed storage and invalid inputs never damage project data, and failures do not poison the queue", async () => isolated(async (file, directory) => {
  const store = createProjectStore(file);
  const seed = (await store.list())[0];
  for (const raw of ["{broken", "{}", "[null]", JSON.stringify([{ ...seed, layout: "bad" }]),
    JSON.stringify([{ ...seed, image: "https://example.com/a.jpg" }]), JSON.stringify([{ ...seed, createdAt: "bad" }]),
    JSON.stringify([{ ...seed, updatedAt: "1960-01-01T00:00:00.000Z" }]), JSON.stringify([seed, seed])]) {
    await writeFile(file, raw);
    await assert.rejects(store.list());
    await assert.rejects(store.find(seed.slug));
    await assert.rejects(store.create(input));
    await assert.rejects(store.update(seed.slug, input));
    await assert.rejects(store.delete(seed.slug));
    assert.equal(await readFile(file, "utf8"), raw);
  }
  await writeFile(file, "[]");
  await assert.rejects(store.create({ ...input, description: " " }));
  assert.equal(await readFile(file, "utf8"), "[]");
  await store.create(input);
  const blocked = join(directory, "blocked");
  await writeFile(blocked, "keep");
  const failed = createProjectStore(join(blocked, "projects.json"));
  await assert.rejects(failed.list());
  await assert.rejects(failed.create(input));
  await assert.rejects(failed.update(seed.slug, input));
  await assert.rejects(failed.delete(seed.slug));
  assert.equal(await readFile(blocked, "utf8"), "keep");
}));

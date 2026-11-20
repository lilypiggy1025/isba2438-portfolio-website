import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("public project routes resolve seeds, newly created slugs, and deleted or empty storage as 404", async () => {
  const originalDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "projects-public-"));
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) return nextResolve(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
      if (["./seeds", "./validation", "../../app/projects/projects"].includes(specifier)) return nextResolve(specifier + ".ts", context);
      if (specifier === "next/server") return nextResolve("next/server.js", context);
      return nextResolve(specifier, context);
    },
  });
  try {
    process.chdir(directory);
    const { projectStore, PROJECTS_FILE } = await import("../lib/projects/storage.ts");
    const { proxy } = await import("../proxy.ts");
    const { NextRequest } = await import("next/server.js");
    const resolve = (slug) => proxy(new NextRequest(`http://localhost/projects/${slug}`));
    for (const slug of ["creative-space", "inspiration-board"]) assert.equal((await resolve(slug)).headers.get("x-middleware-next"), "1");
    assert.equal((await resolve("missing")).status, 404);
    const project = await projectStore.create({ title: "New runtime project", subtitle: "Test", description: "Runtime content", image: "/projects-creative.jpg", icon: "" });
    assert.equal((await resolve(project.slug)).headers.get("x-middleware-next"), "1");
    const updated = await projectStore.update(project.slug, { ...project, title: "Renamed", image: "/projects-inspiration.jpg" });
    assert.equal(updated.slug, project.slug);
    assert.equal((await resolve(project.slug)).headers.get("x-middleware-next"), "1");
    await projectStore.delete(project.slug);
    assert.equal((await resolve(project.slug)).status, 404);
    await writeFile(PROJECTS_FILE, "[]");
    assert.equal((await resolve("creative-space")).status, 404);
    assert.deepEqual(await projectStore.list(), []);
    assert.equal(await readFile(PROJECTS_FILE, "utf8"), "[]");
  } finally {
    hooks.deregister();
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true });
  }
});

test("public page wiring uses request-time storage and explicit layout components with editable text", async () => {
  const read = (file) => readFile(new URL("../" + file, import.meta.url), "utf8");
  const listing = await read("app/projects/page.tsx");
  const detail = await read("app/projects/[slug]/page.tsx");
  assert.match(listing, /await connection\(\)/);
  assert.match(listing, /await projectStore.list\(\)/);
  assert.match(listing, /src=\{project.image\}/);
  assert.match(detail, /await connection\(\)/);
  assert.match(detail, /await projectStore.find\(slug\)/);
  assert.doesNotMatch(detail, /generateStaticParams/);
  for (const [layout, component] of [["creative-gallery", "CreativeGallery"], ["inspiration-board", "InspirationBoard"], ["standard", "StandardProject"]]) {
    assert.ok(detail.includes(`case "${layout}": return <${component} project={project} />;`));
  }
  assert.match(detail, /default: notFound\(\)/);
  for (const file of ["CreativeGallery.tsx", "InspirationBoard.tsx", "StandardProject.tsx"]) {
    const source = await read(`app/projects/[slug]/${file}`);
    assert.match(source, /project.title/);
    assert.match(source, /project.subtitle/);
    assert.match(source, /project.description/);
  }
});

test("dynamic Projects navigation has a layout-level Suspense boundary", async () => {
  const layout = await readFile(new URL("../app/projects/layout.tsx", import.meta.url), "utf8");
  const navigation = await readFile(new URL("../app/components/Navigation.tsx", import.meta.url), "utf8");
  assert.match(layout, /import \{ Suspense \} from "react"/);
  assert.match(layout, /<Suspense fallback=\{null\}><ProjectsNavigation \/><\/Suspense>/);
  assert.match(navigation, /const pathname = usePathname\(\)/);
  assert.ok(navigation.includes('pathname === "/projects/creative-space" || pathname === "/projects/inspiration-board"'));
});

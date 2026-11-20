import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("project APIs share Contact authentication, expose public reads, and persist protected CRUD", async (t) => {
  const previousDirectory = process.cwd();
  const previousSecret = process.env.CONTACT_ADMIN_SECRET;
  const directory = await mkdtemp(join(tmpdir(), "projects-api-"));
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) return nextResolve(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
      if (["./seeds", "./validation", "./storage", "../../app/projects/projects"].includes(specifier)) return nextResolve(specifier + ".ts", context);
      return nextResolve(specifier, context);
    },
  });
  try {
    process.chdir(directory);
    process.env.CONTACT_ADMIN_SECRET = randomBytes(32).toString("hex");
    const collection = await import("../app/api/projects/route.ts");
    const item = await import("../app/api/projects/[slug]/route.ts");
    const session = await import("../app/api/contact-admin/session/route.ts");
    const contacts = await import("../app/api/contacts/route.ts");
    const { projectStore, PROJECTS_FILE, createProjectStore } = await import("../lib/projects/storage.ts");
    const request = (method, body, cookie = "", origin = "https://portfolio.test") => new Request("https://portfolio.test/api/projects", {
      method, headers: { "Content-Type": "application/json", cookie, origin }, body,
    });
    const context = (slug) => ({ params: Promise.resolve({ slug }) });
    const input = { title: "Disposable", subtitle: "Test", description: "Test description", image: "/projects-creative.jpg", icon: "✧" };
    const body = JSON.stringify(input);
    const checked = (response, code) => {
      assert.equal(response.status, code);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return response;
    };
    const seeds = (await checked(await collection.GET(), 200).json()).projects;
    assert.equal(seeds.length, 2);
    checked(await item.GET(request("GET"), context("creative-space")), 200);
    checked(await item.GET(request("GET"), context("unknown")), 404);
    const login = await session.POST(request("POST", JSON.stringify({ password: process.env.CONTACT_ADMIN_SECRET })));
    assert.equal(login.status, 200);
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const denyMutations = async (token, origin = "https://portfolio.test") => {
      const spies = ["list", "find", "create", "update", "delete"].map((method) => t.mock.method(projectStore, method));
      try {
        checked(await collection.POST(request("POST", "{", token, origin)), 401);
        checked(await item.PUT(request("PUT", "{", token, origin), context("creative-space")), 401);
        checked(await item.DELETE(request("DELETE", undefined, token, origin), context("creative-space")), 401);
        assert.ok(spies.every((spy) => spy.mock.callCount() === 0));
      } finally { spies.forEach((spy) => spy.mock.restore()); }
    };
    await denyMutations("");
    await denyMutations(cookie + "tampered");
    await denyMutations(cookie, "https://evil.test");
    await denyMutations(cookie, "");
    const secret = process.env.CONTACT_ADMIN_SECRET;
    delete process.env.CONTACT_ADMIN_SECRET;
    await denyMutations(cookie);
    checked(await collection.GET(), 200);
    process.env.CONTACT_ADMIN_SECRET = secret;
    const now = Date.now();
    const clock = t.mock.method(Date, "now", () => now + 3601000);
    try { await denyMutations(cookie); } finally { clock.mock.restore(); }
    assert.equal((await contacts.GET(request("GET", undefined, cookie))).status, 200);
    assert.equal((await contacts.GET(request("GET"))).status, 401);
    assert.equal((await contacts.POST(request("POST", JSON.stringify({ name: "Demo", email: "demo@example.com", message: "Synthetic" })))).status, 201);
    await assert.rejects(readFile(PROJECTS_FILE), { code: "ENOENT" });
    for (const invalid of ["{", "null", "[]", "{}", JSON.stringify({ ...input, title: " " }),
      JSON.stringify({ ...input, description: false }), JSON.stringify({ ...input, title: "x".repeat(121) }),
      JSON.stringify({ ...input, image: "/../image.jpg" })]) {
      checked(await collection.POST(request("POST", invalid, cookie)), 400);
      checked(await item.PUT(request("PUT", invalid, cookie), context("creative-space")), 400);
    }
    const createdResponse = checked(await collection.POST(request("POST", body, cookie)), 201);
    const created = (await createdResponse.json()).project;
    assert.equal(createdResponse.headers.get("location"), `/api/projects/${created.slug}`);
    assert.equal(created.layout, "standard");
    const reopened = createProjectStore(PROJECTS_FILE);
    assert.deepEqual(await reopened.list(), [...seeds, created]);
    const updateResponse = checked(await item.PUT(request("PUT", JSON.stringify({ ...input, title: " Changed ", slug: "replace", layout: "inspiration-board", createdAt: "replace" }), cookie), context(created.slug)), 200);
    const updated = (await updateResponse.json()).project;
    assert.equal(updated.slug, created.slug);
    assert.equal(updated.createdAt, created.createdAt);
    assert.equal(updated.layout, created.layout);
    assert.equal(updated.title, "Changed");
    assert.deepEqual(await reopened.find(created.slug), updated);
    assert.deepEqual((await reopened.list()).slice(0, 2), seeds);
    const seedUpdate = checked(await item.PUT(request("PUT", JSON.stringify({ ...seeds[0], title: "Edited seed" }), cookie), context(seeds[0].slug)), 200);
    const changedSeed = (await seedUpdate.json()).project;
    assert.equal(changedSeed.layout, seeds[0].layout);
    assert.equal(changedSeed.description, "");
    assert.equal(changedSeed.createdAt, seeds[0].createdAt);
    checked(await item.PUT(request("PUT", body, cookie), context("unknown")), 404);
    checked(await item.DELETE(request("DELETE", undefined, cookie), context("unknown")), 404);
    const deleted = checked(await item.DELETE(request("DELETE", undefined, cookie), context(created.slug)), 204);
    assert.equal(await deleted.text(), "");
    assert.equal(deleted.body, null);
    checked(await item.GET(request("GET"), context(created.slug)), 404);
    assert.deepEqual(await reopened.list(), [changedSeed, seeds[1]]);
    for (const raw of ["{broken", "{}", "[null]"]) {
      await writeFile(PROJECTS_FILE, raw);
      const responses = [await collection.GET(), await item.GET(request("GET"), context(seeds[0].slug)),
        await collection.POST(request("POST", body, cookie)), await item.PUT(request("PUT", body, cookie), context(seeds[0].slug)),
        await item.DELETE(request("DELETE", undefined, cookie), context(seeds[0].slug))];
      for (const response of responses) {
        checked(response, 500);
        const error = await response.json();
        assert.equal(error.ok, false);
        assert.match(error.message, /^Could not (load projects|load the project|save the project|delete the project)\.$/);
      }
      assert.equal(await readFile(PROJECTS_FILE, "utf8"), raw);
    }
  } finally {
    hooks.deregister();
    process.chdir(previousDirectory);
    if (previousSecret === undefined) delete process.env.CONTACT_ADMIN_SECRET;
    else process.env.CONTACT_ADMIN_SECRET = previousSecret;
    await rm(directory, { recursive: true, force: true });
  }
});

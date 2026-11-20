import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { randomBytes } from "node:crypto";

test("blog API validates, persists, and retrieves posts with stable unique slugs", async (t) => {
  const originalDirectory = process.cwd();
  const previousSecret = process.env.CONTACT_ADMIN_SECRET;
  const directory = await mkdtemp(join(tmpdir(), "portfolio-blog-"));
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/lib/")) {
        const url = new URL("../" + specifier.slice(2) + ".ts", import.meta.url);
        return nextResolve(url.href, context);
      }
      if (specifier === "next/server") return nextResolve("next/server.js", context);
      return nextResolve(specifier, context);
    },
  });

  try {
    process.chdir(directory);
    process.env.CONTACT_ADMIN_SECRET = randomBytes(32).toString("hex");
    const { GET, POST } = await import("../app/api/blogs/route.ts");
    const { BLOG_FILE, createBlogStore, blogStore } = await import("../lib/blog/storage.ts");
    const { createSessionCookie } = await import("../lib/contact/auth.ts");
    const cookie = createSessionCookie().split(";")[0];
    const request = (body, token = cookie, origin = "http://localhost") => new Request("http://localhost/api/blogs", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: token, origin },
      body,
    });
    const spy = t.mock.method(blogStore, "save");
    try {
      for (const [token, origin] of [["", "http://localhost"], [cookie + "tampered", "http://localhost"], [cookie, "https://evil.test"], [cookie, ""]]) {
        const denied = await POST(request("{", token, origin));
        assert.equal(denied.status, 401);
        assert.equal(denied.headers.get("cache-control"), "no-store");
      }
      const secret = process.env.CONTACT_ADMIN_SECRET;
      delete process.env.CONTACT_ADMIN_SECRET;
      assert.equal((await POST(request("{}"))).status, 401);
      process.env.CONTACT_ADMIN_SECRET = secret;
      const now = Date.now();
      const clock = t.mock.method(Date, "now", () => now + 3601000);
      try { assert.equal((await POST(request("{}"))).status, 401); }
      finally { clock.mock.restore(); }
      assert.equal(spy.mock.callCount(), 0);
      await assert.rejects(readFile(BLOG_FILE), { code: "ENOENT" });
    } finally { spy.mock.restore(); }
    const empty = await GET();
    assert.equal(empty.status, 200);
    assert.deepEqual((await empty.json()).posts, []);
    assert.equal((await POST(request("{"))).status, 400);
    const invalid = await POST(request(JSON.stringify({ title: " ", content: "\n" })));
    assert.equal(invalid.status, 400);
    assert.deepEqual(Object.keys((await invalid.json()).errors).sort(), ["content", "title"]);
    await assert.rejects(readFile(BLOG_FILE), { code: "ENOENT" });

    const body = JSON.stringify({ title: " Café Notes ", content: " Hello world. " });
    const responses = await Promise.all([POST(request(body)), POST(request(body))]);
    assert.deepEqual(responses.map((response) => response.status), [201, 201]);
    const created = await Promise.all(responses.map(async (response) => (await response.json()).post));
    assert.deepEqual(created.map((post) => post.slug), ["cafe-notes", "cafe-notes-2"]);
    assert.equal(responses[1].headers.get("location"), "/blogs/cafe-notes-2");
    assert.equal(created[0].title, "Café Notes");
    assert.equal(created[0].content, "Hello world.");

    const listing = await GET();
    assert.equal(listing.headers.get("cache-control"), "no-store");
    assert.deepEqual((await listing.json()).posts, created.toReversed());
    const reopenedStore = createBlogStore(BLOG_FILE);
    assert.deepEqual(await reopenedStore.find("cafe-notes"), created[0]);
    assert.equal(await reopenedStore.find("missing-slug"), undefined);

    const { NextRequest } = await import("next/server.js");
    const { proxy } = await import("../proxy.ts");
    const knownPage = await proxy(new NextRequest("http://localhost/blogs/cafe-notes"));
    assert.equal(knownPage.headers.get("x-middleware-next"), "1");
    const unknownPage = await proxy(new NextRequest("http://localhost/blogs/missing-slug"));
    assert.equal(unknownPage.status, 404);
  } finally {
    hooks.deregister();
    process.chdir(originalDirectory);
    if (previousSecret === undefined) delete process.env.CONTACT_ADMIN_SECRET;
    else process.env.CONTACT_ADMIN_SECRET = previousSecret;
    await rm(directory, { recursive: true, force: true });
  }
});

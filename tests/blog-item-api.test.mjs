import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("blog item API updates and deletes safely with complete status and persistence coverage", async (t) => {
  const originalDirectory = process.cwd();
  const previousSecret = process.env.CONTACT_ADMIN_SECRET;
  const directory = await mkdtemp(join(tmpdir(), "portfolio-blog-item-api-"));
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/lib/")) {
        return nextResolve(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
      }
      return nextResolve(specifier, context);
    },
  });
  try {
    process.chdir(directory);
    process.env.CONTACT_ADMIN_SECRET = randomBytes(32).toString("hex");
    const { PUT, DELETE } = await import("../app/api/blogs/[slug]/route.ts");
    const collection = await import("../app/api/blogs/route.ts");
    const { BLOG_FILE, createBlogStore, blogStore } = await import("../lib/blog/storage.ts");
    const { createSessionCookie } = await import("../lib/contact/auth.ts");
    const cookie = createSessionCookie().split(";")[0];
    const request = (method, body, token = cookie, origin = "http://localhost") => new Request("http://localhost/api/blogs/test", {
      method, headers: { "Content-Type": "application/json", cookie: token, origin }, body,
    });
    const context = (slug) => ({ params: Promise.resolve({ slug }) });
    const values = { title: "Original title", content: "Original content" };
    const spies = ["list", "update", "delete"].map((method) => t.mock.method(blogStore, method));
    try {
      for (const [token, origin] of [["", "http://localhost"], [cookie + "tampered", "http://localhost"], [cookie, "https://evil.test"], [cookie, ""]]) {
        for (const response of [await PUT(request("PUT", "{", token, origin), context("missing")),
          await DELETE(request("DELETE", undefined, token, origin), context("missing"))]) {
          assert.equal(response.status, 401);
          assert.equal(response.headers.get("cache-control"), "no-store");
        }
      }
      const secret = process.env.CONTACT_ADMIN_SECRET;
      delete process.env.CONTACT_ADMIN_SECRET;
      assert.equal((await PUT(request("PUT", "{}"), context("missing"))).status, 401);
      assert.equal((await DELETE(request("DELETE"), context("missing"))).status, 401);
      process.env.CONTACT_ADMIN_SECRET = secret;
      const now = Date.now();
      const clock = t.mock.method(Date, "now", () => now + 3601000);
      try {
        assert.equal((await PUT(request("PUT", "{}"), context("missing"))).status, 401);
        assert.equal((await DELETE(request("DELETE"), context("missing"))).status, 401);
      } finally { clock.mock.restore(); }
      assert.ok(spies.every((spy) => spy.mock.callCount() === 0));
    } finally { spies.forEach((spy) => spy.mock.restore()); }

    const missingUpdate = await PUT(request("PUT", JSON.stringify(values)), context("missing"));
    assert.equal(missingUpdate.status, 404);
    assert.equal((await DELETE(request("DELETE"), context("missing"))).status, 404);
    await assert.rejects(readFile(BLOG_FILE), { code: "ENOENT" });
    const firstResponse = await collection.POST(request("POST", JSON.stringify(values)));
    assert.equal(firstResponse.status, 201);
    const first = (await firstResponse.json()).post;
    const secondResponse = await collection.POST(request("POST", JSON.stringify({ title: "Other", content: "Keep this" })));
    assert.equal(secondResponse.status, 201);
    const second = (await secondResponse.json()).post;
    const seeded = [{ ...second, custom: { preserved: true } }, { ...first, custom: "keep" }];
    await writeFile(BLOG_FILE, JSON.stringify(seeded));
    const original = await readFile(BLOG_FILE, "utf8");
    for (const raw of ["{", "null", "[]", "{}", JSON.stringify({ title: " ", content: "\n" }),
      JSON.stringify({ title: 5, content: false }), JSON.stringify({ ...values, title: "x".repeat(121) }),
      JSON.stringify({ ...values, content: "x".repeat(20001) })]) {
      const response = await PUT(request("PUT", raw), context(first.slug));
      assert.equal(response.status, 400);
      const error = await response.json();
      assert.equal(error.ok, false);
      assert.equal(typeof error.message, "string");
      if (raw !== "{") assert.ok(error.errors);
      assert.equal(await readFile(BLOG_FILE, "utf8"), original);
    }
    const updatedResponse = await PUT(request("PUT", JSON.stringify({
      title: " Changed title ", content: " Changed content ", slug: "replacement", createdAt: "replacement", custom: "replacement",
    })), context(first.slug));
    assert.equal(updatedResponse.status, 200);
    const updated = (await updatedResponse.json()).post;
    assert.deepEqual(updated, { ...seeded[1], title: "Changed title", content: "Changed content" });
    const reopened = createBlogStore(BLOG_FILE);
    assert.deepEqual(await reopened.list(), [seeded[0], updated]);
    const listing = await collection.GET();
    assert.equal(listing.status, 200);
    assert.deepEqual((await listing.json()).posts, [seeded[0], updated]);
    const beforeMissing = await readFile(BLOG_FILE, "utf8");
    for (const response of [await PUT(request("PUT", JSON.stringify(values)), context("unknown")),
      await DELETE(request("DELETE"), context("unknown"))]) {
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { ok: false, message: "Blog post not found." });
    }
    assert.equal(await readFile(BLOG_FILE, "utf8"), beforeMissing);
    const deleted = await DELETE(request("DELETE"), context(first.slug));
    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), "");
    assert.equal(deleted.body, null);
    assert.deepEqual(await reopened.list(), [seeded[0]]);
    assert.equal((await DELETE(request("DELETE"), context(first.slug))).status, 404);
    for (const raw of ["{broken", "{}", "[null]"]) {
      await writeFile(BLOG_FILE, raw);
      const responses = [await PUT(request("PUT", JSON.stringify(values)), context(second.slug)),
        await DELETE(request("DELETE"), context(second.slug))];
      for (const response of responses) {
        assert.equal(response.status, 500);
        const error = await response.json();
        assert.equal(error.ok, false);
        assert.match(error.message, /^Could not (save|delete) the post\. Please try again\.$/);
      }
      assert.equal(await readFile(BLOG_FILE, "utf8"), raw);
    }
    await writeFile(BLOG_FILE, JSON.stringify(seeded));
    assert.equal((await DELETE(request("DELETE"), context(first.slug))).status, 204);
    assert.deepEqual(await reopened.list(), [seeded[0]]);
  } finally {
    hooks.deregister();
    process.chdir(originalDirectory);
    if (previousSecret === undefined) delete process.env.CONTACT_ADMIN_SECRET;
    else process.env.CONTACT_ADMIN_SECRET = previousSecret;
    await rm(directory, { recursive: true, force: true });
  }
});

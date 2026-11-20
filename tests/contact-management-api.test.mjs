import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("protected contact management authenticates before storage and persists authorized CRUD", async (t) => {
  const originalDirectory = process.cwd();
  const previousSecret = process.env.CONTACT_ADMIN_SECRET;
  const previousMode = process.env.NODE_ENV;
  const directory = await mkdtemp(join(tmpdir(), "contact-management-"));
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) return nextResolve(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
      if (["./storage", "./validation"].includes(specifier)) return nextResolve(specifier + ".ts", context);
      return nextResolve(specifier, context);
    },
  });
  try {
    process.chdir(directory);
    process.env.CONTACT_ADMIN_SECRET = randomBytes(32).toString("hex");
    process.env.NODE_ENV = "production";
    const collection = await import("../app/api/contacts/route.ts");
    const item = await import("../app/api/contacts/[id]/route.ts");
    const session = await import("../app/api/contact-admin/session/route.ts");
    const auth = await import("../lib/contact/auth.ts");
    const { contactStore, CONTACT_FILE, createContactStore } = await import("../lib/contact/storage.ts");
    const request = (method, body, cookie = "", origin = "https://portfolio.test") => new Request("https://portfolio.test/api/contacts", {
      method, headers: { "Content-Type": "application/json", cookie, origin }, body,
    });
    const context = (id) => ({ params: Promise.resolve({ id }) });
    const values = { name: "Demo", email: "demo@example.com", message: "Synthetic message" };
    const body = JSON.stringify(values);
    const checked = (response, status) => {
      assert.equal(response.status, status);
      assert.equal(response.headers.get("cache-control"), "no-store");
      return response;
    };
    checked(await session.POST(request("POST", "{")), 400);
    for (const password of ["wrong", null]) checked(await session.POST(request("POST", JSON.stringify({ password }))), 401);
    checked(await session.POST(request("POST", JSON.stringify({ password: process.env.CONTACT_ADMIN_SECRET }), "", "https://evil.test")), 401);
    const login = checked(await session.POST(request("POST", JSON.stringify({ password: process.env.CONTACT_ADMIN_SECRET }))), 200);
    const setCookie = login.headers.get("set-cookie");
    assert.match(setCookie, /HttpOnly/);
    assert.match(setCookie, /SameSite=Strict/);
    assert.match(setCookie, /Max-Age=3600/);
    assert.match(setCookie, /; Secure/);
    assert.ok(!setCookie.includes(process.env.CONTACT_ADMIN_SECRET));
    const cookie = setCookie.split(";")[0];
    const denyAll = async (token) => {
      const spies = ["list", "find", "update", "delete"].map((method) => t.mock.method(contactStore, method));
      try {
        checked(await collection.GET(request("GET", undefined, token)), 401);
        checked(await item.GET(request("GET", undefined, token), context("missing")), 401);
        checked(await item.PUT(request("PUT", "{", token), context("missing")), 401);
        checked(await item.DELETE(request("DELETE", undefined, token), context("missing")), 401);
        assert.ok(spies.every((spy) => spy.mock.callCount() === 0));
      } finally { spies.forEach((spy) => spy.mock.restore()); }
    };
    await denyAll("");
    await denyAll(cookie + "tampered");
    await denyAll("contact_admin_session=invalid");
    await denyAll(cookie + "; " + cookie);
    const savedSecret = process.env.CONTACT_ADMIN_SECRET;
    delete process.env.CONTACT_ADMIN_SECRET;
    await denyAll(cookie);
    checked(await session.POST(request("POST", JSON.stringify({ password: savedSecret }))), 401);
    process.env.CONTACT_ADMIN_SECRET = "short";
    await denyAll(cookie);
    process.env.CONTACT_ADMIN_SECRET = randomBytes(32).toString("hex");
    await denyAll(cookie);
    process.env.CONTACT_ADMIN_SECRET = savedSecret;
    const now = Date.now();
    const clock = t.mock.method(Date, "now", () => now + 3601000);
    try { await denyAll(cookie); } finally { clock.mock.restore(); }
    checked(await item.PUT(request("PUT", body, cookie, "https://evil.test"), context("missing")), 401);
    checked(await item.DELETE(request("DELETE", undefined, cookie, "null"), context("missing")), 401);
    assert.equal(auth.authorized(request("GET", undefined, cookie)), true);
    assert.deepEqual((await checked(await collection.GET(request("GET", undefined, cookie)), 200).json()).submissions, []);
    assert.equal((await collection.POST(request("POST", body))).status, 201);
    const entries = await createContactStore(CONTACT_FILE).list();
    const first = entries[0];
    const second = await contactStore.save({ ...values, name: "Other" });
    const found = checked(await item.GET(request("GET", undefined, cookie), context(first.id)), 200);
    assert.deepEqual((await found.json()).submission, first);
    const before = await readFile(CONTACT_FILE, "utf8");
    for (const invalid of ["{", "null", "[]", "{}", JSON.stringify({ name: " ", email: "bad", message: " " })]) {
      checked(await item.PUT(request("PUT", invalid, cookie), context(first.id)), 400);
      assert.equal(await readFile(CONTACT_FILE, "utf8"), before);
    }
    const update = checked(await item.PUT(request("PUT", JSON.stringify({ ...values, name: " Changed ", message: " Updated " }), cookie), context(first.id)), 200);
    const updated = (await update.json()).submission;
    assert.equal(updated.id, first.id);
    assert.equal(updated.createdAt, first.createdAt);
    assert.equal(updated.name, "Changed");
    assert.equal(updated.message, "Updated");
    assert.deepEqual(await createContactStore(CONTACT_FILE).list(), [updated, second]);
    for (const response of [await item.GET(request("GET", undefined, cookie), context("unknown")),
      await item.PUT(request("PUT", body, cookie), context("unknown")), await item.DELETE(request("DELETE", undefined, cookie), context("unknown"))]) checked(response, 404);
    const deleted = checked(await item.DELETE(request("DELETE", undefined, cookie), context(first.id)), 204);
    assert.equal(await deleted.text(), "");
    assert.deepEqual(await createContactStore(CONTACT_FILE).list(), [second]);
    for (const raw of ["{broken", "[null]"]) {
      await writeFile(CONTACT_FILE, raw);
      for (const response of [await collection.GET(request("GET", undefined, cookie)),
        await item.GET(request("GET", undefined, cookie), context(second.id)),
        await item.PUT(request("PUT", body, cookie), context(second.id)),
        await item.DELETE(request("DELETE", undefined, cookie), context(second.id))]) {
        checked(response, 500);
        assert.equal((await response.json()).ok, false);
      }
      assert.equal(await readFile(CONTACT_FILE, "utf8"), raw);
    }
    const logout = checked(await session.DELETE(request("DELETE", undefined, cookie)), 204);
    assert.match(logout.headers.get("set-cookie"), /Max-Age=0/);
    assert.match(logout.headers.get("set-cookie"), /HttpOnly/);
  } finally {
    hooks.deregister();
    process.chdir(originalDirectory);
    if (previousSecret === undefined) delete process.env.CONTACT_ADMIN_SECRET;
    else process.env.CONTACT_ADMIN_SECRET = previousSecret;
    if (previousMode === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = previousMode;
    await rm(directory, { recursive: true, force: true });
  }
});

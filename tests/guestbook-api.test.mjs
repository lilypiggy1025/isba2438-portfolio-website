import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readFile, writeFile, rm } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";

test("guestbook API covers CRUD, validation, persistence, logging, and storage failures", async (t) => {
  const originalDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "portfolio-guestbook-api-"));
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/lib/guestbook/")) {
        return nextResolve(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
      }
      if (specifier === "./validation" && context.parentURL?.endsWith("/lib/guestbook/storage.ts")) {
        return nextResolve("./validation.ts", context);
      }
      return nextResolve(specifier, context);
    },
  });
  try {
    process.chdir(directory);
    const collection = await import("../app/api/guestbook/route.ts");
    const item = await import("../app/api/guestbook/[id]/route.ts");
    const { GUESTBOOK_FILE, createGuestbookStore } = await import("../lib/guestbook/storage.ts");
    const request = (method, body) => new Request("http://localhost/api/guestbook", {
      method, headers: { "Content-Type": "application/json" }, body,
    });
    const context = (id) => ({ params: Promise.resolve({ id }) });
    const values = { name: " Demo Guest ", message: " A private test message " };
    const body = JSON.stringify(values);
    const log = t.mock.method(console, "log", () => {});
    const empty = await collection.GET();
    assert.equal(empty.status, 200);
    assert.equal(empty.headers.get("cache-control"), "no-store");
    assert.deepEqual(await empty.json(), { ok: true, entries: [] });
    for (const invalid of ["{", "null", "[]", JSON.stringify({ name: " ", message: "\n" }),
      JSON.stringify({ name: 42, message: true }), JSON.stringify({ name: "x".repeat(61), message: "y".repeat(501) })]) {
      for (const response of [await collection.POST(request("POST", invalid)), await item.PUT(request("PUT", invalid), context("missing"))]) {
        assert.equal(response.status, 400);
        assert.equal((await response.json()).ok, false);
      }
    }
    await assert.rejects(readFile(GUESTBOOK_FILE), { code: "ENOENT" });
    assert.equal(log.mock.callCount(), 0);
    const createdResponse = await collection.POST(request("POST", body));
    assert.equal(createdResponse.status, 201);
    const { entry } = await createdResponse.json();
    assert.equal(entry.name, values.name.trim());
    assert.equal(entry.message, values.message.trim());
    assert.equal(createdResponse.headers.get("location"), `/api/guestbook/${entry.id}`);
    assert.equal(log.mock.callCount(), 1);
    assert.deepEqual(log.mock.calls[0].arguments, [`[Guestbook] CREATE id=${entry.id} status=201`]);
    const found = await item.GET(request("GET"), context(entry.id));
    assert.equal(found.status, 200);
    assert.deepEqual((await found.json()).entry, entry);
    assert.deepEqual((await (await collection.GET()).json()).entries, [entry]);
    const changed = await item.PUT(request("PUT", JSON.stringify({ name: " Updated ", message: " Changed " })), context(entry.id));
    assert.equal(changed.status, 200);
    const updated = (await changed.json()).entry;
    assert.equal(updated.name, "Updated");
    assert.equal(updated.message, "Changed");
    assert.equal(updated.id, entry.id);
    assert.equal(updated.createdAt, entry.createdAt);
    assert.ok(Date.parse(updated.updatedAt) >= Date.parse(entry.updatedAt));
    assert.deepEqual(await createGuestbookStore(GUESTBOOK_FILE).find(entry.id), updated);
    for (const response of [await item.GET(request("GET"), context("missing")),
      await item.PUT(request("PUT", body), context("missing")), await item.DELETE(request("DELETE"), context("missing"))]) {
      assert.equal(response.status, 404);
      assert.deepEqual(await response.json(), { ok: false, message: "Guestbook entry not found." });
    }
    const deleted = await item.DELETE(request("DELETE"), context(entry.id));
    assert.equal(deleted.status, 204);
    assert.equal(await deleted.text(), "");
    assert.deepEqual(await createGuestbookStore(GUESTBOOK_FILE).list(), []);
    assert.equal((await item.GET(request("GET"), context(entry.id))).status, 404);
    for (const raw of ["{broken", "{}", '[{"id":"invalid"}]']) {
      await writeFile(GUESTBOOK_FILE, raw);
      const responses = [await collection.GET(), await collection.POST(request("POST", body)),
        await item.GET(request("GET"), context(entry.id)), await item.PUT(request("PUT", body), context(entry.id)),
        await item.DELETE(request("DELETE"), context(entry.id))];
      for (const response of responses) {
        assert.equal(response.status, 500);
        const error = await response.json();
        assert.equal(error.ok, false);
        assert.equal(typeof error.message, "string");
      }
      assert.equal(await readFile(GUESTBOOK_FILE, "utf8"), raw);
    }
    assert.equal(log.mock.callCount(), 1);
  } finally {
    hooks.deregister();
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true });
  }
});

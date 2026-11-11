import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { registerHooks } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";

test("contact routes validate requests and share storage with the Server Action", async () => {
  const originalDirectory = process.cwd();
  const directory = await mkdtemp(join(tmpdir(), "portfolio-contact-api-"));
  // Resolve the project's TypeScript aliases and extensionless imports in Node.
  const hooks = registerHooks({
    resolve(specifier, context, nextResolve) {
      if (specifier.startsWith("@/")) {
        return nextResolve(new URL("../" + specifier.slice(2) + ".ts", import.meta.url).href, context);
      }
      if (specifier === "./storage" || specifier === "./validation") {
        return nextResolve(specifier + ".ts", context);
      }
      return nextResolve(specifier, context);
    },
  });

  try {
    process.chdir(directory);
    const { POST } = await import("../app/api/contacts/route.ts");
    const { POST: alias } = await import("../app/api/contact/route.ts");
    const { submitContact } = await import("../app/contact-me-server-form/actions.ts");
    const file = join(directory, "data", "contact-submissions.json");
    const request = (body) => new Request("http://localhost/api/contacts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    assert.equal(alias, POST);
    for (const body of ["{", "null", "[]"]) {
      const response = await POST(request(body));
      assert.equal(response.status, 400);
      assert.equal((await response.json()).ok, false);
    }
    const invalid = await POST(request(JSON.stringify({ name: " ", email: "bad@", message: "\n" })));
    assert.equal(invalid.status, 400);
    assert.deepEqual(Object.keys((await invalid.json()).errors).sort(), ["email", "message", "name"]);
    await assert.rejects(readFile(file), { code: "ENOENT" });

    const values = { name: " API sender ", email: "sender@example.com", message: " Hello " };
    const response = await POST(request(JSON.stringify(values)));
    assert.equal(response.status, 201);
    assert.equal((await response.json()).ok, true);

    const form = new FormData();
    for (const [key, value] of Object.entries({ ...values, name: "Server Action sender" })) {
      form.set(key, value);
    }
    assert.equal((await submitContact({}, form)).status, "success");

    const aliasResponse = await alias(request(JSON.stringify({ ...values, name: "Alias sender" })));
    assert.equal(aliasResponse.status, 201);
    const records = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(records.map((record) => record.name), ["API sender", "Server Action sender", "Alias sender"]);
    assert.ok(records.every((record) => record.message === "Hello" && record.id && record.createdAt));

    await writeFile(file, "{broken");
    const failure = await POST(request(JSON.stringify(values)));
    assert.equal(failure.status, 500);
    assert.equal((await failure.json()).ok, false);
    assert.equal(await readFile(file, "utf8"), "{broken");
  } finally {
    hooks.deregister();
    process.chdir(originalDirectory);
    await rm(directory, { recursive: true, force: true });
  }
});

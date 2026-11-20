import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { validateProject } from "../lib/projects/validation.ts";

const read = (file) => readFile(new URL("../" + file, import.meta.url), "utf8");

test("administrator session expiration is evaluated after the request-time boundary", async () => {
  const source = await read("app/admin/projects/page.tsx");
  const management = source.slice(source.indexOf("async function Management()"), source.indexOf("export default"));
  assert.match(source, /import \{ connection \} from "next\/server"/);
  assert.ok(management.indexOf("await connection();") >= 0);
  assert.ok(management.indexOf("await connection();") < management.indexOf("await cookies()"));
  assert.ok(management.indexOf("await connection();") < management.indexOf("authorized("));
  assert.match(source, /<Suspense[^>]*>.*<Management \/><\/Suspense>/);
});

test("project manager uses shared sessions and existing CRUD endpoints with preserved drafts", async () => {
  const source = await read("app/admin/projects/ProjectManager.tsx");
  assert.match(source, /\/api\/contact-admin\/session/);
  assert.doesNotMatch(source, /localStorage|sessionStorage|ADMIN_SECRET/);
  assert.match(source, /data.delete\("password"\)/);
  assert.match(source, /method: editingSlug \? "PUT" : "POST"/);
  assert.match(source, /encodeURIComponent\(editingSlug\)/);
  assert.match(source, /method: "DELETE"/);
  assert.match(source, /window.confirm/);
  assert.match(source, /response.status === 401/);
  assert.match(source, /validateProject\(values, existing\?\.layout\)/);
  assert.match(source, /await loadEntries\(\)/);
  assert.match(source, /router.refresh\(\)/);
  assert.match(source, /aria-describedby/);
  assert.match(source, /disabled=\{pending \|\| loading\}/);
  const save = source.slice(source.indexOf("async function save"), source.indexOf("async function deleteEntry"));
  assert.ok(save.indexOf("if (!response.ok || !feedback.ok)") < save.indexOf("setValues(emptyValues)"));
  assert.ok(save.indexOf("setValues(emptyValues)") < save.indexOf("} catch (error)"));
});

test("legacy empty descriptions remain editable and administrator page only supplies local image paths", async () => {
  const existing = { title: "My Creative Space", subtitle: "", description: "", image: "/projects-creative.jpg", icon: "" };
  assert.equal(validateProject(existing, "creative-gallery").valid, true);
  assert.equal(validateProject(existing, "standard").valid, false);
  const source = await read("app/admin/projects/page.tsx");
  assert.match(source, /authorized\(new Request/);
  assert.match(source, /await cookies\(\)/);
  assert.match(source, /entry.isFile\(\)/);
  assert.match(source, /initialAuthenticated=\{initialAuthenticated\}/);
  const css = await read("app/admin/projects/projects.module.css");
  assert.match(css, /font-size: 13px; line-height: 1.4; padding: 7px 15px/);
  assert.match(css, /border-radius: 30px/);
  assert.match(css, /gap: 12px/);
});

test("only original project slugs with placeholder dates receive the neutral date label", async () => {
  const source = await read("app/admin/projects/ProjectManager.tsx");
  assert.match(source, /\(entry.slug === "creative-space" \|\| entry.slug === "inspiration-board"\) && entry.createdAt === "1970-01-01T00:00:00.000Z"\s*\? <p>Original project<\/p>\s*: <time dateTime=\{entry.createdAt\}>\{dateFormat.format\(new Date\(entry.createdAt\)\)\}<\/time>/);
});

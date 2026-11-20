import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import * as favoritesModule from "../app/my-favorites/favorites-data.ts";

const { parseFavorites, CATEGORIES } = favoritesModule;
const record = { id: "fixture-1", title: "A favorite", category: "Movies", description: "A description" };
const parseRecord = (changes) => parseFavorites(JSON.stringify([{ ...record, ...changes }]));

test("Favorites parser treats missing storage and empty arrays as empty collections", () => {
  assert.deepEqual(parseFavorites(null), []);
  assert.deepEqual(parseFavorites("[]"), []);
});

test("Favorites parser restores all categories, values, and order without trimming stored text", () => {
  const records = CATEGORIES.map((category, index) => ({ ...record, id: `fixture-${index}`, category, title: " Preserved title ", description: "Line one\nLine two" }));
  assert.deepEqual(parseFavorites(JSON.stringify(records)), records);
  assert.deepEqual(parseRecord({ description: undefined }), [{ ...record, description: "" }]);
  assert.deepEqual(parseRecord({ description: "" }), [{ ...record, description: "" }]);
});

test("Favorites parser rejects malformed JSON and non-array JSON", () => {
  for (const raw of ["{", "", "[", "undefined"]) assert.throws(() => parseFavorites(raw), SyntaxError);
  for (const raw of ["null", "{}", '"text"', "12", "true"]) assert.throws(() => parseFavorites(raw), /Invalid favorites collection/);
});

test("Favorites parser rejects missing, empty, invalid, and duplicate IDs", () => {
  for (const id of [undefined, "", null, 1, false, {}]) assert.throws(() => parseRecord({ id }), /Invalid favorite data/);
  assert.throws(() => parseFavorites(JSON.stringify([record, record])), /Invalid favorite data/);
  // Preserve the original parser's acceptance of nonempty whitespace IDs.
  assert.equal(parseRecord({ id: " " })[0].id, " ");
});

test("Favorites parser rejects blank titles, unsupported categories, and invalid record structures", () => {
  for (const title of [undefined, "", " \n\t ", null, 1, {}]) assert.throws(() => parseRecord({ title }), /Invalid favorite data/);
  for (const category of [undefined, "movies", "Games", "", null, 1]) assert.throws(() => parseRecord({ category }), /Invalid favorite data/);
  for (const value of [null, [], 1, "text", false]) assert.throws(() => parseFavorites(JSON.stringify([value])), /Invalid favorite data/);
});

test("Favorites parser rejects invalid description types and leaves fixtures untouched", () => {
  for (const description of [null, 1, true, [], {}]) assert.throws(() => parseRecord({ description }), /Invalid favorite data/);
  const raw = JSON.stringify([record, { ...record, id: "fixture-2", title: " " }]);
  assert.throws(() => parseFavorites(raw));
  assert.equal(raw, JSON.stringify([record, { ...record, id: "fixture-2", title: " " }]));
});

// Execute the real component with isolated hooks, JSX, and browser API mocks.
// This checks rendering and handlers without a DOM or real browser storage.
const require = createRequire(import.meta.url);
const { transpileModule, ModuleKind, JsxEmit } = require("typescript");
const source = await readFile(new URL("../app/my-favorites/Favorites.tsx", import.meta.url), "utf8");
const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS, jsx: JsxEmit.ReactJSX } }).outputText;

function componentFixture(raw, { readFails = false, writeFails = false } = {}) {
  const slots = [];
  const effects = [];
  const timers = [];
  let cursor = 0;
  let stored = raw;
  let writes = 0;
  const hooks = {
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = initial;
      return [slots[index], (next) => { slots[index] = typeof next === "function" ? next(slots[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect(effect) {
      const index = cursor++;
      if (!(index in slots)) { slots[index] = true; effects.push(effect); }
    },
  };
  const jsx = (type, props) => ({ type, props });
  const exports = {};
  runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === "react") return hooks;
      if (name === "react/jsx-runtime") return { jsx, jsxs: jsx };
      if (name === "./favorites-data") return favoritesModule;
      if (name.endsWith(".css")) return { default: {} };
      throw new Error(`Unexpected component import: ${name}`);
    },
    window: {
      setTimeout(callback) { timers.push(callback); return timers.length; },
      clearTimeout() {},
      crypto: { randomUUID: () => "fixture-created" },
      confirm: () => true,
      localStorage: {
        getItem(key) { assert.equal(key, "liwen-portfolio:my-favorites:v1"); if (readFails) throw new Error("Unavailable"); return stored; },
        setItem(key, value) { assert.equal(key, "liwen-portfolio:my-favorites:v1"); writes++; if (writeFails) throw new Error("Quota exceeded"); stored = value; },
      },
    },
  });
  return {
    render() { cursor = 0; return exports.default(); },
    load() { effects.splice(0).forEach((effect) => effect()); timers.splice(0).forEach((timer) => timer()); },
    stored: () => stored,
    writes: () => writes,
  };
}

function nodes(tree) {
  if (!tree || typeof tree !== "object") return [];
  return [tree, ...[tree.props?.children].flat(Infinity).flatMap(nodes)];
}
const find = (tree, predicate) => nodes(tree).find(predicate);

test("Favorites component renders missing and empty storage feedback without writing during hydration", () => {
  for (const raw of [null, "[]"]) {
    const fixture = componentFixture(raw);
    let tree = fixture.render();
    assert.equal(find(tree, (node) => node.type === "fieldset").props.disabled, true);
    assert.ok(find(tree, (node) => node.props?.children === "Loading your favorites…"));
    fixture.load();
    tree = fixture.render();
    assert.equal(find(tree, (node) => node.type === "fieldset").props.disabled, false);
    assert.ok(find(tree, (node) => node.props?.children === "A fresh page awaits. Save your first favorite to begin."));
    assert.equal(fixture.writes(), 0);
    assert.equal(fixture.stored(), raw);
  }
});

test("Favorites component displays invalid-data errors, disables saving, and preserves original data", () => {
  for (const raw of ["{broken", "{}", JSON.stringify([{ ...record, title: " " }])]) {
    const fixture = componentFixture(raw);
    fixture.render(); fixture.load();
    const tree = fixture.render();
    const alert = find(tree, (node) => node.props?.role === "alert" && typeof node.props.children === "string");
    assert.match(alert.props.children, /Saved favorites could not be loaded/);
    assert.match(alert.props.children, /Your stored data has been preserved/);
    assert.equal(find(tree, (node) => node.type === "fieldset").props.disabled, true);
    find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
    assert.equal(fixture.writes(), 0);
    assert.equal(fixture.stored(), raw);
    assert.equal(find(tree, (node) => node.props?.children === "A fresh page awaits. Save your first favorite to begin."), undefined);
  }
});

test("Favorites component handles storage-read failures and restores valid records", () => {
  const failed = componentFixture("unchanged", { readFails: true });
  failed.render(); failed.load();
  assert.equal(find(failed.render(), (node) => node.type === "fieldset").props.disabled, true);
  assert.equal(failed.stored(), "unchanged");
  const valid = componentFixture(JSON.stringify([record]));
  valid.render(); valid.load();
  assert.ok(find(valid.render(), (node) => node.type === "h3" && node.props.children === record.title));
  assert.equal(valid.writes(), 0);
});

test("Favorites component preserves saved data and draft when a storage write fails", () => {
  const raw = JSON.stringify([record]);
  const fixture = componentFixture(raw, { writeFails: true });
  fixture.render(); fixture.load();
  let tree = fixture.render();
  find(tree, (node) => node.props?.id === "favorite-title").props.onChange({ target: { value: "Draft title" } });
  find(tree, (node) => node.props?.id === "favorite-category").props.onChange({ target: { value: "Books" } });
  tree = fixture.render();
  find(tree, (node) => node.type === "form").props.onSubmit({ preventDefault() {} });
  tree = fixture.render();
  assert.match(find(tree, (node) => node.props?.role === "alert").props.children, /This change could not be saved/);
  assert.equal(find(tree, (node) => node.props?.id === "favorite-title").props.value, "Draft title");
  assert.equal(find(tree, (node) => node.props?.id === "favorite-category").props.value, "Books");
  assert.equal(fixture.stored(), raw);
  assert.ok(find(tree, (node) => node.type === "h3" && node.props.children === record.title));
});

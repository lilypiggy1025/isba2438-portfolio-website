import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateContact } from '../lib/contact/validation.ts';
import { registerHooks } from 'node:module';

const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (specifier === './validation' && context.parentURL?.endsWith('/lib/contact/storage.ts')) {
      return nextResolve('./validation.ts', context);
    }
    return nextResolve(specifier, context);
  },
});
const { createContactStore } = await import('../lib/contact/storage.ts');
hooks.deregister();

test('server validation trims text and enforces every specified email rule', () => {
  const valid = validateContact({ name: ' Liwen ', message: ' Hello ', email: 'a@b.c' });
  assert.equal(valid.valid, true);
  assert.equal(valid.values.name, 'Liwen');
  assert.equal(valid.values.message, 'Hello');
  for (const email of ['', '@b.c', 'a@@b.c', 'abc', 'a@bc', 'a@.bc', 'a@bc.', 'a@b..c', ' a@b.c', 'a@b.c ', 'a b@c.d', 'a@b.\tc']) {
    assert.equal(validateContact({ name: 'A', message: 'B', email }).valid, false, email);
  }
  for (const name of ['', ' \n ', null]) assert.ok(validateContact({ name, message: 'B', email: 'a@b.c' }).errors.name);
  assert.ok(validateContact({ name: 'A', message: ' \t ', email: 'a@b.c' }).errors.message);
});

test('JSON storage serializes writes, preserves existing records, and reports corruption/failure', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'portfolio-contact-'));
  try {
    const file = path.join(directory, 'data', 'messages.json');
    const store = createContactStore(file);
    const values = { name: 'A', email: 'a@b.c', message: 'Hello' };
    await Promise.all(Array.from({ length: 12 }, () => store.save(values)));
    const entries = JSON.parse(await readFile(file, 'utf8'));
    assert.equal(entries.length, 12);
    assert.equal(new Set(entries.map(x => x.id)).size, 12);
    assert.ok(entries.every(x => x.message === 'Hello' && x.createdAt));
    await writeFile(file, '{broken');
    await assert.rejects(store.save(values));
    assert.equal(await readFile(file, 'utf8'), '{broken');
    await writeFile(file, '{}');
    await assert.rejects(store.save(values));
    await writeFile(file, '[]');
    await store.save(values);
    assert.equal(JSON.parse(await readFile(file, 'utf8')).length, 1);
    const blocked = path.join(directory, 'blocked');
    await writeFile(blocked, 'not a directory');
    await assert.rejects(createContactStore(path.join(blocked, 'messages.json')).save(values));
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('contact CRUD preserves identity, extra fields, order, and persistence across concurrent mutations', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'contact-crud-'));
  try {
    const file = path.join(directory, 'entries.json');
    const store = createContactStore(file);
    const values = { name: 'A', email: 'a@b.c', message: 'Hello' };
    assert.deepEqual(await store.list(), []);
    assert.equal(await store.find('missing'), undefined);
    assert.equal(await store.update('missing', values), undefined);
    assert.equal(await store.delete('missing'), false);
    await assert.rejects(readFile(file), { code: 'ENOENT' });
    const first = await store.save(values);
    const second = await store.save(values);
    const seeded = [{ ...first, extra: { keep: true } }, second];
    await writeFile(file, JSON.stringify(seeded));
    const updated = await store.update(first.id, { name: ' Updated ', email: 'new@example.com', message: ' Changed ', id: 'replace', createdAt: 'replace', extra: 'replace' });
    assert.deepEqual(updated, { ...seeded[0], name: 'Updated', email: 'new@example.com', message: 'Changed' });
    const reopened = createContactStore(file);
    assert.deepEqual(await reopened.list(), [updated, second]);
    const before = await readFile(file, 'utf8');
    assert.equal(await store.update('unknown', values), undefined);
    assert.equal(await store.delete('unknown'), false);
    assert.equal(await readFile(file, 'utf8'), before);
    const results = await Promise.allSettled([
      store.update(first.id, { ...values, name: ' ' }),
      store.update(first.id, { ...values, name: 'Final' }),
      store.delete(second.id),
      store.save(values),
    ]);
    assert.equal(results[0].status, 'rejected');
    assert.ok(results.slice(1).every(result => result.status === 'fulfilled'));
    const entries = await reopened.list();
    assert.equal(entries.length, 2);
    assert.equal(entries[0].id, first.id);
    assert.equal(entries[0].name, 'Final');
    assert.equal(entries[0].createdAt, first.createdAt);
    assert.deepEqual(entries[0].extra, { keep: true });
    assert.equal(await reopened.find(second.id), undefined);
    assert.equal(entries[1].id, results[3].value.id);
    assert.equal(await store.delete(first.id), true);
    assert.deepEqual(await reopened.list(), [entries[1]]);
    assert.deepEqual((await readdir(directory)).filter(name => name.endsWith('.tmp')), []);
  } finally { await rm(directory, { recursive: true, force: true }); }
});

test('invalid contact input and malformed records are rejected without damaging files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'contact-corruption-'));
  try {
    const file = path.join(directory, 'entries.json');
    const store = createContactStore(file);
    const values = { name: 'A', email: 'a@b.c', message: 'Hello' };
    const entry = await store.save(values);
    const original = await readFile(file, 'utf8');
    for (const input of [null, [], {}, { ...values, name: 42 }, { ...values, message: false },
      { ...values, name: ' ' }, { ...values, message: '\n' }, { ...values, email: ' bad@example.com' }]) {
      await assert.rejects(store.update(entry.id, input));
      await assert.rejects(store.save(input));
      assert.equal(await readFile(file, 'utf8'), original);
    }
    for (const raw of ['{broken', '{}', '[null]', JSON.stringify([{ ...entry, name: ' ' }]),
      JSON.stringify([{ ...entry, email: 5 }]), JSON.stringify([{ ...entry, message: {} }]),
      JSON.stringify([{ ...entry, id: '' }]), JSON.stringify([{ ...entry, createdAt: 'invalid' }]), JSON.stringify([entry, entry])]) {
      await writeFile(file, raw);
      await assert.rejects(store.list());
      await assert.rejects(store.find(entry.id));
      await assert.rejects(store.save(values));
      await assert.rejects(store.update(entry.id, values));
      await assert.rejects(store.delete(entry.id));
      assert.equal(await readFile(file, 'utf8'), raw);
    }
    await writeFile(file, original);
    assert.equal(await store.delete(entry.id), true);
    const blocked = path.join(directory, 'blocked');
    await writeFile(blocked, 'keep');
    const failed = createContactStore(path.join(blocked, 'entries.json'));
    await assert.rejects(failed.list());
    await assert.rejects(failed.update(entry.id, values));
    await assert.rejects(failed.delete(entry.id));
    assert.equal(await readFile(blocked, 'utf8'), 'keep');
  } finally { await rm(directory, { recursive: true, force: true }); }
});

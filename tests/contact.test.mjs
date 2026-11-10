import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { validateContact } from '../lib/contact/validation.ts';
import { createContactStore } from '../lib/contact/storage.ts';

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

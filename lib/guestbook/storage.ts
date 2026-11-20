import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { CreateGuestbookInput, GuestbookEntry, UpdateGuestbookInput } from "./types";
import { validateGuestbook } from "./validation";

export const GUESTBOOK_FILE = path.join(process.cwd(), "data", "guestbook-entries.json");

function parseEntries(raw: string): GuestbookEntry[] {
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Guestbook storage must contain an array.");
  const ids = new Set<string>();
  for (const entry of data) {
    if (!entry || typeof entry !== "object") throw new Error("Invalid stored guestbook entry.");
    const result = validateGuestbook(entry);
    if (!result.valid || result.values.name !== entry.name || result.values.message !== entry.message ||
      typeof entry.id !== "string" || !entry.id.trim() || ids.has(entry.id) ||
      typeof entry.createdAt !== "string" || !Number.isFinite(Date.parse(entry.createdAt)) ||
      typeof entry.updatedAt !== "string" || !Number.isFinite(Date.parse(entry.updatedAt)) ||
      Date.parse(entry.updatedAt) < Date.parse(entry.createdAt)) {
      throw new Error("Invalid stored guestbook entry.");
    }
    ids.add(entry.id);
  }
  return data;
}

export function createGuestbookStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();

  async function list(): Promise<GuestbookEntry[]> {
    try {
      return parseEntries(await readFile(file, "utf8"));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async function write(entries: GuestbookEntry[]) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = file + "." + randomUUID() + ".tmp";
    try {
      await writeFile(temporary, JSON.stringify(entries, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== "ENOENT") throw error;
      });
    }
  }

  function mutate<T>(operation: (entries: GuestbookEntry[]) => Promise<T>): Promise<T> {
    const pending = queue.then(async () => operation(await list()));
    queue = pending.catch(() => {});
    return pending;
  }

  function validatedValues(input: unknown): CreateGuestbookInput {
    const result = validateGuestbook(input);
    if (!result.valid) throw new Error(Object.values(result.errors).join(" "));
    return result.values;
  }

  return {
    list,
    async find(id: string) {
      return (await list()).find((entry) => entry.id === id);
    },
    create(input: CreateGuestbookInput): Promise<GuestbookEntry> {
      return mutate(async (entries) => {
        const values = validatedValues(input);
        const timestamp = new Date().toISOString();
        const entry = { ...values, id: randomUUID(), createdAt: timestamp, updatedAt: timestamp };
        await write([entry, ...entries]);
        return entry;
      });
    },
    update(id: string, input: UpdateGuestbookInput): Promise<GuestbookEntry | undefined> {
      return mutate(async (entries) => {
        const values = validatedValues(input);
        const existing = entries.find((entry) => entry.id === id);
        if (!existing) return undefined;
        const updatedAt = new Date(Math.max(Date.now(), Date.parse(existing.updatedAt))).toISOString();
        const updated = { ...existing, ...values, updatedAt };
        await write(entries.map((entry) => entry.id === id ? updated : entry));
        return updated;
      });
    },
    delete(id: string): Promise<boolean> {
      return mutate(async (entries) => {
        if (!entries.some((entry) => entry.id === id)) return false;
        await write(entries.filter((entry) => entry.id !== id));
        return true;
      });
    },
  };
}

export const guestbookStore = createGuestbookStore(GUESTBOOK_FILE);

import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { validateContact, type ContactValues } from "./validation";

// Both contact entry points must import this module to share the file and queue.
export const CONTACT_FILE = path.join(process.cwd(), "data", "contact-submissions.json");
export type ContactSubmission = ContactValues & { id: string; createdAt: string };

function validatedValues(input: unknown): ContactValues {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Contact values must be an object.");
  }
  const { name, email, message } = input as Record<string, unknown>;
  const result = validateContact({ name, email, message });
  if (!result.valid) throw new Error(Object.values(result.errors).join(" "));
  return result.values;
}

export function createContactStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();

  async function list(): Promise<ContactSubmission[]> {
    try {
      const entries: unknown = JSON.parse(await readFile(file, "utf8"));
      if (!Array.isArray(entries)) throw new Error("Contact storage must contain a JSON array.");
      const ids = new Set<string>();
      for (const entry of entries) {
        validatedValues(entry);
        if (typeof entry.id !== "string" || !entry.id.trim() || ids.has(entry.id) ||
          typeof entry.createdAt !== "string" || !Number.isFinite(Date.parse(entry.createdAt))) {
          throw new Error("Invalid stored contact submission.");
        }
        ids.add(entry.id);
      }
      return entries;
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
      throw error;
    }
  }

  async function write(entries: ContactSubmission[]) {
    await mkdir(path.dirname(file), { recursive: true });
    const temporary = `${file}.${randomUUID()}.tmp`;
    try {
      await writeFile(temporary, JSON.stringify(entries, null, 2) + "\n", { flag: "wx", mode: 0o600 });
      await rename(temporary, file);
    } finally {
      await unlink(temporary).catch(() => {});
    }
  }

  function mutate<T>(operation: (entries: ContactSubmission[]) => Promise<T>): Promise<T> {
    const pending = queue.then(async () => operation(await list()));
    // A failed mutation must not prevent later submissions from being attempted.
    queue = pending.catch(() => {});
    return pending;
  }

  return {
    list,
    async find(id: string) {
      return (await list()).find((entry) => entry.id === id);
    },
    save(values: ContactValues): Promise<ContactSubmission> {
      return mutate(async (entries) => {
        const normalized = validatedValues(values);
        const submission = { ...values, ...normalized, id: randomUUID(), createdAt: new Date().toISOString() };
        await write([...entries, submission]);
        return submission;
      });
    },
    update(id: string, values: ContactValues): Promise<ContactSubmission | undefined> {
      return mutate(async (entries) => {
        const normalized = validatedValues(values);
        const existing = entries.find((entry) => entry.id === id);
        if (!existing) return undefined;
        const updated = { ...existing, ...normalized };
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

export const contactStore = createContactStore(CONTACT_FILE);

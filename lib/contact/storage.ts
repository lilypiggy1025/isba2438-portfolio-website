import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ContactValues } from "./validation";

// Both contact entry points must import this module to share the file and queue.
export const CONTACT_FILE = path.join(process.cwd(), "data", "contact-submissions.json");
export type ContactSubmission = ContactValues & { id: string; createdAt: string };

export function createContactStore(file: string) {
  let queue: Promise<unknown> = Promise.resolve();
  return {
    save(values: ContactValues): Promise<ContactSubmission> {
      const operation = queue.then(async () => {
        await mkdir(path.dirname(file), { recursive: true });
        let entries: unknown;
        try {
          entries = JSON.parse(await readFile(file, "utf8"));
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
          entries = [];
        }
        if (!Array.isArray(entries)) throw new Error("Contact storage must contain a JSON array.");
        const submission = { ...values, id: randomUUID(), createdAt: new Date().toISOString() };
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          await writeFile(temporary, JSON.stringify([...entries, submission], null, 2) + "\n", { flag: "wx", mode: 0o600 });
          await rename(temporary, file);
        } finally {
          await unlink(temporary).catch(() => {});
        }
        return submission;
      });
      // A failed write must not prevent later submissions from being attempted.
      queue = operation.catch(() => {});
      return operation;
    },
  };
}

export const contactStore = createContactStore(CONTACT_FILE);

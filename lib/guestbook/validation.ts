import type { CreateGuestbookInput } from "./types";

export type GuestbookErrors = Partial<Record<keyof CreateGuestbookInput, string>>;

export function validateGuestbook(input: unknown) {
  const body = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
  const name = typeof body.name === "string" ? body.name.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const errors: GuestbookErrors = {};
  if (typeof body.name !== "string") errors.name = "Name must be text.";
  else if (!name) errors.name = "Please enter your name.";
  else if (name.length > 60) errors.name = "Use 60 characters or fewer for your name.";
  if (typeof body.message !== "string") errors.message = "Message must be text.";
  else if (!message) errors.message = "Please enter a message.";
  else if (message.length > 500) errors.message = "Use 500 characters or fewer for your message.";
  return { values: { name, message }, errors, valid: Object.keys(errors).length === 0 };
}

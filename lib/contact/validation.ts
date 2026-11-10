export type ContactValues = { name: string; email: string; message: string };
export type FieldErrors = Partial<Record<keyof ContactValues, string>>;

export function validateContact(input: Record<keyof ContactValues, unknown>) {
  const values: ContactValues = {
    name: typeof input.name === "string" ? input.name.trim() : "",
    email: typeof input.email === "string" ? input.email : "",
    message: typeof input.message === "string" ? input.message.trim() : "",
  };
  const errors: FieldErrors = {};
  if (!values.name) errors.name = "Please enter your name.";
  if (!values.message) errors.message = "Please enter a message.";
  const parts = values.email.split("@");
  const domain = parts[1] ?? "";
  if (/\s/u.test(values.email) || parts.length !== 2 || !parts[0] ||
      !domain.includes(".") || domain.split(".").some((label) => !label)) {
    errors.email = "Enter an email with one @, a nonempty local part, and a dotted domain with no empty labels or whitespace.";
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}

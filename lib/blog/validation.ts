export type BlogInput = { title: string; content: string };
export type BlogErrors = Partial<Record<keyof BlogInput, string>>;

export function validateBlog(input: unknown) {
  const body = input && typeof input === "object" ? input as Record<string, unknown> : {};
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const content = typeof body.content === "string" ? body.content.trim() : "";
  const errors: BlogErrors = {};
  if (!title) errors.title = "Enter a title.";
  else if (title.length > 120) errors.title = "Use 120 characters or fewer.";
  if (!content) errors.content = "Enter your post content.";
  else if (content.length > 20000) errors.content = "Use 20,000 characters or fewer.";
  return { values: { title, content }, errors, valid: Object.keys(errors).length === 0 };
}

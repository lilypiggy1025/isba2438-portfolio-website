import type { ProjectInput, ProjectLayout } from "./types";

export type ProjectErrors = Partial<Record<keyof ProjectInput, string>>;
const limits = { title: 120, subtitle: 200, description: 10000, image: 300, icon: 16 };

export function validateProject(input: unknown, layout: ProjectLayout = "standard") {
  const body = input && typeof input === "object" && !Array.isArray(input)
    ? input as Record<string, unknown> : {};
  const values: ProjectInput = { title: "", subtitle: "", description: "", image: "", icon: "" };
  const errors: ProjectErrors = {};
  for (const field of Object.keys(values) as (keyof ProjectInput)[]) {
    if (typeof body[field] !== "string") {
      errors[field] = `${field[0].toUpperCase() + field.slice(1)} must be text.`;
      continue;
    }
    values[field] = body[field].trim();
    if (values[field].length > limits[field]) errors[field] = `Use ${limits[field]} characters or fewer for ${field}.`;
  }
  if (!errors.title && !values.title) errors.title = "Please enter a project title.";
  if (!errors.description && !values.description && layout === "standard") errors.description = "Please enter a project description.";
  if (!errors.image && (!/^\/(?!\/)[A-Za-z0-9_./-]+\.(?:png|jpe?g|webp|gif|avif)$/i.test(values.image) ||
    values.image.split("/").some((segment) => segment === "." || segment === ".."))) {
    errors.image = "Use a local image path beginning with / and a supported image extension.";
  }
  return { values, errors, valid: Object.keys(errors).length === 0 };
}

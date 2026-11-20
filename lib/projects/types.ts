export type ProjectLayout = "creative-gallery" | "inspiration-board" | "standard";
export type ProjectInput = {
  title: string;
  subtitle: string;
  description: string;
  image: string;
  icon: string;
};
export type CreateProjectInput = ProjectInput;
export type UpdateProjectInput = ProjectInput;
export type Project = ProjectInput & {
  slug: string;
  layout: ProjectLayout;
  createdAt: string;
  updatedAt: string;
};

export const CATEGORIES = ["Movies", "Books", "Music", "Websites"] as const;
type Category = typeof CATEGORIES[number];
export type Favorite = { id: string; title: string; category: Category; description: string };

export function isCategory(value: unknown): value is Category {
  return CATEGORIES.some((category) => category === value);
}

export function parseFavorites(raw: string | null): Favorite[] {
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data)) throw new Error("Invalid favorites collection.");
  const ids = new Set<string>();
  const favorites: Favorite[] = [];
  for (const favorite of data) {
    if (!favorite || typeof favorite !== "object" || typeof favorite.id !== "string" ||
      !favorite.id || ids.has(favorite.id) || typeof favorite.title !== "string" ||
      !favorite.title.trim() || !isCategory(favorite.category) ||
      (favorite.description !== undefined && typeof favorite.description !== "string")) {
      throw new Error("Invalid favorite data.");
    }
    ids.add(favorite.id);
    favorites.push({ id: favorite.id, title: favorite.title, category: favorite.category, description: favorite.description ?? "" });
  }
  return favorites;
}

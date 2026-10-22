import "server-only";
import { getCategories, getVisibleProducts } from "./catalog";
import type { CategoryLink } from "@/components/catalog/CatalogBrowser";

/** Categories with their visible product counts; empty categories are hidden. */
export async function getCategoryLinks(): Promise<CategoryLink[]> {
  const [categories, products] = await Promise.all([getCategories(), getVisibleProducts()]);
  return categories
    .map((c) => ({ id: c.id, slug: c.slug, name: c.name, count: products.filter((p) => p.categoryId === c.id).length }))
    .filter((c) => c.count > 0);
}

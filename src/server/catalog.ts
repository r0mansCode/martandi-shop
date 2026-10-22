import "server-only";
import { cache } from "react";
import { db } from "./db";
import { activeVariants } from "@/lib/money";
import type { Product } from "@/lib/types";

// Storefront reads. Only published products with at least one active variant are visible.
// React `cache` dedupes calls within a single render.

const isVisible = (p: Product) => p.status === "published" && activeVariants(p).length > 0;

export const getCategories = cache(() => db.categories.list());

export const getCategoryBySlug = cache((slug: string) => db.categories.getBySlug(slug));

export const getVisibleProducts = cache(async () => (await db.products.list()).filter(isVisible));

export const getProductsByCategory = cache(async (categoryId: string) =>
  (await getVisibleProducts()).filter((p) => p.categoryId === categoryId),
);

export const getProductBySlug = cache(async (slug: string) => {
  const product = await db.products.getBySlug(slug);
  return product && isVisible(product) ? product : null;
});

/** Visible products in the same category, excluding the given one. */
export async function getRelatedProducts(product: Product, limit: number) {
  const inCategory = await getProductsByCategory(product.categoryId);
  return inCategory.filter((p) => p.id !== product.id).slice(0, limit);
}

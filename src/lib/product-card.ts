import { activeVariants, fromPriceCents } from "./money";
import type { Product, ProductBadge } from "./types";

/** The slim product shape sent to the browser for grids, filters and search. */
export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  categoryId: string;
  image: { url: string; alt: string } | null;
  fromPriceCents: number;
  variantCount: number;
  /** Label of the only active variant, e.g. "0,7 l"; null when there are several. */
  singleVariantLabel: string | null;
  badge?: ProductBadge;
  abv?: number;
  country?: string;
  producer?: string;
};

/** Only call for visible products (they always have an active variant). */
export function toCardData(p: Product): ProductCardData {
  const variants = activeVariants(p);
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    image: p.images[0] ?? null,
    fromPriceCents: fromPriceCents(p) ?? 0,
    variantCount: variants.length,
    singleVariantLabel: variants.length === 1 ? variants[0].label : null,
    badge: p.badge,
    abv: p.abv,
    country: p.country,
    producer: p.producer,
  };
}

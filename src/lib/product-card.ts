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
  /** The only active variant, so the card can add it to the cart directly; null when there are several. */
  quickAdd: { variantId: string; label: string; priceCents: number; depositCents?: number; image: string | null } | null;
  isAlcohol: boolean;
  badge?: ProductBadge;
  abv?: number;
  country?: string;
  producer?: string;
};

/** Only call for visible products (they always have an active variant). */
export function toCardData(p: Product): ProductCardData {
  const variants = activeVariants(p);
  const only = variants.length === 1 ? variants[0] : null;
  return {
    id: p.id,
    slug: p.slug,
    name: p.name,
    categoryId: p.categoryId,
    image: p.images[0] ?? null,
    fromPriceCents: fromPriceCents(p) ?? 0,
    variantCount: variants.length,
    singleVariantLabel: only?.label ?? null,
    quickAdd: only
      ? {
          variantId: only.id,
          label: only.label,
          priceCents: only.priceCents,
          depositCents: only.depositCents,
          image: only.image ?? p.images[0]?.url ?? null,
        }
      : null,
    isAlcohol: p.isAlcohol,
    badge: p.badge,
    abv: p.abv,
    country: p.country,
    producer: p.producer,
  };
}

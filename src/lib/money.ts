import { site } from "@/config/site";
import type { OrderTotals, Product } from "./types";

const eur = new Intl.NumberFormat(site.locale, {
  style: "currency",
  currency: site.currency,
});

export function formatPrice(cents: number): string {
  return eur.format(cents / 100);
}

/**
 * Split a VAT-inclusive total into net + VAT. VAT is derived once from the
 * gross total so net + vat always equals gross exactly.
 */
export function splitVat(grossCents: number, vatRate: number = site.vatRate): OrderTotals {
  const netCents = Math.round(grossCents / (1 + vatRate));
  return { netCents, vatCents: grossCents - netCents, grossCents };
}

export function activeVariants(product: Product) {
  return product.variants.filter((v) => v.active);
}

/** Lowest active variant price, or null if the product has no active variants. */
export function fromPriceCents(product: Product): number | null {
  const prices = activeVariants(product).map((v) => v.priceCents);
  return prices.length ? Math.min(...prices) : null;
}

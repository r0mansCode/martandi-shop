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

/**
 * Order or cart totals. VAT applies to the goods only; the packaging deposit is VAT-free (0%),
 * so it is added after the split and never goes through splitVat.
 */
export function orderTotals(lines: { priceCents: number; depositCents?: number; qty: number }[]): OrderTotals {
  const goodsCents = lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
  const depositCents = lines.reduce((sum, l) => sum + (l.depositCents ?? 0) * l.qty, 0);
  const goods = splitVat(goodsCents);
  return depositCents > 0 ? { ...goods, depositCents, grossCents: goodsCents + depositCents } : goods;
}

export function activeVariants(product: Product) {
  return product.variants.filter((v) => v.active);
}

/** Lowest active variant price, or null if the product has no active variants. */
export function fromPriceCents(product: Product): number | null {
  const prices = activeVariants(product).map((v) => v.priceCents);
  return prices.length ? Math.min(...prices) : null;
}

import { getVisibleProducts } from "@/server/catalog";
import { activeVariants } from "@/lib/money";
import type { LinePrice } from "@/lib/checkout-input";

// Current price and deposit of every sellable variant. The cart (a localStorage snapshot) syncs
// against this on open, so lines added before a price or deposit change show the right total.
// Static JSON with time-based ISR, like the search index; checkout still re-prices from the DB.
export const dynamic = "force-static";
export const revalidate = 60;

export async function GET() {
  const prices: Record<string, LinePrice> = {};
  for (const product of await getVisibleProducts()) {
    for (const v of activeVariants(product)) {
      prices[v.id] = { priceCents: v.priceCents, ...(v.depositCents ? { depositCents: v.depositCents } : {}) };
    }
  }
  return Response.json(prices);
}

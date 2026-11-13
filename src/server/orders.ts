import "server-only";
import { db } from "./db";
import { activeVariants, orderTotals } from "@/lib/money";
import { MAX_QTY } from "@/lib/cart-limits";
import type { CheckoutInput, LinePrice } from "@/lib/checkout-input";
import type { Order, OrderItem, Product, Variant } from "@/lib/types";
import { pickup, site } from "@/config/site";

export type CreateOrderResult =
  | { kind: "created"; order: Order }
  /** Some lines are gone or repriced (price or deposit); nothing was saved. */
  | { kind: "cart_changed"; prices: Record<string, LinePrice>; removed: string[] }
  | { kind: "age_required" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Year in shop time, so an order at 00:30 on 1 January Riga time counts towards the new year. */
function shopYear(date: Date): string {
  return new Intl.DateTimeFormat("en", { year: "numeric", timeZone: site.timeZone }).format(date);
}

const counterKey = (year: string) => `invoice-${year}`;

/** Next number in the gapless yearly sequence, e.g. MRT-2026-00001. */
async function nextInvoiceNumber(date: Date): Promise<string> {
  const year = shopYear(date);
  const n = await db.counters.next(counterKey(year));
  return `${site.invoicePrefix}-${year}-${String(n).padStart(5, "0")}`;
}

/** "MRT-2026-00042" → { year: "2026", seq: 42 }; null for anything else. */
function parseInvoiceNumber(invoiceNumber: string) {
  const match = /^[A-Z]+-(\d{4})-(\d+)$/.exec(invoiceNumber);
  return match ? { year: match[1], seq: Number(match[2]) } : null;
}

/**
 * Deletes an order. When it held the newest invoice number of its year, the counter is moved
 * back to the highest number still in use, so the next order reuses the freed number(s) as if
 * the deleted invoices never existed. An older number can't be reused (later invoices already
 * follow it), so it stays unused. Returns whether the number was freed.
 */
export async function deleteOrder(order: Order): Promise<{ numberFreed: boolean }> {
  await db.orders.delete(order.id);

  const parsed = parseInvoiceNumber(order.invoiceNumber);
  if (!parsed) return { numberFreed: false };

  const remaining = (await db.orders.list())
    .map((o) => parseInvoiceNumber(o.invoiceNumber))
    .filter((p) => p?.year === parsed.year)
    .map((p) => p!.seq);
  const highest = Math.max(0, ...remaining);
  if (highest > parsed.seq) return { numberFreed: false };

  // Only if no order took a newer number in the meantime.
  const numberFreed = await db.counters.rewind(counterKey(parsed.year), parsed.seq, highest);
  return { numberFreed };
}

/**
 * Prices the cart from the database (never from the client), then saves the order.
 * Returns `cart_changed` instead of saving when the customer saw stale prices or products.
 */
export async function createOrder(input: CheckoutInput, now = new Date()): Promise<CreateOrderResult> {
  // Same variant twice (e.g. two tabs) → one line.
  const quantities = new Map<string, number>();
  const shown = new Map<string, LinePrice>();
  for (const line of input.lines) {
    quantities.set(line.variantId, Math.min(MAX_QTY, (quantities.get(line.variantId) ?? 0) + line.qty));
    shown.set(line.variantId, { priceCents: line.priceCents, depositCents: line.depositCents });
  }

  const available = new Map<string, { product: Product; variant: Variant }>();
  for (const product of await db.products.list()) {
    if (product.status !== "published") continue;
    for (const variant of activeVariants(product)) available.set(variant.id, { product, variant });
  }

  const removed: string[] = [];
  const prices: Record<string, LinePrice> = {};
  for (const [variantId, seen] of shown) {
    const match = available.get(variantId);
    if (!match) removed.push(variantId);
    else {
      // A deposit added or changed since the cart was filled changes the total too.
      const { priceCents, depositCents } = match.variant;
      if (priceCents !== seen.priceCents || (depositCents ?? 0) !== (seen.depositCents ?? 0)) {
        prices[variantId] = { priceCents, depositCents };
      }
    }
  }
  if (removed.length || Object.keys(prices).length) return { kind: "cart_changed", prices, removed };

  const lines = [...quantities].map(([variantId, qty]) => ({ ...available.get(variantId)!, qty }));
  const hasAlcohol = lines.some((l) => l.product.isAlcohol);
  if (hasAlcohol && !input.ageConfirmed) return { kind: "age_required" };

  const items: OrderItem[] = lines.map(({ product, variant, qty }) => ({
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    variantLabel: variant.label,
    unitPriceCents: variant.priceCents,
    ...(variant.depositCents ? { depositCents: variant.depositCents } : {}),
    qty,
  }));
  const totals = orderTotals(items.map((i) => ({ priceCents: i.unitPriceCents, depositCents: i.depositCents, qty: i.qty })));
  const createdAt = now.toISOString();

  const order: Order = {
    id: crypto.randomUUID(),
    invoiceNumber: await nextInvoiceNumber(now),
    createdAt,
    dueDate: new Date(now.getTime() + site.paymentDueDays * DAY_MS).toISOString(),
    status: "awaiting_payment",
    customer: input.customer,
    buyerType: input.buyerType,
    ...(input.buyerType === "company" ? { company: input.company } : {}),
    items,
    totals,
    ...(hasAlcohol ? { ageConfirmedAt: createdAt } : {}),
    pickupLocation: pickup.address,
    paymentMethod: "bank_transfer",
  };

  await db.orders.put(order);
  return { kind: "created", order };
}

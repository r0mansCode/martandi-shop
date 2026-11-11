import "server-only";
import { db } from "./db";
import { activeVariants, splitVat } from "@/lib/money";
import { MAX_QTY } from "@/lib/cart-limits";
import type { CheckoutInput } from "@/lib/checkout-input";
import type { Order, OrderItem, Product, Variant } from "@/lib/types";
import { pickup, site } from "@/config/site";

export type CreateOrderResult =
  | { kind: "created"; order: Order }
  /** Some lines are gone or repriced; nothing was saved. */
  | { kind: "cart_changed"; prices: Record<string, number>; removed: string[] }
  | { kind: "age_required" };

const DAY_MS = 24 * 60 * 60 * 1000;

/** Year in shop time, so an order at 00:30 on 1 January Riga time counts towards the new year. */
function shopYear(date: Date): string {
  return new Intl.DateTimeFormat("en", { year: "numeric", timeZone: site.timeZone }).format(date);
}

/** Next number in the gapless yearly sequence, e.g. MRT-2026-00001. */
async function nextInvoiceNumber(date: Date): Promise<string> {
  const year = shopYear(date);
  const n = await db.counters.next(`invoice-${year}`);
  return `${site.invoicePrefix}-${year}-${String(n).padStart(5, "0")}`;
}

/**
 * Prices the cart from the database (never from the client), then saves the order.
 * Returns `cart_changed` instead of saving when the customer saw stale prices or products.
 */
export async function createOrder(input: CheckoutInput, now = new Date()): Promise<CreateOrderResult> {
  // Same variant twice (e.g. two tabs) → one line.
  const quantities = new Map<string, number>();
  const shownPrice = new Map<string, number>();
  for (const line of input.lines) {
    quantities.set(line.variantId, Math.min(MAX_QTY, (quantities.get(line.variantId) ?? 0) + line.qty));
    shownPrice.set(line.variantId, line.priceCents);
  }

  const available = new Map<string, { product: Product; variant: Variant }>();
  for (const product of await db.products.list()) {
    if (product.status !== "published") continue;
    for (const variant of activeVariants(product)) available.set(variant.id, { product, variant });
  }

  const removed: string[] = [];
  const prices: Record<string, number> = {};
  for (const [variantId, price] of shownPrice) {
    const match = available.get(variantId);
    if (!match) removed.push(variantId);
    else if (match.variant.priceCents !== price) prices[variantId] = match.variant.priceCents;
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
    qty,
  }));
  const grossCents = items.reduce((sum, i) => sum + i.unitPriceCents * i.qty, 0);
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
    totals: splitVat(grossCents),
    ...(hasAlcohol ? { ageConfirmedAt: createdAt } : {}),
    pickupLocation: pickup.address,
    paymentMethod: "bank_transfer",
  };

  await db.orders.put(order);
  return { kind: "created", order };
}

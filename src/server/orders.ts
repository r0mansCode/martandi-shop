import "server-only";
import { db } from "./db";
import { isVisible } from "./catalog";
import { nextInvoiceNumber, releaseInvoiceNumber, shopYear } from "./invoice-numbers";
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

/**
 * Deletes an order and frees its invoice number when it was the newest of its year
 * (see releaseInvoiceNumber). Returns whether the number was freed.
 */
export async function deleteOrder(order: Order): Promise<{ numberFreed: boolean }> {
  await db.orders.delete(order.id);
  return { numberFreed: await releaseInvoiceNumber(order.invoiceNumber) };
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
    if (!isVisible(product)) continue;
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
    invoiceNumber: await nextInvoiceNumber(shopYear(now)),
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

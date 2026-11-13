"use client";

import { useEffect, useSyncExternalStore } from "react";
import { MAX_QTY } from "./cart-limits";
import type { LinePrice } from "./checkout-input";

// Cart lives in localStorage. The display fields are a convenience snapshot;
// the server re-prices every line from the database at checkout.

export type CartLine = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  priceCents: number;
  /** Packaging deposit per unit (0% VAT); unset means none. Carts saved before deposits lack it. */
  depositCents?: number;
  image: string | null;
  isAlcohol: boolean;
  qty: number;
};

const KEY = "martandi-cart";
export { MAX_QTY };
const EMPTY: CartLine[] = [];

const listeners = new Set<() => void>();
let cachedRaw: string | null = null;
let cachedLines: CartLine[] = EMPTY;

function read(): CartLine[] {
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(KEY);
  } catch {
    return EMPTY;
  }
  if (raw === cachedRaw) return cachedLines;
  cachedRaw = raw;
  try {
    const parsed = raw ? JSON.parse(raw) : EMPTY;
    cachedLines = Array.isArray(parsed) ? parsed : EMPTY;
  } catch {
    cachedLines = EMPTY;
  }
  return cachedLines;
}

function write(lines: CartLine[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(lines));
  } catch {
    // Storage unavailable (private mode / quota): cart stays as it was.
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => e.key === KEY && listener();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(n)));

export function addToCart(line: Omit<CartLine, "qty">, qty: number) {
  const lines = read();
  const existing = lines.find((l) => l.variantId === line.variantId);
  write(
    existing
      ? lines.map((l) => (l === existing ? { ...line, qty: clamp(l.qty + qty) } : l))
      : [...lines, { ...line, qty: clamp(qty) }],
  );
}

export function setQty(variantId: string, qty: number) {
  write(read().map((l) => (l.variantId === variantId ? { ...l, qty: clamp(qty) } : l)));
}

export function removeLine(variantId: string) {
  write(read().filter((l) => l.variantId !== variantId));
}

/** Brings the cart in line with the server at checkout: new prices, unavailable lines dropped. */
export function applyServerCart(prices: Record<string, LinePrice>, removed: string[]) {
  write(
    read()
      .filter((l) => !removed.includes(l.variantId))
      .map((l) => {
        const now = prices[l.variantId];
        return now ? { ...l, priceCents: now.priceCents, depositCents: now.depositCents } : l;
      }),
  );
}

/**
 * Refreshes line prices and deposits from the server's current list, so a cart filled before a
 * change shows the total the invoice will have. Lines missing from the list are left alone: the
 * list can lag by a minute, and checkout removes truly unavailable lines anyway.
 */
async function syncCartPrices() {
  let prices: Record<string, LinePrice>;
  try {
    const res = await fetch("/api/variant-prices");
    if (!res.ok) return;
    prices = await res.json();
  } catch {
    return; // Offline or blocked: keep the snapshot; checkout re-prices anyway.
  }
  const lines = read();
  const changed = lines.some((l) => {
    const now = prices[l.variantId];
    return now && (now.priceCents !== l.priceCents || (now.depositCents ?? 0) !== (l.depositCents ?? 0));
  });
  if (changed) applyServerCart(prices, []);
}

/** Runs syncCartPrices once when a cart view mounts. */
export function useCartPriceSync() {
  useEffect(() => {
    void syncCartPrices();
  }, []);
}

export function clearCart() {
  write(EMPTY);
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((n, l) => n + l.qty, 0);
}

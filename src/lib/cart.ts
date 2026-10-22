"use client";

import { useSyncExternalStore } from "react";

// Cart lives in localStorage. The display fields are a convenience snapshot;
// the server re-prices every line from the database at checkout.

export type CartLine = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  priceCents: number;
  image: string | null;
  isAlcohol: boolean;
  qty: number;
};

const KEY = "martandi-cart";
export const MAX_QTY = 99;
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

export function clearCart() {
  write(EMPTY);
}

export function useCart(): CartLine[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function useCartCount(): number {
  return useCart().reduce((n, l) => n + l.qty, 0);
}

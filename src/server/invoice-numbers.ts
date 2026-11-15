import "server-only";
import { db } from "./db";
import { site } from "@/config/site";

// One MRT-YYYY-NNNNN sequence per year, shared by shop orders and manual invoices, so the
// accountant sees a single series. Deleted invoices count as never used (see AGENTS.md).

const counterKey = (year: string) => `invoice-${year}`;

/** Year in shop time, so an order at 00:30 on 1 January Riga time counts towards the new year. */
export function shopYear(date: Date): string {
  return new Intl.DateTimeFormat("en", { year: "numeric", timeZone: site.timeZone }).format(date);
}

/** Next number in the yearly sequence, e.g. MRT-2026-00001. */
export async function nextInvoiceNumber(year: string): Promise<string> {
  const n = await db.counters.next(counterKey(year));
  return `${site.invoicePrefix}-${year}-${String(n).padStart(5, "0")}`;
}

/** "MRT-2026-00042" → { year: "2026", seq: 42 }; null for anything else. */
export function parseInvoiceNumber(invoiceNumber: string) {
  const match = /^[A-Z]+-(\d{4})-(\d+)$/.exec(invoiceNumber);
  return match ? { year: match[1], seq: Number(match[2]) } : null;
}

/**
 * Call after deleting an order or manual invoice. When it held the newest number of its year,
 * the counter moves back to the highest number still in use by either kind, so the next one
 * reuses the freed number(s). An older number can't be reused (later invoices already follow
 * it), so it stays unused. Returns whether the number was freed.
 */
export async function releaseInvoiceNumber(invoiceNumber: string): Promise<boolean> {
  const parsed = parseInvoiceNumber(invoiceNumber);
  if (!parsed) return false;

  const [orders, invoices] = await Promise.all([db.orders.list(), db.invoices.list()]);
  const remaining = [...orders, ...invoices]
    .map((x) => parseInvoiceNumber(x.invoiceNumber))
    .filter((p) => p?.year === parsed.year)
    .map((p) => p!.seq);
  const highest = Math.max(0, ...remaining);
  if (highest > parsed.seq) return false;

  // Only if nothing took a newer number in the meantime.
  return db.counters.rewind(counterKey(parsed.year), parsed.seq, highest);
}

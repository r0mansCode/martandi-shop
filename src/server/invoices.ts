import "server-only";
import type { z } from "zod";
import { db } from "./db";
import { nextInvoiceNumber, parseInvoiceNumber, releaseInvoiceNumber } from "./invoice-numbers";
import { euroToCents } from "@/lib/catalog-input";
import { customerSnapshot, INVOICE_VAT_RATES, parseQty, type invoiceInput } from "@/lib/invoice-input";
import { invoiceTotals } from "@/lib/money";
import type { Invoice, InvoiceLine, InvoiceStatus } from "@/lib/types";

// Manual invoices: created and edited by the admin, numbered in the shared MRT sequence.
// Validation of the raw form is in lib/invoice-input; this applies the business rules.

type InvoiceInput = z.output<typeof invoiceInput>;

export type SaveInvoiceResult =
  | { kind: "saved"; invoice: Invoice }
  /** Field path → message, like FormState.errors. */
  | { kind: "invalid"; message: string; errors: Record<string, string> };

const optional = (value: string) => value || undefined;

/**
 * Creates (input.id "") or updates a manual invoice. The customer is copied into the invoice on
 * save: saving again picks up their latest details, while later customer edits alone don't
 * change an issued invoice.
 * The number is assigned once, from the issue date's year, and never changes.
 */
export async function saveInvoice(input: InvoiceInput, now = new Date()): Promise<SaveInvoiceResult> {
  const existing = input.id ? await db.invoices.getById(input.id) : null;
  if (input.id && !existing) return { kind: "invalid", message: "Rēķins vairs neeksistē.", errors: {} };

  const customer = await db.invoiceCustomers.getById(input.customerId);
  if (!customer) {
    return { kind: "invalid", message: "Pārbaudiet iezīmētos laukus.", errors: { customerId: "Klients vairs neeksistē" } };
  }

  // The number's year must stay the issue year, or the yearly sequences get mixed up.
  const numberYear = existing && parseInvoiceNumber(existing.invoiceNumber)?.year;
  if (numberYear && input.issueDate.slice(0, 4) !== numberYear) {
    return {
      kind: "invalid",
      message: "Pārbaudiet iezīmētos laukus.",
      errors: { issueDate: `Rēķina ${existing.invoiceNumber} datumam jābūt ${numberYear}. gadā` },
    };
  }

  const vatRate = INVOICE_VAT_RATES[input.vat];
  const lines: InvoiceLine[] = input.lines.map((l) => ({
    ...(l.variantId ? { productId: l.productId, variantId: l.variantId } : {}),
    name: l.name,
    unit: l.unit,
    qty: parseQty(l.qty),
    unitNetCents: euroToCents(l.price),
    ...(l.hasDeposit ? { depositCents: euroToCents(l.deposit) } : {}),
    ...(input.extraBeforeOn && l.extraBefore ? { extraBefore: l.extraBefore } : {}),
    ...(input.extraAfterOn && l.extraAfter ? { extraAfter: l.extraAfter } : {}),
  }));

  const stamp = now.toISOString();
  const invoice: Invoice = {
    id: existing?.id ?? crypto.randomUUID(),
    invoiceNumber: existing?.invoiceNumber ?? (await nextInvoiceNumber(input.issueDate.slice(0, 4))),
    issueDate: input.issueDate,
    dueDate: input.dueDate,
    hideDueDate: input.hideDueDate,
    orderNumber: optional(input.orderNumber),
    status: input.status,
    paidAt: input.status === "paid" ? (existing?.paidAt ?? stamp) : undefined,
    vatRate,
    customerId: customer.id,
    customer: customerSnapshot(customer),
    lines,
    totals: invoiceTotals(lines, vatRate),
    includeSignatures: input.includeSignatures,
    extraBeforeHeader: input.extraBeforeOn ? input.extraBeforeHeader || "—" : undefined,
    extraAfterHeader: input.extraAfterOn ? input.extraAfterHeader || "—" : undefined,
    createdAt: existing?.createdAt ?? stamp,
    updatedAt: stamp,
  };

  await db.invoices.put(invoice);
  return { kind: "saved", invoice };
}

export async function setInvoiceStatus(invoice: Invoice, status: InvoiceStatus, now = new Date()) {
  await db.invoices.put({
    ...invoice,
    status,
    paidAt: status === "paid" ? (invoice.paidAt ?? now.toISOString()) : undefined,
    updatedAt: now.toISOString(),
  });
}

/** Deletes a manual invoice and frees its number when it was the newest of its year. */
export async function deleteInvoice(invoice: Invoice): Promise<{ numberFreed: boolean }> {
  await db.invoices.delete(invoice.id);
  return { numberFreed: await releaseInvoiceNumber(invoice.invoiceNumber) };
}

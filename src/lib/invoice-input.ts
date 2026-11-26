import { z } from "zod";
import { centsToEuro, euroToCents } from "./catalog-input";
import { site } from "@/config/site";
import type { Invoice, InvoiceCustomer, InvoiceCustomerSnapshot, InvoiceLogo } from "./types";

// Admin form input for manual invoices and their customer directory. Shared by the client
// forms (shape) and the Server Actions (validation); the server is the only place it's trusted.

const EURO = /^\d{1,6}(?:[.,]\d{1,2})?$/;
const QTY = /^\d{1,5}(?:[.,]\d{1,3})?$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** VAT rates a manual invoice can use, as the form's select values. */
export const INVOICE_VAT_RATES = { "21": site.vatRate, "0": 0 } as const;
export type InvoiceVatKey = keyof typeof INVOICE_VAT_RATES;

export const DEFAULT_UNIT = "gb";

/** Logo choices for the PDF, in switcher order; the first is the default. */
export const INVOICE_LOGOS: Record<InvoiceLogo, string> = {
  // Key order is the switch order in the invoice form.
  martandi: "Martandi",
  tavidzerieni: "TaviDzērieni.lv",
};
const LOGO_KEYS = Object.keys(INVOICE_LOGOS) as [InvoiceLogo, ...InvoiceLogo[]];

/** "1,5" → 1.5 */
export const parseQty = (value: string) => Number(value.trim().replace(",", "."));

const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label} ir obligāts`).max(max, `${label} ir pārāk garš`);
const optional = (max: number) => z.string().trim().max(max, "Pārāk garš teksts");
const day = (label: string) =>
  z
    .string()
    .regex(DAY, `${label} formātā DD.MM.GGGG`)
    .refine((v) => !Number.isNaN(Date.parse(v)), `Nederīgs datums: ${label.toLowerCase()}`);

// ---- Customers ----

export const customerInput = z.object({
  /** "" when creating. */
  id: z.string(),
  type: z.enum(["company", "private"]),
  name: text("Nosaukums", 160),
  personalCode: optional(20),
  regNo: optional(30),
  vatNo: optional(30),
  address: optional(300),
  bank: optional(80),
  swift: optional(20),
  iban: optional(40),
  email: z.union([z.literal(""), z.email("Nederīga e-pasta adrese")]),
  phone: optional(40),
  contactPerson: optional(120),
});

export type CustomerFormValues = z.input<typeof customerInput>;

export const emptyCustomer: CustomerFormValues = {
  id: "",
  type: "company",
  name: "",
  personalCode: "",
  regNo: "",
  vatNo: "",
  address: "",
  bank: "",
  swift: "",
  iban: "",
  email: "",
  phone: "",
  contactPerson: "",
};

/** The customer without its timestamps: the copy stored on an invoice, and the form values. */
export function customerSnapshot(c: InvoiceCustomer): InvoiceCustomerSnapshot {
  const rest: Partial<InvoiceCustomer> = { ...c };
  delete rest.createdAt;
  delete rest.updatedAt;
  return rest as InvoiceCustomerSnapshot;
}

export const customerToForm = (c: InvoiceCustomer): CustomerFormValues => customerSnapshot(c);

export const CUSTOMER_TYPE_LABEL: Record<InvoiceCustomer["type"], string> = {
  company: "Uzņēmums",
  private: "Privātpersona",
};

// ---- Invoices ----

export const invoiceLineInput = z
  .object({
    /** "" = free-text line. */
    productId: z.string(),
    variantId: z.string(),
    name: text("Nosaukums", 200),
    unit: text("Mērv.", 12),
    qty: z
      .string()
      .trim()
      .regex(QTY, "Daudzums, piem. 2 vai 1,5")
      .refine((v) => parseQty(v) > 0, "Daudzumam jābūt lielākam par 0"),
    /** Unit price without VAT, euro. */
    price: z.string().trim().regex(EURO, "Cena formātā 12,99"),
    hasDeposit: z.boolean(),
    deposit: z.string().trim(),
  })
  .superRefine((v, ctx) => {
    if (!v.hasDeposit) return;
    if (!EURO.test(v.deposit)) ctx.addIssue({ code: "custom", path: ["deposit"], message: "Depozīts formātā 0,10" });
    else if (euroToCents(v.deposit) <= 0)
      ctx.addIssue({ code: "custom", path: ["deposit"], message: "Depozītam jābūt lielākam par 0" });
  });

export const invoiceInput = z
  .object({
    /** "" when creating. */
    id: z.string(),
    customerId: z.string().min(1, "Izvēlieties klientu"),
    issueDate: day("Izrakstīšanas datums"),
    dueDate: day("Apmaksas termiņš"),
    hideDueDate: z.boolean(),
    logo: z.enum(LOGO_KEYS),
    status: z.enum(["unpaid", "paid"]),
    vat: z.enum(Object.keys(INVOICE_VAT_RATES) as [InvoiceVatKey, ...InvoiceVatKey[]]),
    includeSignatures: z.boolean(),
    lines: z.array(invoiceLineInput).min(1, "Vajag vismaz vienu pozīciju").max(200, "Pārāk daudz pozīciju"),
  })
  .refine((v) => v.dueDate >= v.issueDate, {
    message: "Termiņš nevar būt pirms izrakstīšanas datuma",
    path: ["dueDate"],
  });

/** What the invoice form sends: every field as the user typed it. */
export type InvoiceFormValues = z.input<typeof invoiceInput>;
export type InvoiceLineFormValues = InvoiceFormValues["lines"][number];

/** "2026-11-15" + 14 → "2026-11-29" (calendar days, no time zone involved). */
export function addDays(dayKey: string, days: number): string {
  const d = new Date(`${dayKey}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export const emptyLine: InvoiceLineFormValues = {
  productId: "",
  variantId: "",
  name: "",
  unit: DEFAULT_UNIT,
  qty: "1",
  price: "",
  hasDeposit: false,
  deposit: centsToEuro(site.defaultDepositCents),
};

/** A blank invoice issued on `today` (a Riga day key), due after the usual number of days. */
export function emptyInvoice(today: string): InvoiceFormValues {
  return {
    id: "",
    customerId: "",
    issueDate: today,
    dueDate: addDays(today, site.paymentDueDays),
    hideDueDate: false,
    // New invoices default to Martandi; old ones without a stored logo keep TaviDzērieni (invoiceToForm, PDF).
    logo: "martandi",
    status: "unpaid",
    vat: "21",
    includeSignatures: false,
    lines: [emptyLine],
  };
}

const vatKey = (rate: number): InvoiceVatKey => (rate === 0 ? "0" : "21");

/** A saved invoice as form values. */
export function invoiceToForm(invoice: Invoice): InvoiceFormValues {
  return {
    id: invoice.id,
    customerId: invoice.customerId,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    hideDueDate: invoice.hideDueDate,
    logo: invoice.logo ?? "tavidzerieni",
    status: invoice.status,
    vat: vatKey(invoice.vatRate),
    includeSignatures: invoice.includeSignatures,
    lines: invoice.lines.map((l) => ({
      productId: l.productId ?? "",
      variantId: l.variantId ?? "",
      name: l.name,
      unit: l.unit,
      qty: String(l.qty).replace(".", ","),
      price: centsToEuro(l.unitNetCents),
      hasDeposit: !!l.depositCents,
      deposit: centsToEuro(l.depositCents ?? site.defaultDepositCents),
    })),
  };
}

/** A copy of `invoice` as a new one: same customer, settings and lines, today's dates, unpaid. */
export function invoiceAsTemplate(invoice: Invoice, today: string): InvoiceFormValues {
  const blank = emptyInvoice(today);
  return {
    ...invoiceToForm(invoice),
    id: "",
    issueDate: blank.issueDate,
    dueDate: blank.dueDate,
    status: "unpaid",
  };
}

/** Line values for the totals helpers; lines with unparsable fields count as zero. */
export function formLinesToAmounts(lines: InvoiceLineFormValues[]) {
  return lines.map((l) => ({
    qty: QTY.test(l.qty.trim()) ? parseQty(l.qty) : 0,
    unitNetCents: EURO.test(l.price.trim()) ? euroToCents(l.price) : 0,
    depositCents: l.hasDeposit && EURO.test(l.deposit.trim()) ? euroToCents(l.deposit) : 0,
  }));
}

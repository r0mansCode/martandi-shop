"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { deleteInvoice, saveInvoice as save, setInvoiceStatus } from "@/server/invoices";
import { errorState, type FormState } from "@/lib/catalog-input";
import { customerInput, invoiceInput, type CustomerFormValues, type InvoiceFormValues } from "@/lib/invoice-input";
import type { InvoiceCustomer, InvoiceStatus } from "@/lib/types";
import { isInvoiceLogo, MAX_LOGO_BYTES } from "@/lib/invoice-logos";
import { resetInvoiceLogo, saveInvoiceLogo, sniffLogoType } from "@/server/invoice-logos";

// Manual invoices and their customer directory. Each action re-checks the admin session.
// Nothing here touches the storefront, so only admin pages are revalidated.

const LIST = "/admin/rekini";
const CUSTOMERS = "/admin/rekini/klienti";
const invoicePath = (id: string) => `${LIST}/${id}`;

const fail = (message: string, errors: Record<string, string> = {}): FormState => ({ ok: false, message, errors });

function parseJson(formData: FormData, key: string): unknown {
  try {
    return JSON.parse(String(formData.get(key)));
  } catch {
    return undefined;
  }
}

/** Where to go after an action: `returnTo` when it is an invoices URL, else the fallback. */
function back(returnTo: string | undefined, fallback: string, message: string) {
  const target = typeof returnTo === "string" && returnTo.startsWith(LIST) ? returnTo : fallback;
  const url = new URL(target, "http://local");
  url.searchParams.set("zina", message);
  return `${url.pathname}${url.search}`;
}

export async function saveInvoice(
  _prev: FormState<InvoiceFormValues>,
  formData: FormData,
): Promise<FormState<InvoiceFormValues>> {
  await requireAdmin();

  const raw = parseJson(formData, "invoice");
  if (raw === undefined) return fail("Neizdevās nolasīt formu. Pārlādējiet lapu un mēģiniet vēlreiz.");
  const parsed = invoiceInput.safeParse(raw);
  if (!parsed.success) return errorState(parsed.error);

  const result = await save(parsed.data);
  if (result.kind === "invalid") return fail(result.message, result.errors);

  revalidatePath("/admin", "layout");
  if (!parsed.data.id) redirect(`${invoicePath(result.invoice.id)}?zina=izveidots`);
  return { ok: true, message: "Saglabāts.", errors: {} };
}

export async function markInvoice(id: string, status: InvoiceStatus, returnTo?: string) {
  await requireAdmin();
  const invoice = await db.invoices.getById(id);
  if (!invoice) redirect(LIST);

  await setInvoiceStatus(invoice, status === "paid" ? "paid" : "unpaid");
  revalidatePath("/admin", "layout");
  redirect(back(returnTo, invoicePath(id), status === "paid" ? "apmaksats" : "neapmaksats"));
}

export async function removeInvoice(id: string, returnTo?: string) {
  await requireAdmin();
  const invoice = await db.invoices.getById(id);
  if (!invoice) redirect(LIST);

  const { numberFreed } = await deleteInvoice(invoice);
  console.info(`[admin] Invoice ${invoice.invoiceNumber} deleted${numberFreed ? ", number freed" : ""}`);

  revalidatePath("/admin", "layout");
  // The invoice's own page no longer exists.
  const target = typeof returnTo === "string" && returnTo.startsWith(invoicePath(id)) ? LIST : returnTo;
  redirect(back(target, LIST, numberFreed ? "dzests-numurs-brivs" : "dzests"));
}

export async function saveCustomer(
  _prev: FormState<CustomerFormValues>,
  formData: FormData,
): Promise<FormState<CustomerFormValues>> {
  await requireAdmin();

  const raw = parseJson(formData, "customer");
  if (raw === undefined) return fail("Neizdevās nolasīt formu. Pārlādējiet lapu un mēģiniet vēlreiz.");
  const parsed = customerInput.safeParse(raw);
  if (!parsed.success) return errorState(parsed.error);
  const { id, ...input } = parsed.data;

  const existing = id ? await db.invoiceCustomers.getById(id) : null;
  if (id && !existing) return fail("Klients vairs neeksistē.");

  const now = new Date().toISOString();
  // Fields of the other buyer type are cleared, so a switched type leaves nothing stale behind.
  const customer: InvoiceCustomer = {
    ...input,
    ...(input.type === "private" ? { regNo: "", vatNo: "", swift: "", contactPerson: "" } : { personalCode: "" }),
    id: existing?.id ?? crypto.randomUUID(),
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
  await db.invoiceCustomers.put(customer);

  revalidatePath("/admin", "layout");
  if (!existing) redirect(`${CUSTOMERS}?zina=klients-izveidots`);
  return { ok: true, message: "Saglabāts.", errors: {} };
}

/** Issued invoices keep their own copy of the customer, so deleting one is always allowed. */
export async function removeCustomer(id: string) {
  await requireAdmin();
  await db.invoiceCustomers.delete(id);
  revalidatePath("/admin", "layout");
  redirect(`${CUSTOMERS}?zina=klients-dzests`);
}

// ---- Logos ----

const LOGOS = "/admin/rekini/logotipi";

/** Replaces one invoice logo with an uploaded PNG/JPEG. `logo` comes from a bound form, so it is re-checked. */
export async function uploadInvoiceLogo(logo: string, formData: FormData) {
  await requireAdmin();
  if (!isInvoiceLogo(logo)) redirect(LOGOS);

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) redirect(`${LOGOS}?zina=logo-nav-faila`);
  if (file.size > MAX_LOGO_BYTES) redirect(`${LOGOS}?zina=logo-par-lielu`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const type = sniffLogoType(bytes);
  if (!type) redirect(`${LOGOS}?zina=logo-tips`);

  await saveInvoiceLogo(logo, bytes, type);
  revalidatePath(LOGOS);
  redirect(`${LOGOS}?zina=logo-saglabats`);
}

export async function resetLogo(logo: string) {
  await requireAdmin();
  if (!isInvoiceLogo(logo)) redirect(LOGOS);
  await resetInvoiceLogo(logo);
  revalidatePath(LOGOS);
  redirect(`${LOGOS}?zina=logo-atjaunots`);
}

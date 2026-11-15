import "server-only";
import { db } from "@/server/db";
import type { InvoiceCustomer } from "@/lib/types";
import type { CustomerOption, VariantOption } from "./InvoiceForm";

/** One line about a customer for pickers and lists: Reg. Nr. or personal code, then address. */
export function customerDetails(c: Pick<InvoiceCustomer, "type" | "regNo" | "vatNo" | "personalCode" | "address">) {
  const ids = c.type === "company" ? [c.regNo && `Reģ. Nr. ${c.regNo}`, c.vatNo && `PVN Nr. ${c.vatNo}`] : [c.personalCode && `p. k. ${c.personalCode}`];
  return [...ids, c.address].filter(Boolean).join(" · ");
}

/** Pickers for the invoice form: every customer, and every catalog variant (drafts too). */
export async function invoiceFormData(): Promise<{ customers: CustomerOption[]; variants: VariantOption[] }> {
  const [customers, products] = await Promise.all([db.invoiceCustomers.list(), db.products.list()]);
  return {
    customers: customers.map((c) => ({ id: c.id, type: c.type, name: c.name, details: customerDetails(c) })),
    variants: products
      .toSorted((x, y) => x.name.localeCompare(y.name, "lv"))
      .flatMap((p) =>
        p.variants.map((v) => ({
          productId: p.id,
          variantId: v.id,
          name: `${p.name}, ${v.label}`,
          priceCents: v.priceCents,
          depositCents: v.depositCents,
        })),
      ),
  };
}

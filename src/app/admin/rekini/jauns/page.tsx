import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { emptyInvoice, invoiceAsTemplate } from "@/lib/invoice-input";
import { toDayKey } from "@/lib/format";
import { InvoiceForm } from "../InvoiceForm";
import { invoiceFormData } from "../form-data";
import a from "../../admin.module.scss";

export const metadata: Metadata = { title: "Jauns rēķins" };

/** New manual invoice; `?sagatave=<id>` starts from a copy of that invoice. */
export default async function NewInvoice({ searchParams }: PageProps<"/admin/rekini/jauns">) {
  await requireAdmin();
  const { sagatave } = await searchParams;
  const [template, data] = await Promise.all([
    typeof sagatave === "string" ? db.invoices.getById(sagatave) : null,
    invoiceFormData(),
  ]);
  const today = toDayKey(new Date());
  const initial = template ? invoiceAsTemplate(template, today) : emptyInvoice(today);

  return (
    <>
      <Link href="/admin/rekini" className={a.back}>
        ← Visi rēķini
      </Link>
      <div className={a.pageHead}>
        <h1 className={a.title}>Jauns rēķins</h1>
        {template && <span className={a.muted}>Sagatave: {template.invoiceNumber}</span>}
      </div>
      <InvoiceForm initial={initial} customers={data.customers} variants={data.variants} />
    </>
  );
}

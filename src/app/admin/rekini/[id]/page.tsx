import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { invoiceToForm } from "@/lib/invoice-input";
import { INVOICE_MESSAGES } from "@/lib/invoice-messages";
import { formatDateTime } from "@/lib/format";
import { markInvoice, removeInvoice } from "../actions";
import { InvoiceForm } from "../InvoiceForm";
import { invoiceFormData } from "../form-data";
import { invoiceDeleteConfirm, isInvoiceOverdue, StatusBadge } from "../status";
import { ConfirmButton } from "../../ConfirmButton";
import { Breadcrumbs } from "../../Breadcrumbs";
import a from "../../admin.module.scss";
import s from "../invoices.module.scss";

export const metadata: Metadata = { title: "Rēķins" };

export default async function EditInvoice({ params, searchParams }: PageProps<"/admin/rekini/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [invoice, data] = await Promise.all([db.invoices.getById(id), invoiceFormData()]);
  if (!invoice) notFound();

  const zina = (await searchParams).zina;
  const message = typeof zina === "string" ? INVOICE_MESSAGES[zina] : undefined;
  // Actions return here. Bound explicitly: a form action's next argument is its FormData.
  const here = `/admin/rekini/${invoice.id}`;
  const pdf = `/admin/rekini/${invoice.id}/pdf`;
  const nextStatus = invoice.status === "paid" ? "unpaid" : "paid";

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Rēķini", href: "/admin/rekini" }, { label: invoice.invoiceNumber }]}
      />
      <div className={a.head}>
        <h1 className={a.title}>{invoice.invoiceNumber}</h1>
        <StatusBadge status={invoice.status} />
        {isInvoiceOverdue(invoice) && <span className={s.overdue}>Apmaksas termiņš nokavēts</span>}
        {invoice.paidAt && <span className={a.muted}>Apmaksāts {formatDateTime(invoice.paidAt)}</span>}
      </div>

      {message && (
        <p className={message.error ? `${a.message} ${a.messageError}` : a.message} role="status">
          {message.text}
        </p>
      )}

      <div className={`${a.buttonRow} ${s.wide} ${s.actionsBar}`}>
        <form action={markInvoice.bind(null, invoice.id, nextStatus, here)}>
          <button type="submit" className={a.button}>
            {nextStatus === "paid" ? "Atzīmēt kā apmaksātu" : "Atzīmēt kā neapmaksātu"}
          </button>
        </form>
        <a href={pdf} target="_blank" rel="noopener" className={a.buttonSecondary}>
          Atvērt PDF
        </a>
        <a href={`${pdf}?lejupieladet=1`} className={a.buttonSecondary}>
          Lejupielādēt PDF
        </a>
        <Link href={`/admin/rekini/jauns?sagatave=${invoice.id}`} className={a.buttonSecondary}>
          Izmantot kā sagatavi
        </Link>
        <form action={removeInvoice.bind(null, invoice.id, here)} className={a.pushRight}>
          <ConfirmButton confirm={invoiceDeleteConfirm(invoice.invoiceNumber)} className={`${a.buttonSecondary} ${a.danger}`}>
            Dzēst rēķinu
          </ConfirmButton>
        </form>
      </div>

      {/* Keyed by status: after the buttons above change it, the form must not save the old one back. */}
      <InvoiceForm
        key={invoice.status}
        heading={<h2 className={s.formTitle}>Labot rēķinu · saglabātās izmaiņas redzamas PDF uzreiz</h2>}
        initial={invoiceToForm(invoice)}
        customers={data.customers}
        variants={data.variants}
      />
    </>
  );
}

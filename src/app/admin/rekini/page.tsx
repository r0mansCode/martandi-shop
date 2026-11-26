import type { Metadata } from "next";
import { Fragment } from "react";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { formatPrice } from "@/lib/money";
import { formatDate, normalizeSearch } from "@/lib/format";
import { INVOICE_MESSAGES } from "@/lib/invoice-messages";
import type { Invoice } from "@/lib/types";
import { site } from "@/config/site";
import { DownloadIcon } from "@/components/icons";
import { markInvoice } from "./actions";
import { InvoiceTabs } from "./Tabs";
import { INVOICE_STATUS_LABEL, isInvoiceOverdue, StatusBadge } from "./status";
import { Breadcrumbs } from "../Breadcrumbs";
import a from "../admin.module.scss";
import s from "./invoices.module.scss";

export const metadata: Metadata = { title: "Rēķini" };

const DAY = /^\d{4}-\d{2}-\d{2}$/;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

const monthFormat = new Intl.DateTimeFormat(site.locale, { month: "long", year: "numeric", timeZone: "UTC" });
/** "2026-11-15" → "novembris 2026" */
const monthLabel = (day: string) => monthFormat.format(new Date(`${day.slice(0, 7)}-01T00:00:00Z`));

// Manual invoices (rēķinu ģenerators), as in the ohmycrisp admin: a filterable list with
// inline paid toggle and PDF links; each row opens the invoice editor.
export default async function AdminInvoices({ searchParams }: PageProps<"/admin/rekini">) {
  await requireAdmin();
  const params = await searchParams;
  const [invoices, customers] = await Promise.all([db.invoices.list(), db.invoiceCustomers.list()]);

  const q = one(params.q);
  const status = one(params.statuss);
  const customerId = one(params.klients);
  const from = DAY.test(one(params.no)) ? one(params.no) : "";
  const to = DAY.test(one(params.lidz)) ? one(params.lidz) : "";

  const needle = normalizeSearch(q.trim());
  const shown = invoices.filter(
    (inv) =>
      (!status || inv.status === status) &&
      (!customerId || inv.customerId === customerId) &&
      (!from || inv.issueDate >= from) &&
      (!to || inv.issueDate <= to) &&
      (!needle || normalizeSearch(`${inv.invoiceNumber} ${inv.customer.name} ${inv.orderNumber ?? ""}`).includes(needle)),
  );
  const shownTotal = shown.reduce((sum, inv) => sum + inv.totals.grossCents, 0);

  // Actions come back to this exact view (filters kept).
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries({ q, statuss: status, klients: customerId, no: from, lidz: to })) {
    if (value) query.set(key, value);
  }
  const returnTo = `/admin/rekini${query.size ? `?${query}` : ""}`;
  const message = INVOICE_MESSAGES[one(params.zina)];

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Rēķini" }]}
      />
      <div className={a.pageHead}>
        <h1 className={a.title}>Rēķini</h1>
        <Link href="/admin/rekini/jauns" className={a.button}>
          + Jauns rēķins
        </Link>
      </div>
      <InvoiceTabs active="invoices" />

      {message && (
        <p className={message.error ? `${a.message} ${a.messageError}` : a.message} role="status">
          {message.text}
        </p>
      )}

      <form className={a.filters}>
        <input type="search" name="q" defaultValue={q} placeholder="Meklēt pēc numura vai klienta" />
        <select name="statuss" defaultValue={status} aria-label="Statuss">
          <option value="">Visi statusi</option>
          {Object.entries(INVOICE_STATUS_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <select name="klients" defaultValue={customerId} aria-label="Klients">
          <option value="">Visi klienti</option>
          {customers.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input type="date" name="no" defaultValue={from} aria-label="No datuma" />
        <input type="date" name="lidz" defaultValue={to} aria-label="Līdz datumam" />
        <button type="submit" className={a.buttonSecondary}>
          Filtrēt
        </button>
        {query.size > 0 && (
          <Link href="/admin/rekini" className={a.linkButton}>
            Notīrīt
          </Link>
        )}
        <span className={`${a.muted} ${a.count}`}>
          {shown.length} no {invoices.length} · {formatPrice(shownTotal)}
        </span>
      </form>

      <div className={a.tableWrap}>
        <table className={`${a.table} ${a.clickable}`}>
          <thead>
            <tr>
              <th>Numurs</th>
              <th>Datums</th>
              <th>Klients</th>
              <th className={a.right}>Summa</th>
              <th>Statuss</th>
              <th>Darbības</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((inv, i) => (
              <Fragment key={inv.id}>
                {(i === 0 || shown[i - 1].issueDate.slice(0, 7) !== inv.issueDate.slice(0, 7)) && (
                  <tr className={s.month}>
                    <td colSpan={6}>{monthLabel(inv.issueDate)}</td>
                  </tr>
                )}
                <InvoiceRow invoice={inv} returnTo={returnTo} />
              </Fragment>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={6} className={a.empty}>
                  {invoices.length ? "Neviens rēķins neatbilst filtram." : "Rēķinu vēl nav."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function InvoiceRow({ invoice, returnTo }: { invoice: Invoice; returnTo: string }) {
  const pdf = `/admin/rekini/${invoice.id}/pdf`;
  const next = invoice.status === "paid" ? "unpaid" : "paid";
  return (
    <tr>
      <td>
        <Link href={`/admin/rekini/${invoice.id}`} className={`${a.rowLink} ${s.number}`}>
          {invoice.invoiceNumber}
        </Link>
      </td>
      <td className={s.nowrap}>
        {formatDate(invoice.issueDate)}
        <br />
        <span className={isInvoiceOverdue(invoice) ? s.overdue : a.muted}>Termiņš {formatDate(invoice.dueDate)}</span>
      </td>
      <td>{invoice.customer.name}</td>
      <td className={a.right}>{formatPrice(invoice.totals.grossCents)}</td>
      <td>
        <StatusBadge status={invoice.status} />
      </td>
      <td>
        <div className={`${s.rowActions} ${a.aboveRow}`}>
          <form action={markInvoice.bind(null, invoice.id, next, returnTo)}>
            <button type="submit" className={a.smallButton}>
              {next === "paid" ? "Atzīmēt kā apmaksātu" : "Atzīmēt kā neapmaksātu"}
            </button>
          </form>
          <a href={pdf} target="_blank" rel="noopener" className={a.smallButton}>
            PDF
          </a>
          <a href={`${pdf}?lejupieladet=1`} className={a.smallButton} aria-label="Lejupielādēt PDF" title="Lejupielādēt PDF">
            <DownloadIcon width={16} height={16} />
          </a>
          <Link href={`/admin/rekini/jauns?sagatave=${invoice.id}`} className={a.smallButton}>
            Izmantot kā sagatavi
          </Link>
        </div>
      </td>
    </tr>
  );
}

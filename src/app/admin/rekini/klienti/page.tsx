import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { CUSTOMER_TYPE_LABEL } from "@/lib/invoice-input";
import { INVOICE_MESSAGES } from "@/lib/invoice-messages";
import { InvoiceTabs } from "../Tabs";
import { Breadcrumbs } from "../../Breadcrumbs";
import a from "../../admin.module.scss";

export const metadata: Metadata = { title: "Rēķinu klienti" };

export default async function InvoiceCustomers({ searchParams }: PageProps<"/admin/rekini/klienti">) {
  await requireAdmin();
  const [customers, invoices] = await Promise.all([db.invoiceCustomers.list(), db.invoices.list()]);
  const zina = (await searchParams).zina;
  const message = typeof zina === "string" ? INVOICE_MESSAGES[zina] : undefined;

  const invoiceCount = new Map<string, number>();
  for (const inv of invoices) invoiceCount.set(inv.customerId, (invoiceCount.get(inv.customerId) ?? 0) + 1);

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Rēķini", href: "/admin/rekini" }, { label: "Klienti" }]}
      />
      <div className={a.pageHead}>
        <h1 className={a.title}>Rēķini</h1>
        <Link href="/admin/rekini/klienti/jauns" className={a.button}>
          + Jauns klients
        </Link>
      </div>
      <InvoiceTabs active="customers" />

      {message && (
        <p className={message.error ? `${a.message} ${a.messageError}` : a.message} role="status">
          {message.text}
        </p>
      )}

      <div className={a.tableWrap}>
        <table className={`${a.table} ${a.clickable}`}>
          <thead>
            <tr>
              <th>Nosaukums</th>
              <th>Veids</th>
              <th>Reģ. Nr. / pers. kods</th>
              <th>PVN Nr.</th>
              <th>Kontakti</th>
              <th className={a.right}>Rēķini</th>
            </tr>
          </thead>
          <tbody>
            {customers.map((c) => (
              <tr key={c.id}>
                <td>
                  <Link href={`/admin/rekini/klienti/${c.id}`} className={a.rowLink}>
                    {c.name}
                  </Link>
                </td>
                <td>{CUSTOMER_TYPE_LABEL[c.type]}</td>
                <td>{(c.type === "company" ? c.regNo : c.personalCode) || "—"}</td>
                <td>{c.vatNo || "—"}</td>
                <td>
                  {c.email || "—"}
                  {c.phone && (
                    <>
                      <br />
                      <span className={a.muted}>{c.phone}</span>
                    </>
                  )}
                </td>
                <td className={a.right}>{invoiceCount.get(c.id) ?? 0}</td>
              </tr>
            ))}
            {customers.length === 0 && (
              <tr>
                <td colSpan={6} className={a.empty}>
                  Klientu vēl nav. Pievienojiet pirmo, lai varētu izrakstīt rēķinu.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

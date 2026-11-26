import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { customerToForm } from "@/lib/invoice-input";
import { removeCustomer } from "../../actions";
import { CustomerForm } from "../CustomerForm";
import { ConfirmButton } from "../../../ConfirmButton";
import { Breadcrumbs } from "../../../Breadcrumbs";
import a from "../../../admin.module.scss";

export const metadata: Metadata = { title: "Klients" };

export default async function EditInvoiceCustomer({ params }: PageProps<"/admin/rekini/klienti/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [customer, invoices] = await Promise.all([db.invoiceCustomers.getById(id), db.invoices.list()]);
  if (!customer) notFound();
  const count = invoices.filter((inv) => inv.customerId === id).length;

  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Rēķini", href: "/admin/rekini" },
          { label: "Klienti", href: "/admin/rekini/klienti" },
          { label: customer.name },
        ]}
      />
      <div className={a.pageHead}>
        <h1 className={a.title}>{customer.name}</h1>
        {count > 0 && (
          <Link href={`/admin/rekini?klients=${customer.id}`} className={a.muted}>
            Rēķini: {count} →
          </Link>
        )}
      </div>
      <p className={a.hint}>Izmaiņas parādās rēķinos, kurus saglabā pēc tam; jau izrakstītie rēķini nemainās.</p>
      <CustomerForm initial={customerToForm(customer)} />
      <form action={removeCustomer.bind(null, customer.id)} className={a.buttonRow}>
        <ConfirmButton
          confirm={`Dzēst klientu „${customer.name}”? Jau izrakstītajos rēķinos viņa dati saglabājas.`}
          className={`${a.buttonSecondary} ${a.danger}`}
        >
          Dzēst klientu
        </ConfirmButton>
      </form>
    </>
  );
}

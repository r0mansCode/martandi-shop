import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { emptyCustomer } from "@/lib/invoice-input";
import { CustomerForm } from "../CustomerForm";
import { Breadcrumbs } from "../../../Breadcrumbs";
import a from "../../../admin.module.scss";

export const metadata: Metadata = { title: "Jauns klients" };

export default async function NewInvoiceCustomer() {
  await requireAdmin();
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Rēķini", href: "/admin/rekini" },
          { label: "Klienti", href: "/admin/rekini/klienti" },
          { label: "Jauns klients" },
        ]}
      />
      <div className={a.pageHead}>
        <h1 className={a.title}>Jauns klients</h1>
      </div>
      <CustomerForm initial={emptyCustomer} />
    </>
  );
}

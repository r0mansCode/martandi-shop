import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { emptyCustomer } from "@/lib/invoice-input";
import { CustomerForm } from "../CustomerForm";
import a from "../../../admin.module.scss";

export const metadata: Metadata = { title: "Jauns klients" };

export default async function NewInvoiceCustomer() {
  await requireAdmin();
  return (
    <>
      <Link href="/admin/rekini/klienti" className={a.back}>
        ← Visi klienti
      </Link>
      <div className={a.pageHead}>
        <h1 className={a.title}>Jauns klients</h1>
      </div>
      <CustomerForm initial={emptyCustomer} />
    </>
  );
}

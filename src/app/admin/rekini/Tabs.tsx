import Link from "next/link";
import a from "../admin.module.scss";

/** Switches between the invoice list and the customer directory. */
export function InvoiceTabs({ active }: { active: "invoices" | "customers" }) {
  return (
    <nav className={a.tabs} aria-label="Sadaļa">
      <Link href="/admin/rekini" className={active === "invoices" ? a.tabActive : undefined}>
        Rēķini
      </Link>
      <Link href="/admin/rekini/klienti" className={active === "customers" ? a.tabActive : undefined}>
        Klienti
      </Link>
    </nav>
  );
}

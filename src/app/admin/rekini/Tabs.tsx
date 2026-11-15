import Link from "next/link";
import a from "../admin.module.scss";

/** Switches between the invoice list, the customer directory and the invoice logos. */
export function InvoiceTabs({ active }: { active: "invoices" | "customers" | "logos" }) {
  return (
    <nav className={a.tabs} aria-label="Sadaļa">
      <Link href="/admin/rekini" className={active === "invoices" ? a.tabActive : undefined}>
        Rēķini
      </Link>
      <Link href="/admin/rekini/klienti" className={active === "customers" ? a.tabActive : undefined}>
        Klienti
      </Link>
      <Link href="/admin/rekini/logotipi" className={active === "logos" ? a.tabActive : undefined}>
        Logotipi
      </Link>
    </nav>
  );
}

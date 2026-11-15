import { toDayKey } from "@/lib/format";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import a from "../admin.module.scss";
import s from "./invoices.module.scss";

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  unpaid: "Neapmaksāts",
  paid: "Apmaksāts",
};

export function StatusBadge({ status }: { status: InvoiceStatus }) {
  return <span className={`${a.badge} ${s[status]}`}>{INVOICE_STATUS_LABEL[status]}</span>;
}

/** Unpaid after its due day (Riga time). Informational only: nothing happens automatically. */
export const isInvoiceOverdue = (invoice: Invoice, now = new Date()) =>
  invoice.status === "unpaid" && invoice.dueDate < toDayKey(now);

export const invoiceDeleteConfirm = (invoiceNumber: string) =>
  `Dzēst rēķinu ${invoiceNumber}? To nevarēs atjaunot.\n\nJa šis ir jaunākais rēķins, tā numurs tiks piešķirts ` +
  "nākamajam rēķinam vai pasūtījumam. Ja tas jau ir nosūtīts klientam, diviem rēķiniem būs vienāds numurs.";

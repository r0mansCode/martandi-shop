import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { formatPrice } from "@/lib/money";
import { formatDate, normalizeSearch } from "@/lib/format";
import { isOverdue, ORDER_STATUS_LABEL } from "@/lib/order-status";
import type { OrderStatus } from "@/lib/types";
import a from "../admin.module.scss";
import o from "./orders.module.scss";

export const metadata: Metadata = { title: "Pasūtījumi" };

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];

export default async function AdminOrders({ searchParams }: PageProps<"/admin/pasutijumi">) {
  await requireAdmin();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(params.q);
  const status = one(params.statuss);

  const orders = await db.orders.list();
  const needle = normalizeSearch(q.trim());
  const shown = orders
    .filter((order) => !status || order.status === status)
    .filter(
      (order) =>
        !needle ||
        normalizeSearch(
          [order.invoiceNumber, order.customer.name, order.customer.email, order.company?.name ?? ""].join(" "),
        ).includes(needle),
    );

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.title}>Pasūtījumi</h1>
        <span className={a.muted}>
          {shown.length} no {orders.length}
        </span>
      </div>

      <form className={a.filters}>
        <input type="search" name="q" defaultValue={q} placeholder="Meklēt pēc rēķina Nr., vārda vai e-pasta" />
        <select name="statuss" defaultValue={status} aria-label="Statuss">
          <option value="">Visi statusi</option>
          {STATUSES.map((st) => (
            <option key={st} value={st}>
              {ORDER_STATUS_LABEL[st]}
            </option>
          ))}
        </select>
        <button type="submit" className={a.buttonSecondary}>
          Filtrēt
        </button>
      </form>

      {orders.length === 0 ? (
        <p className={a.muted}>Pasūtījumu vēl nav.</p>
      ) : (
        <div className={a.tableWrap}>
          <table className={a.table}>
            <thead>
              <tr>
                <th>Rēķina Nr.</th>
                <th>Datums</th>
                <th>Pircējs</th>
                <th>Summa</th>
                <th>Statuss</th>
                <th>Apmaksāt līdz</th>
                <th>Rēķins</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link href={`/admin/pasutijumi/${order.id}`} className={o.number}>
                      {order.invoiceNumber}
                    </Link>
                  </td>
                  <td>{formatDate(order.createdAt)}</td>
                  <td>
                    {order.company ? order.company.name : order.customer.name}
                    <br />
                    <span className={a.muted}>{order.customer.email}</span>
                  </td>
                  <td>{formatPrice(order.totals.grossCents)}</td>
                  <td>
                    <span className={`${o.badge} ${o[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
                  </td>
                  <td className={isOverdue(order) ? o.overdue : undefined}>
                    {formatDate(order.dueDate)}
                    {isOverdue(order) && " · nokavēts"}
                  </td>
                  <td>{order.invoiceEmailedAt ? "Nosūtīts" : <span className={o.overdue}>Nav nosūtīts</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

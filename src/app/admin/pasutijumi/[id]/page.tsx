import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { formatPrice } from "@/lib/money";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  deleteConfirmText,
  isOverdue,
  NEXT_STATUSES,
  ORDER_STATUS_LABEL,
  STATUS_ACTION_LABEL,
} from "@/lib/order-status";
import { ORDER_MESSAGES } from "@/lib/order-messages";
import { site } from "@/config/site";
import { removeOrder, resendInvoice, setOrderStatus } from "../actions";
import { ConfirmButton } from "../ConfirmButton";
import a from "../../admin.module.scss";
import o from "../orders.module.scss";

export const metadata: Metadata = { title: "Pasūtījums" };

const dateTime = (iso?: string) => (iso ? formatDateTime(iso) : "—");

export default async function AdminOrder({ params, searchParams }: PageProps<"/admin/pasutijumi/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const order = await db.orders.getById(id);
  if (!order) notFound();

  const zina = (await searchParams).zina;
  const message = typeof zina === "string" ? ORDER_MESSAGES[zina] : undefined;
  const { customer, company } = order;
  // Actions return to this page. Bound explicitly: a form action's next argument is its FormData.
  const here = `/admin/pasutijumi/${order.id}`;

  return (
    <>
      <Link href="/admin/pasutijumi" className={a.back}>
        ← Visi pasūtījumi
      </Link>
      <div className={o.head}>
        <h1 className={a.title}>{order.invoiceNumber}</h1>
        <span className={`${o.badge} ${o[order.status]}`}>{ORDER_STATUS_LABEL[order.status]}</span>
        {isOverdue(order) && <span className={o.overdue}>Apmaksas termiņš nokavēts</span>}
      </div>

      {message && (
        <p className={message.error ? `${o.message} ${o.messageError}` : o.message} role="status">
          {message.text}
        </p>
      )}

      <div className={o.grid}>
        <section className={o.card}>
          <h2>{company ? "Uzņēmums" : "Pircējs"}</h2>
          {company ? (
            <>
              <p>{company.name}</p>
              <p className={a.muted}>Reģ. Nr. {company.regNo}</p>
              {company.vatNo && <p className={a.muted}>PVN Nr. {company.vatNo}</p>}
              <p className={a.muted}>{company.legalAddress}</p>
              <p className={o.contact}>Kontaktpersona: {customer.name}</p>
            </>
          ) : (
            <p>{customer.name}</p>
          )}
          <p>
            <a href={`mailto:${customer.email}`}>{customer.email}</a>
          </p>
          <p>
            <a href={`tel:${customer.phone.replace(/[^\d+]/g, "")}`}>{customer.phone}</a>
          </p>
          {order.ageConfirmedAt && <p className={a.muted}>Satur alkoholu · 18+ apstiprināts</p>}
        </section>

        <section className={o.card}>
          <h2>Apmaksa</h2>
          <dl className={o.timeline}>
            <div>
              <dt>Summa</dt>
              <dd>{formatPrice(order.totals.grossCents)}</dd>
            </div>
            <div>
              <dt>Veids</dt>
              <dd>Bankas pārskaitījums</dd>
            </div>
            <div>
              <dt>Apmaksāt līdz</dt>
              <dd className={isOverdue(order) ? o.overdue : undefined}>{formatDate(order.dueDate)}</dd>
            </div>
            <div>
              <dt>Rēķins nosūtīts</dt>
              <dd className={order.invoiceEmailedAt ? undefined : o.overdue}>
                {order.invoiceEmailedAt ? dateTime(order.invoiceEmailedAt) : "Nav nosūtīts"}
              </dd>
            </div>
          </dl>
        </section>

        <section className={o.card}>
          <h2>Vēsture</h2>
          <dl className={o.timeline}>
            <div>
              <dt>Pasūtīts</dt>
              <dd>{dateTime(order.createdAt)}</dd>
            </div>
            <div>
              <dt>Apmaksāts</dt>
              <dd>{dateTime(order.paidAt)}</dd>
            </div>
            <div>
              <dt>Gatavs saņemšanai</dt>
              <dd>{dateTime(order.readyAt)}</dd>
            </div>
            <div>
              <dt>Izsniegts</dt>
              <dd>{dateTime(order.collectedAt)}</dd>
            </div>
            {order.cancelledAt && (
              <div>
                <dt>Atcelts</dt>
                <dd>{dateTime(order.cancelledAt)}</dd>
              </div>
            )}
          </dl>
        </section>
      </div>

      <div className={a.tableWrap}>
        <table className={a.table}>
          <thead>
            <tr>
              <th>Prece</th>
              <th>Tilpums</th>
              <th className={o.right}>Cena</th>
              <th className={o.right}>Daudz.</th>
              <th className={o.right}>Summa</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map((item) => (
              <tr key={item.variantId}>
                <td>
                  <Link href={`/admin/produkti/${item.productId}`}>{item.name}</Link>
                </td>
                <td>{item.variantLabel}</td>
                <td className={o.right}>{formatPrice(item.unitPriceCents)}</td>
                <td className={o.right}>{item.qty}</td>
                <td className={o.right}>{formatPrice(item.unitPriceCents * item.qty)}</td>
              </tr>
            ))}
            <tr>
              <td colSpan={4} className={o.right}>
                Summa bez PVN
              </td>
              <td className={o.right}>{formatPrice(order.totals.netCents)}</td>
            </tr>
            <tr>
              <td colSpan={4} className={o.right}>
                PVN {Math.round(site.vatRate * 100)}%
              </td>
              <td className={o.right}>{formatPrice(order.totals.vatCents)}</td>
            </tr>
            <tr className={o.totals}>
              <td colSpan={4} className={o.right}>
                Kopā
              </td>
              <td className={o.right}>{formatPrice(order.totals.grossCents)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className={o.actions}>
        {NEXT_STATUSES[order.status].map((next) => (
          <form key={next} action={setOrderStatus.bind(null, order.id, next, here)}>
            {next === "cancelled" ? (
              <ConfirmButton
                confirm={`Atcelt pasūtījumu ${order.invoiceNumber}? To nevarēs atjaunot.`}
                className={`${a.buttonSecondary} ${o.danger}`}
              >
                {STATUS_ACTION_LABEL[next]}
              </ConfirmButton>
            ) : (
              <button type="submit" className={a.button}>
                {STATUS_ACTION_LABEL[next]}
              </button>
            )}
          </form>
        ))}
        <a href={`/admin/pasutijumi/${order.id}/rekins`} target="_blank" rel="noopener" className={a.buttonSecondary}>
          Atvērt rēķinu (PDF)
        </a>
        <form action={resendInvoice.bind(null, order.id, here)}>
          <button type="submit" className={a.buttonSecondary}>
            Nosūtīt rēķinu atkārtoti
          </button>
        </form>
        <form action={removeOrder.bind(null, order.id, here)} className={o.pushRight}>
          <ConfirmButton confirm={deleteConfirmText(order)} className={`${a.buttonSecondary} ${o.danger}`}>
            Dzēst pasūtījumu
          </ConfirmButton>
        </form>
      </div>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { formatPrice } from "@/lib/money";
import { formatDate, formatTime, normalizeSearch, plural, toDayKey } from "@/lib/format";
import {
  deleteConfirmText,
  isOverdue,
  NEXT_STATUSES,
  ORDER_STATUS_LABEL,
  PAID_STATUSES,
  STATUS_SHORT_ACTION,
} from "@/lib/order-status";
import { ORDER_MESSAGES } from "@/lib/order-messages";
import type { Order, OrderStatus } from "@/lib/types";
import { site } from "@/config/site";
import { removeOrder, setOrderStatus } from "./actions";
import { BanknoteIcon, CheckCircleIcon, DownloadIcon, HourglassIcon, PackageIcon } from "@/components/icons";
import { ConfirmButton } from "../ConfirmButton";
import a from "../admin.module.scss";
import o from "./orders.module.scss";

export const metadata: Metadata = { title: "Pasūtījumi" };

const STATUSES = Object.keys(ORDER_STATUS_LABEL) as OrderStatus[];
// Status buttons with more characters than this get a smaller font to keep the column narrow.
const LONG_BUTTON_TEXT = 24;

function StatusIcon({ status }: { status: OrderStatus }) {
  const size = { width: 16, height: 16 };
  switch (status) {
    case "awaiting_payment":
      return <HourglassIcon {...size} className={o.statusIcon} />;
    case "paid":
      return <BanknoteIcon {...size} className={`${o.statusIcon} ${o.greenIcon}`} />;
    case "ready_for_pickup":
      return <PackageIcon {...size} className={o.statusIcon} />;
    case "collected":
      return <CheckCircleIcon {...size} className={`${o.statusIcon} ${o.greenIcon}`} />;
    default:
      return null;
  }
}
const DAY_MS = 24 * 60 * 60 * 1000;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

// Items column: at most this many lines, each shortened in the middle so the product's
// start and the "0,7 l × 2" end stay readable. The full text is in the tooltip.
const MAX_ITEMS_SHOWN = 5;
const ITEM_TEXT_MAX = 34;

function truncateMiddle(text: string, max: number): string {
  if (text.length <= max) return text;
  const tail = Math.floor((max - 1) / 2.4);
  const head = max - 1 - tail;
  return `${text.slice(0, head).trimEnd()}…${text.slice(-tail).trimStart()}`;
}

type Params = Awaited<PageProps<"/admin/pasutijumi">["searchParams"]>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

// Two tabs, as in the ohmycrisp admin: the full orders table with inline actions, and a
// sales summary for a date range. Deleting the newest order frees its invoice number
// (see deleteOrder in server/orders.ts).
export default async function AdminOrders({ searchParams }: PageProps<"/admin/pasutijumi">) {
  await requireAdmin();
  const params = await searchParams;
  const view = one(params.skats) === "kopsavilkums" ? "summary" : "orders";
  const orders = await db.orders.list();

  const zina = one(params.zina);
  const message = ORDER_MESSAGES[zina];

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.title}>Pasūtījumi</h1>
      </div>

      <nav className={o.tabs} aria-label="Skats">
        <Link href="/admin/pasutijumi" className={view === "orders" ? o.tabActive : undefined}>
          Pasūtījumu tabula
        </Link>
        <Link
          href="/admin/pasutijumi?skats=kopsavilkums"
          className={view === "summary" ? o.tabActive : undefined}
        >
          Pārdošanas kopsavilkums
        </Link>
      </nav>

      {message && (
        <p className={message.error ? `${o.message} ${o.messageError}` : o.message} role="status">
          {message.text}
        </p>
      )}

      {view === "orders" ? <OrdersTable orders={orders} params={params} /> : <SalesSummary orders={orders} params={params} />}
    </>
  );
}

function OrdersTable({ orders, params }: { orders: Order[]; params: Params }) {
  const q = one(params.q);
  const status = one(params.statuss);

  const needle = normalizeSearch(q.trim());
  const shown = orders
    .filter((order) => !status || order.status === status)
    .filter(
      (order) =>
        !needle ||
        normalizeSearch(
          [order.invoiceNumber, order.customer.name, order.customer.email, order.customer.phone, order.company?.name ?? ""].join(" "),
        ).includes(needle),
    );

  // Actions come back to this exact view (filters kept).
  const query = new URLSearchParams();
  if (q) query.set("q", q);
  if (status) query.set("statuss", status);
  const returnTo = `/admin/pasutijumi${query.size ? `?${query}` : ""}`;

  return (
    <>
      <form className={a.filters}>
        <input type="search" name="q" defaultValue={q} placeholder="Meklēt pēc rēķina Nr., vārda, e-pasta vai tālruņa" />
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
        <span className={`${a.muted} ${o.count}`}>
          {shown.length} no {orders.length}
        </span>
      </form>

      <div className={a.tableWrap}>
        <table className={`${a.table} ${o.ordersTable}`}>
          <thead>
            <tr>
              <th>Datums</th>
              <th>Rēķina Nr.</th>
              <th>Pircējs</th>
              <th>Pircēja kontakti</th>
              <th>Preces</th>
              <th className={o.right}>Summa</th>
              <th>Statuss</th>
              <th>Darbības</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((order) => (
              <tr key={order.id}>
                <td className={o.nowrap}>
                  {formatDate(order.createdAt)}
                  <br />
                  <span className={a.muted}>{formatTime(order.createdAt)}</span>
                </td>
                <td>
                  <Link href={`/admin/pasutijumi/${order.id}`} className={o.number}>
                    {order.invoiceNumber}
                  </Link>
                </td>
                <td className={o.buyer}>
                  {order.company ? (
                    <>
                      {order.company.name}
                      <br />
                      <span className={a.muted}>{order.customer.name}</span>
                    </>
                  ) : (
                    order.customer.name
                  )}
                </td>
                <td>
                  <a href={`mailto:${order.customer.email}`}>{order.customer.email}</a>
                  <span className={`${a.muted} ${o.block} ${o.nowrap}`}>{order.customer.phone}</span>
                </td>
                <td>
                  <ul className={o.itemList}>
                    {order.items.slice(0, MAX_ITEMS_SHOWN).map((item) => {
                      const text = `${item.name}, ${item.variantLabel} × ${item.qty}`;
                      return (
                        <li key={item.variantId} title={text}>
                          {truncateMiddle(text, ITEM_TEXT_MAX)}
                        </li>
                      );
                    })}
                    {order.items.length > MAX_ITEMS_SHOWN && (
                      <li className={o.moreItems}>
                        <Link href={`/admin/pasutijumi/${order.id}`}>
                          + vēl {order.items.length - MAX_ITEMS_SHOWN}
                        </Link>
                      </li>
                    )}
                  </ul>
                </td>
                <td className={o.right}>{formatPrice(order.totals.grossCents)}</td>
                <td>
                  <span className={`${o.statusText} ${o[order.status]}`}>
                    <StatusIcon status={order.status} />
                    {ORDER_STATUS_LABEL[order.status]}
                  </span>
                  {isOverdue(order) && <span className={`${o.overdue} ${o.block}`}>nokavēts</span>}
                  {NEXT_STATUSES[order.status]
                    .filter((next) => next !== "cancelled")
                    .map((next) => (
                      <form key={next} action={setOrderStatus.bind(null, order.id, next, returnTo)}>
                        <button
                          type="submit"
                          className={`${o.statusButton} ${STATUS_SHORT_ACTION[next].length > LONG_BUTTON_TEXT ? o.longText : ""}`}
                        >
                          {STATUS_SHORT_ACTION[next]}
                        </button>
                      </form>
                    ))}
                </td>
                <td>
                  <div className={o.rowActions}>
                    <div className={o.actionRow}>
                      {NEXT_STATUSES[order.status].includes("cancelled") && (
                        <form action={setOrderStatus.bind(null, order.id, "cancelled", returnTo)}>
                          <ConfirmButton
                            confirm={`Atcelt pasūtījumu ${order.invoiceNumber}? To nevarēs atjaunot.`}
                            className={`${o.smallButton} ${o.danger}`}
                          >
                            {STATUS_SHORT_ACTION.cancelled}
                          </ConfirmButton>
                        </form>
                      )}
                      <form action={removeOrder.bind(null, order.id, returnTo)}>
                        <ConfirmButton confirm={deleteConfirmText(order)} className={`${o.smallButton} ${o.danger}`}>
                          Dzēst
                        </ConfirmButton>
                      </form>
                    </div>
                    <div className={o.actionRow}>
                      <a
                        href={`/admin/pasutijumi/${order.id}/rekins`}
                        target="_blank"
                        rel="noopener"
                        className={o.smallButton}
                      >
                        Skatīt PDF
                      </a>
                      <a
                        href={`/admin/pasutijumi/${order.id}/rekins?lejupieladet=1`}
                        download
                        className={`${o.smallButton} ${o.iconButton}`}
                        title={`Lejupielādēt rēķinu ${order.invoiceNumber}`}
                        aria-label={`Lejupielādēt rēķinu ${order.invoiceNumber}`}
                      >
                        <DownloadIcon width={20} height={20} />
                      </a>
                    </div>
                  </div>
                </td>
              </tr>
            ))}
            {shown.length === 0 && (
              <tr>
                <td colSpan={8} className={o.empty}>
                  {orders.length ? "Neviens pasūtījums neatbilst filtriem." : "Pasūtījumu vēl nav."}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

function SalesSummary({ orders, params }: { orders: Order[]; params: Params }) {
  // Default range: the last 7 days, in Riga time.
  const now = new Date();
  const today = toDayKey(now);
  const from = DAY.test(one(params.no)) ? one(params.no) : toDayKey(new Date(now.getTime() - 7 * DAY_MS));
  const to = DAY.test(one(params.lidz)) ? one(params.lidz) : today;

  // Revenue counts on the day the payment was recorded.
  const sales = orders
    .filter((order) => PAID_STATUSES.includes(order.status))
    .map((order) => ({ order, day: toDayKey(order.paidAt ?? order.createdAt) }))
    .filter(({ day }) => day >= from && day <= to)
    .toSorted((x, y) => y.day.localeCompare(x.day));

  const sum = (key: "netCents" | "vatCents" | "depositCents") =>
    sales.reduce((total, { order }) => total + (order.totals[key] ?? 0), 0);
  // Packaging deposits are passed on, not revenue, so they are shown apart from it.
  const deposits = sum("depositCents");

  const awaiting = orders.filter((order) => order.status === "awaiting_payment");
  const awaitingTotal = awaiting.reduce((total, order) => total + order.totals.grossCents, 0);
  const overdue = awaiting.filter((order) => isOverdue(order)).length;

  // Units sold per product variant in the range, most sold first.
  const sold = new Map<string, { name: string; qty: number; grossCents: number }>();
  for (const { order } of sales) {
    for (const item of order.items) {
      const key = `${item.name}, ${item.variantLabel}`;
      const entry = sold.get(key) ?? { name: key, qty: 0, grossCents: 0 };
      entry.qty += item.qty;
      entry.grossCents += item.unitPriceCents * item.qty;
      sold.set(key, entry);
    }
  }
  const topProducts = [...sold.values()].toSorted((x, y) => y.qty - x.qty || y.grossCents - x.grossCents);

  return (
    <>
      <form className={a.filters}>
        <input type="hidden" name="skats" value="kopsavilkums" />
        <label className={o.dateField}>
          No
          <input type="date" name="no" defaultValue={from} max={today} />
        </label>
        <label className={o.dateField}>
          Līdz
          <input type="date" name="lidz" defaultValue={to} max={today} />
        </label>
        <button type="submit" className={a.buttonSecondary}>
          Rādīt
        </button>
      </form>

      <dl className={o.stats}>
        <div>
          <dt>Apmaksāti pasūtījumi</dt>
          <dd>{sales.length}</dd>
        </div>
        <div>
          <dt>Ieņēmumi (ar PVN)</dt>
          <dd>{formatPrice(sum("netCents") + sum("vatCents"))}</dd>
          <p className={a.muted}>
            bez PVN {formatPrice(sum("netCents"))} · PVN {Math.round(site.vatRate * 100)}% {formatPrice(sum("vatCents"))}
            {deposits > 0 && ` · depozīts ${formatPrice(deposits)}`}
          </p>
        </div>
        <div>
          <dt>Gaida apmaksu (visi)</dt>
          <dd>{formatPrice(awaitingTotal)}</dd>
          <p className={a.muted}>
            {awaiting.length} {plural(awaiting.length, "pasūtījums", "pasūtījumi")}
            {overdue > 0 && <span className={o.overdue}> · {overdue} nokavēti</span>}
          </p>
        </div>
      </dl>

      <p className={`${a.muted} ${o.rangeNote}`}>
        Apmaksātie pasūtījumi no {formatDate(`${from}T12:00:00Z`)} līdz {formatDate(`${to}T12:00:00Z`)} (pēc apmaksas
        datuma).
      </p>

      {sales.length > 0 && (
        <div className={o.summaryGrid}>
          <section>
            <h2 className={o.subTitle}>Pasūtījumi</h2>
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th>Apmaksāts</th>
                    <th>Rēķina Nr.</th>
                    <th>Pircējs</th>
                    <th className={o.right}>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {sales.map(({ order }) => (
                    <tr key={order.id}>
                      <td>{formatDate(order.paidAt ?? order.createdAt)}</td>
                      <td>
                        <Link href={`/admin/pasutijumi/${order.id}`} className={o.number}>
                          {order.invoiceNumber}
                        </Link>
                      </td>
                      <td>{order.company?.name ?? order.customer.name}</td>
                      <td className={o.right}>{formatPrice(order.totals.grossCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className={o.subTitle}>Pārdotās preces</h2>
            <div className={a.tableWrap}>
              <table className={a.table}>
                <thead>
                  <tr>
                    <th>Prece</th>
                    <th className={o.right}>Daudz.</th>
                    <th className={o.right}>Summa</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.map((p) => (
                    <tr key={p.name}>
                      <td>{p.name}</td>
                      <td className={o.right}>{p.qty}</td>
                      <td className={o.right}>{formatPrice(p.grossCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/format";
import { pickup, site } from "@/config/site";
import { seller } from "@/config/seller";
import s from "./page.module.scss";

// Order confirmation. The URL holds a random UUID, so only the person who placed the order
// (and whoever they share the link with) can open it. Always rendered fresh: never cached.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Paldies par pasūtījumu",
  robots: { index: false, follow: false },
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function ThankYouPage({ params }: PageProps<"/paldies/[id]">) {
  const { id } = await params;
  if (!UUID.test(id)) notFound();
  const order = await db.orders.getById(id);
  if (!order) notFound();

  const payment: [string, string][] = [
    ["Summa", formatPrice(order.totals.grossCents)],
    ["Saņēmējs", seller.name],
    ["Konts (IBAN)", seller.iban],
    ["Banka", `${seller.bank}, SWIFT ${seller.swift}`],
    ["Maksājuma mērķis", order.invoiceNumber],
    ["Apmaksāt līdz", formatDate(order.dueDate)],
  ];

  return (
    <div className={s.page}>
      <p className={s.kicker}>Pasūtījums Nr. {order.invoiceNumber}</p>
      <h1 className={s.title}>Paldies par pasūtījumu!</h1>

      {order.invoiceEmailedAt ? (
        <p className={s.lead}>
          Rēķinu nosūtījām uz <strong>{order.customer.email}</strong>. Ja to neredzat, pārbaudiet arī mēstuļu mapi.
        </p>
      ) : (
        <p className={s.warning} role="status">
          Pasūtījums ir saņemts, bet rēķinu uz <strong>{order.customer.email}</strong> neizdevās nosūtīt. Mēs to
          nosūtīsim atkārtoti. Apmaksai varat izmantot zemāk norādītos rekvizītus, vai rakstiet mums:{" "}
          <a href={`mailto:${site.email}`}>{site.email}</a>
          .
        </p>
      )}

      <div className={s.layout}>
        <section className={s.card} aria-labelledby="pay">
          <h2 id="pay" className={s.cardTitle}>
            Apmaksa ar bankas pārskaitījumu
          </h2>
          <dl className={s.details}>
            {payment.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section className={s.card} aria-labelledby="next">
          <h2 id="next" className={s.cardTitle}>
            Kas notiks tālāk
          </h2>
          <ol className={s.steps}>
            <li>Apmaksājiet rēķinu līdz {formatDate(order.dueDate)}.</li>
            <li>Kad apmaksa būs saņemta, sagatavosim pasūtījumu un paziņosim pa e-pastu.</li>
            <li>
              Saņemiet pasūtījumu veikalā – {order.pickupLocation}
              <span className={s.muted}> ({pickup.hours.map((h) => `${h.days} ${h.time}`).join(", ")})</span>.
              {order.ageConfirmedAt && " Paņemiet līdzi personu apliecinošu dokumentu."}
            </li>
          </ol>
        </section>
      </div>

      <section className={s.items} aria-labelledby="items">
        <h2 id="items" className={s.cardTitle}>
          Pasūtītās preces
        </h2>
        <ul>
          {order.items.map((item) => (
            <li key={item.variantId}>
              <span>
                {item.name} <span className={s.muted}>· {item.variantLabel} × {item.qty}</span>
              </span>
              <span>{formatPrice(item.unitPriceCents * item.qty)}</span>
            </li>
          ))}
        </ul>
        <p className={s.total}>
          <span>Kopā (t. sk. PVN {formatPrice(order.totals.vatCents)})</span>
          <span>{formatPrice(order.totals.grossCents)}</span>
        </p>
      </section>

      <Link href="/katalogs" className={s.button}>
        Turpināt iepirkties
      </Link>
    </div>
  );
}

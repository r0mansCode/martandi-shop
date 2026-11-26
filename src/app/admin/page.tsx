import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { ADD_PASSKEY_HREF } from "@/server/auth/cognito";
import { getPickupInfo } from "@/server/shop-hours";
import { site } from "@/config/site";
import s from "./page.module.scss";

type Card = { href: string; tag: string; title: string; text: string; stat: string; note?: string };

export default async function AdminHome() {
  await requireAdmin();
  const [products, categories, orders, invoices, pickupInfo] = await Promise.all([
    db.products.list(),
    db.categories.list(),
    db.orders.list(),
    db.invoices.list(),
    getPickupInfo(),
  ]);
  const published = products.filter((p) => p.status === "published").length;
  const awaitingPayment = orders.filter((o) => o.status === "awaiting_payment").length;
  const unpaidInvoices = invoices.filter((i) => i.status === "unpaid").length;

  const cards: Card[] = [
    {
      href: "/admin/pasutijumi",
      tag: "Pasūtījumi",
      title: "Pasūtījumi",
      text: "Apmaksas statusi, izsniegšana un pārdošanas kopsavilkums.",
      stat: String(orders.length),
      note: `${awaitingPayment} gaida apmaksu`,
    },
    {
      href: "/admin/rekini",
      tag: "Rēķini",
      title: "Rēķini",
      text: "Izraksti B2B rēķinus, pārvaldi klientus un lejupielādē PDF.",
      stat: String(invoices.length),
      note: `${unpaidInvoices} neapmaksāti`,
    },
    {
      href: "/admin/produkti",
      tag: "Katalogs",
      title: "Produkti",
      text: "Pievieno un rediģē produktus, izmērus, cenas un attēlus.",
      stat: String(products.length),
      note: `${published} publicēti`,
    },
    {
      href: "/admin/kategorijas",
      tag: "Katalogs",
      title: "Kategorijas",
      text: "Veikala izvēlnes kategorijas un to secība.",
      stat: String(categories.length),
    },
  ];

  return (
    <div className={s.hub}>
      <div className={s.head}>
        <p className={s.eyebrow}>{site.name} administrācija</p>
        <h1 className={s.title}>Pārskats</h1>
        <p className={s.lead}>Izvēlies sadaļu, ar kuru strādāt.</p>
      </div>

      <ul className={s.grid}>
        {cards.map((card) => (
          <li key={card.href}>
            <Link href={card.href} className={s.card}>
              <span className={s.cardTop}>
                <span className={s.tag}>{card.tag}</span>
                <span className={s.arrow} aria-hidden="true">
                  →
                </span>
              </span>
              <span className={s.cardTitle}>{card.title}</span>
              <span className={s.cardText}>{card.text}</span>
              <span className={s.stat}>
                {card.stat}
                {card.note && <small>{card.note}</small>}
              </span>
            </Link>
          </li>
        ))}
        <li>
          <Link href="/admin/darba-laiks" className={`${s.card} ${s.cardLight}`}>
            <span className={s.cardTop}>
              <span className={s.tag}>Veikals</span>
              <span className={s.arrow} aria-hidden="true">
                →
              </span>
            </span>
            <span className={s.cardTitle}>Darba laiks</span>
            <span className={s.hours}>
              {pickupInfo.hours.map((h) => (
                <span key={h.days}>
                  {h.days} {h.time}
                </span>
              ))}
            </span>
            {pickupInfo.closure && <span className={s.closure}>{pickupInfo.closure}</span>}
          </Link>
        </li>
      </ul>

      {/* Always here: the header link hides once this device has been through passkey setup. */}
      <p className={s.passkey}>
        Jauna ierīce vai jāpievieno vēl viena? <a href={ADD_PASSKEY_HREF}>Pievienot piekļuves atslēgu</a>
      </p>
    </div>
  );
}

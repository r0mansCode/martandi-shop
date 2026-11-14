import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { ADD_PASSKEY_HREF } from "@/server/auth/cognito";
import { getPickupInfo } from "@/server/shop-hours";
import s from "./page.module.scss";

export default async function AdminHome() {
  await requireAdmin();
  const [products, categories, orders, pickupInfo] = await Promise.all([
    db.products.list(),
    db.categories.list(),
    db.orders.list(),
    getPickupInfo(),
  ]);
  const published = products.filter((p) => p.status === "published").length;
  const awaitingPayment = orders.filter((o) => o.status === "awaiting_payment").length;

  return (
    <>
      <h1 className={s.title}>Pārskats</h1>
      <ul className={s.stats}>
        <li>
          <Link href="/admin/produkti" className={s.card}>
            <span className={s.label}>Produkti</span>
            <span className={s.value}>
              {products.length} <small>({published} publicēti)</small>
            </span>
          </Link>
        </li>
        <li>
          <Link href="/admin/kategorijas" className={s.card}>
            <span className={s.label}>Kategorijas</span>
            <span className={s.value}>{categories.length}</span>
          </Link>
        </li>
        <li>
          <Link href="/admin/pasutijumi" className={s.card}>
            <span className={s.label}>Pasūtījumi</span>
            <span className={s.value}>
              {orders.length} <small>({awaitingPayment} gaida apmaksu)</small>
            </span>
          </Link>
        </li>
        <li>
          <Link href="/admin/darba-laiks" className={s.card}>
            <span className={s.label}>Darba laiks</span>
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
    </>
  );
}

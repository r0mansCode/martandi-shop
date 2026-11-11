import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import s from "./page.module.scss";

export default async function AdminHome() {
  await requireAdmin();
  const [products, categories, orders] = await Promise.all([
    db.products.list(),
    db.categories.list(),
    db.orders.list(),
  ]);
  const published = products.filter((p) => p.status === "published").length;
  const awaitingPayment = orders.filter((o) => o.status === "awaiting_payment").length;

  return (
    <>
      <h1 className={s.title}>Pārskats</h1>
      <dl className={s.stats}>
        <div>
          <dt>Produkti</dt>
          <dd>
            {products.length} <span>({published} publicēti)</span>
          </dd>
        </div>
        <div>
          <dt>Kategorijas</dt>
          <dd>{categories.length}</dd>
        </div>
        <div>
          <dt>
            <Link href="/admin/pasutijumi">Pasūtījumi</Link>
          </dt>
          <dd>
            {orders.length} <span>({awaitingPayment} gaida apmaksu)</span>
          </dd>
        </div>
      </dl>
    </>
  );
}

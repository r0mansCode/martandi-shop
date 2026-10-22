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
          <dt>Pasūtījumi</dt>
          <dd>{orders.length}</dd>
        </div>
      </dl>
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { formatPrice } from "@/lib/money";
import { normalizeSearch } from "@/lib/format";
import type { Product } from "@/lib/types";
import { UNSORTED_FILTER } from "@/lib/catalog-input";
import a from "../admin.module.scss";

export const metadata: Metadata = { title: "Produkti" };

function priceRange(p: Product) {
  const prices = p.variants.filter((v) => v.active).map((v) => v.priceCents);
  if (!prices.length) return "—";
  const [min, max] = [Math.min(...prices), Math.max(...prices)];
  return min === max ? formatPrice(min) : `${formatPrice(min)} – ${formatPrice(max)}`;
}

/** "+ depozīts 0,10 €" when active variants carry a deposit; null otherwise. */
function depositNote(p: Product) {
  const deposits = [...new Set(p.variants.filter((v) => v.active && v.depositCents).map((v) => v.depositCents!))];
  if (!deposits.length) return null;
  return `+ depozīts ${deposits.map(formatPrice).join(" / ")}`;
}

export default async function AdminProducts({ searchParams }: PageProps<"/admin/produkti">) {
  await requireAdmin();
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const q = one(params.q);
  const category = one(params.kategorija);
  const status = one(params.statuss);

  const [products, categories] = await Promise.all([db.products.list(), db.categories.list()]);
  const categoryName = new Map(categories.map((c) => [c.id, c.name]));
  const needle = normalizeSearch(q.trim());

  const shown = products
    .filter((p) => !category || p.categoryId === (category === UNSORTED_FILTER ? "" : category))
    .filter((p) => !status || p.status === status)
    .filter((p) => !needle || normalizeSearch(`${p.name} ${p.producer ?? ""} ${p.slug}`).includes(needle))
    .toSorted((x, y) => x.name.localeCompare(y.name, "lv"));

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.title}>Produkti</h1>
        <span className={a.muted}>
          {shown.length} no {products.length}
        </span>
      </div>

      <form className={a.filters}>
        <input type="search" name="q" defaultValue={q} placeholder="Meklēt pēc nosaukuma vai ražotāja" />
        <select name="kategorija" defaultValue={category} aria-label="Kategorija">
          <option value="">Visas kategorijas</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
          <option value={UNSORTED_FILTER}>Bez kategorijas</option>
        </select>
        <select name="statuss" defaultValue={status} aria-label="Statuss">
          <option value="">Visi statusi</option>
          <option value="published">Publicēti</option>
          <option value="draft">Melnraksti</option>
        </select>
        <button type="submit" className={a.buttonSecondary}>
          Filtrēt
        </button>
      </form>

      <div className={a.tableWrap}>
        <table className={`${a.table} ${a.clickable}`}>
          <thead>
            <tr>
              <th aria-label="Attēls" />
              <th>Nosaukums</th>
              <th>Kategorija</th>
              <th>Cena</th>
              <th>Statuss</th>
              <th>Labots</th>
            </tr>
          </thead>
          <tbody>
            {shown.map((p) => (
              <tr key={p.id}>
                <td>
                  {p.images[0] && (
                    // Plain <img>: tiny admin thumbnails don't need the image optimizer.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.images[0].url} alt="" className={a.thumb} loading="lazy" />
                  )}
                </td>
                <td>
                  <Link href={`/admin/produkti/${p.id}`} className={a.rowLink}>
                    {p.name}
                  </Link>
                </td>
                <td>
                  {p.categoryId ? (categoryName.get(p.categoryId) ?? "—") : <span className={a.muted}>Bez kategorijas</span>}
                </td>
                <td>
                  {priceRange(p)}
                  {depositNote(p) && <div className={a.muted}>{depositNote(p)}</div>}
                </td>
                <td>
                  <span className={p.status === "draft" ? `${a.status} ${a.statusDraft}` : a.status}>
                    {p.status === "draft" ? "Melnraksts" : "Publicēts"}
                  </span>
                </td>
                <td className={a.muted}>{new Date(p.updatedAt).toLocaleDateString("lv-LV")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

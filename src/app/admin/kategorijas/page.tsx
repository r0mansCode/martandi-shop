import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { plural } from "@/lib/format";
import { CategoryList } from "./CategoryList";
import a from "../admin.module.scss";
import s from "./categories.module.scss";

export const metadata: Metadata = { title: "Kategorijas" };

export default async function AdminCategories({ searchParams }: PageProps<"/admin/kategorijas">) {
  await requireAdmin();
  const [categories, products] = await Promise.all([db.categories.list(), db.products.list()]);
  const rows = categories.map((c) => ({
    id: c.id,
    name: c.name,
    slug: c.slug,
    productCount: products.filter((p) => p.categoryId === c.id).length,
  }));

  // Feedback after creating or deleting (those actions redirect here with ?zina=…).
  const params = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";
  const name = one(params.kategorija);
  const count = Number(one(params.skaits)) || 0;
  const message =
    one(params.zina) === "izveidota"
      ? { text: `Kategorija „${name}” izveidota. Tā ir saraksta beigās – velciet to uz vajadzīgo vietu.`, error: false }
      : one(params.zina) === "dzesta"
      ? { text: `Kategorija „${name}” dzēsta.`, error: false }
      : one(params.zina) === "nav-tuksa"
        ? {
            text: `Kategoriju „${name}” nevar dzēst: tajā ir ${count} ${plural(count, "produkts", "produkti")}. Vispirms pārvietojiet tos uz citu kategoriju.`,
            error: true,
          }
        : null;

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.title}>Kategorijas</h1>
        <span className={a.muted}>Velciet rindas, lai mainītu secību veikala izvēlnē.</span>
        <Link href="/admin/kategorijas/jauna" className={a.button}>
          + Jauna kategorija
        </Link>
      </div>
      {message && (
        <p className={message.error ? `${s.message} ${s.messageError}` : s.message} role="status">
          {message.text}
        </p>
      )}
      <CategoryList categories={rows} />
    </>
  );
}

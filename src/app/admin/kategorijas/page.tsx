import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { plural } from "@/lib/format";
import { CategoryForm } from "./CategoryForm";
import a from "../admin.module.scss";

export const metadata: Metadata = { title: "Kategorijas" };

export default async function AdminCategories() {
  await requireAdmin();
  const [categories, products] = await Promise.all([db.categories.list(), db.products.list()]);
  const count = (id: string) => products.filter((p) => p.categoryId === id).length;

  return (
    <>
      <div className={a.pageHead}>
        <h1 className={a.title}>Kategorijas</h1>
        <span className={a.muted}>Secība nosaka kārtību veikala izvēlnē (mazākais pirmais).</span>
      </div>
      <div className={a.form}>
        {categories.map((c) => (
          <section key={`${c.id}-${c.slug}-${c.sortOrder}`} className={a.section}>
            <h2>
              {c.name}{" "}
              <Link href={`/admin/produkti?kategorija=${c.id}`} className={a.muted}>
                {count(c.id)} {plural(count(c.id), "produkts", "produkti")}
              </Link>
            </h2>
            <CategoryForm category={c} />
          </section>
        ))}
      </div>
    </>
  );
}

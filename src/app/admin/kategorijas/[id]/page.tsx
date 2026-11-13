import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { plural } from "@/lib/format";
import { CategoryForm } from "../CategoryForm";
import { ConfirmButton } from "../../ConfirmButton";
import { deleteCategory } from "../../actions";
import a from "../../admin.module.scss";
import s from "../categories.module.scss";

export const metadata: Metadata = { title: "Kategorija" };

export default async function AdminCategory({ params }: PageProps<"/admin/kategorijas/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [category, products] = await Promise.all([db.categories.getById(id), db.products.list()]);
  if (!category) notFound();
  const count = products.filter((p) => p.categoryId === id).length;

  return (
    <>
      <Link href="/admin/kategorijas" className={a.back}>
        ← Visas kategorijas
      </Link>
      <div className={a.pageHead}>
        <h1 className={a.title}>{category.name}</h1>
        <Link href={`/admin/produkti?kategorija=${category.id}`} className={a.muted}>
          {count} {plural(count, "produkts", "produkti")}
        </Link>
      </div>

      <section className={a.section}>
        {/* Keyed so the fields show fresh values after a save changes the stored category. */}
        <CategoryForm key={`${category.slug}-${category.sortOrder}`} category={category} />
      </section>

      <div className={s.dangerZone}>
        {count > 0 ? (
          <p className={a.muted}>
            Kategoriju var dzēst tikai tad, kad tajā nav produktu. Pārvietojiet {count}{" "}
            {plural(count, "produktu", "produktus")} uz citu kategoriju.
          </p>
        ) : (
          <form action={deleteCategory.bind(null, category.id)}>
            <ConfirmButton
              confirm={`Dzēst kategoriju „${category.name}”? To nevarēs atjaunot.`}
              className={`${a.buttonSecondary} ${s.deleteButton}`}
            >
              Dzēst kategoriju
            </ConfirmButton>
          </form>
        )}
      </div>
    </>
  );
}

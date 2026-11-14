import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { plural } from "@/lib/format";
import { deleteCategoryConfirm } from "@/lib/catalog-input";
import { CategoryForm } from "../CategoryForm";
import { ConfirmButton } from "../../ConfirmButton";
import { deleteCategory } from "../../actions";
import a from "../../admin.module.scss";
import s from "../categories.module.scss";

export const metadata: Metadata = { title: "Kategorija" };

export default async function AdminCategory({ params }: PageProps<"/admin/kategorijas/[id]">) {
  await requireAdmin();
  const { id } = await params;
  const [category, categories, products] = await Promise.all([
    db.categories.getById(id),
    db.categories.list(),
    db.products.list(),
  ]);
  if (!category) notFound();
  const count = products.filter((p) => p.categoryId === id).length;
  // Show the place in the list (same as the list's "Nr."), not the raw sortOrder value.
  const position = categories.findIndex((c) => c.id === id) + 1;

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
        <CategoryForm key={category.slug} category={category} position={position} />
      </section>

      <div className={s.dangerZone}>
        <form action={deleteCategory.bind(null, category.id)}>
          <ConfirmButton
            confirm={deleteCategoryConfirm(category.name, count)}
            className={`${a.buttonSecondary} ${s.deleteButton}`}
          >
            Dzēst kategoriju
          </ConfirmButton>
        </form>
        {count > 0 && (
          <p className={a.hint}>
            {count} {plural(count, "produkts tiks pārvietots", "produkti tiks pārvietoti")} uz „Bez kategorijas” un
            veikalā netiks {plural(count, "rādīts", "rādīti")}, kamēr {plural(count, "tam", "tiem")} nepiešķirsiet citu
            kategoriju.
          </p>
        )}
      </div>
    </>
  );
}

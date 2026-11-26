import type { Metadata } from "next";
import { requireAdmin } from "@/server/auth/session";
import { CategoryForm } from "../CategoryForm";
import { Breadcrumbs } from "../../Breadcrumbs";
import a from "../../admin.module.scss";

export const metadata: Metadata = { title: "Jauna kategorija" };

export default async function NewCategory() {
  await requireAdmin();

  return (
    <>
      <Breadcrumbs
        items={[{ label: "Kategorijas", href: "/admin/kategorijas" }, { label: "Jauna kategorija" }]}
      />
      <div className={a.pageHead}>
        <h1 className={a.title}>Jauna kategorija</h1>
      </div>
      <section className={a.section}>
        <CategoryForm />
      </section>
    </>
  );
}

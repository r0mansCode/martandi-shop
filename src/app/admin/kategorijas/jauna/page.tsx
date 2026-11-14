import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/server/auth/session";
import { CategoryForm } from "../CategoryForm";
import a from "../../admin.module.scss";

export const metadata: Metadata = { title: "Jauna kategorija" };

export default async function NewCategory() {
  await requireAdmin();

  return (
    <>
      <Link href="/admin/kategorijas" className={a.back}>
        ← Visas kategorijas
      </Link>
      <div className={a.pageHead}>
        <h1 className={a.title}>Jauna kategorija</h1>
      </div>
      <section className={a.section}>
        <CategoryForm />
      </section>
    </>
  );
}

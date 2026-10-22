import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/server/db";
import { requireAdmin } from "@/server/auth/session";
import { centsToEuro, type ProductFormValues } from "@/lib/catalog-input";
import { ProductForm } from "./ProductForm";
import a from "../../admin.module.scss";

export async function generateMetadata({ params }: PageProps<"/admin/produkti/[id]">): Promise<Metadata> {
  const product = await db.products.getById((await params).id);
  return { title: product?.name ?? "Produkts" };
}

export default async function EditProduct({ params }: PageProps<"/admin/produkti/[id]">) {
  await requireAdmin();
  const [product, categories] = await Promise.all([
    db.products.getById((await params).id),
    db.categories.list(),
  ]);
  if (!product) notFound();

  const values: ProductFormValues = {
    id: product.id,
    name: product.name,
    slug: product.slug,
    description: product.description,
    categoryId: product.categoryId,
    status: product.status,
    isAlcohol: product.isAlcohol,
    badge: product.badge ?? "",
    abv: product.abv === undefined ? "" : String(product.abv).replace(".", ","),
    country: product.country ?? "",
    producer: product.producer ?? "",
    variants: product.variants.map((v) => ({
      id: v.id,
      label: v.label,
      price: centsToEuro(v.priceCents),
      active: v.active,
    })),
  };

  return (
    <>
      <Link href="/admin/produkti" className={a.back}>
        ← Produkti
      </Link>
      <div className={a.pageHead}>
        <h1 className={a.title}>{product.name}</h1>
        <span className={a.muted}>
          Labots {new Date(product.updatedAt).toLocaleString("lv-LV")}
          {product.status === "published" && (
            <>
              {" · "}
              <Link href={`/produkts/${product.slug}`} target="_blank">
                Skatīt veikalā ↗
              </Link>
            </>
          )}
        </span>
      </div>
      <ProductForm
        initial={values}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
        images={product.images}
      />
    </>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getCategories,
  getProductBySlug,
  getRelatedProducts,
  getVisibleProducts,
} from "@/server/catalog";
import { activeVariants } from "@/lib/money";
import { formatAbv } from "@/lib/format";
import { toCardData } from "@/lib/product-card";
import { ProductHero } from "@/components/product/ProductHero";
import { ProductGrid } from "@/components/product/ProductCard";
import s from "./page.module.scss";

export async function generateStaticParams() {
  const products = await getVisibleProducts();
  return products.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: PageProps<"/produkts/[slug]">): Promise<Metadata> {
  const product = await getProductBySlug((await params).slug);
  if (!product) return {};
  return {
    title: product.name,
    description: product.description,
    alternates: { canonical: `/produkts/${product.slug}` },
    openGraph: {
      title: product.name,
      description: product.description,
      images: product.images.slice(0, 1).map((i) => ({ url: i.url, alt: i.alt })),
    },
  };
}

export default async function ProductPage({ params }: PageProps<"/produkts/[slug]">) {
  const product = await getProductBySlug((await params).slug);
  if (!product) notFound();

  const [categories, related] = await Promise.all([getCategories(), getRelatedProducts(product, 4)]);
  const category = categories.find((c) => c.id === product.categoryId);
  const variants = activeVariants(product);

  const details: [string, React.ReactNode][] = [
    ["Kategorija", category && <Link href={`/katalogs/${category.slug}`}>{category.name}</Link>],
    ["Ražotājs", product.producer],
    ["Valsts", product.country],
    ["Alkohols", product.abv !== undefined && formatAbv(product.abv)],
    ["Tilpums", variants.map((v) => v.label).join(", ")],
  ];

  return (
    <div className={s.page}>
      <nav aria-label="Navigācija" className={s.breadcrumbs}>
        <ol>
          <li>
            <Link href="/">Sākums</Link>
          </li>
          {category && (
            <li>
              <Link href={`/katalogs/${category.slug}`}>{category.name}</Link>
            </li>
          )}
          <li aria-current="page">{product.name}</li>
        </ol>
      </nav>

      <ProductHero
        product={{
          id: product.id,
          slug: product.slug,
          name: product.name,
          isAlcohol: product.isAlcohol,
          badge: product.badge,
          images: product.images,
          variants,
        }}
      >
        <section className={s.details}>
          <h2 className={s.detailsTitle}>Par produktu</h2>
          <p className={s.description}>{product.description}</p>
          <dl className={s.specs}>
            {details
              .filter(([, value]) => value)
              .map(([label, value]) => (
                <div key={label}>
                  <dt>{label}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      </ProductHero>

      {related.length > 0 && (
        <section className={s.related}>
          <h2 className={s.relatedTitle}>Līdzīgi produkti</h2>
          <ProductGrid products={related.map(toCardData)} />
        </section>
      )}
    </div>
  );
}

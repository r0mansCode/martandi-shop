import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategories, getCategoryBySlug, getProductsByCategory, getVisibleProducts } from "@/server/catalog";
import { getCategoryLinks } from "@/server/catalog-links";
import { toCardData } from "@/lib/product-card";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((c) => ({ kategorija: c.slug }));
}

export async function generateMetadata({ params }: PageProps<"/katalogs/[kategorija]">): Promise<Metadata> {
  const category = await getCategoryBySlug((await params).kategorija);
  if (!category) return {};
  return {
    title: category.name,
    description: category.description,
    alternates: { canonical: `/katalogs/${category.slug}` },
  };
}

export default async function CategoryPage({ params }: PageProps<"/katalogs/[kategorija]">) {
  const category = await getCategoryBySlug((await params).kategorija);
  if (!category) notFound();

  const [products, categories, all] = await Promise.all([
    getProductsByCategory(category.id),
    getCategoryLinks(),
    getVisibleProducts(),
  ]);

  return (
    <CatalogBrowser
      title={category.name}
      description={category.description}
      products={products.map(toCardData)}
      categories={categories}
      currentCategory={category.slug}
      totalCount={all.length}
    />
  );
}

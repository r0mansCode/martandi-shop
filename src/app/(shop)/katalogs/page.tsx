import type { Metadata } from "next";
import { getVisibleProducts } from "@/server/catalog";
import { getCategoryLinks } from "@/server/catalog-links";
import { toCardData } from "@/lib/product-card";
import { CatalogBrowser } from "@/components/catalog/CatalogBrowser";

export const metadata: Metadata = {
  title: "Visi produkti",
  description: "Vīni, stiprie un bezalkoholiskie dzērieni ar saņemšanu veikalā Rīgā.",
  alternates: { canonical: "/katalogs" },
};

export default async function CatalogPage() {
  const [products, categories] = await Promise.all([getVisibleProducts(), getCategoryLinks()]);

  return (
    <CatalogBrowser
      title="Visi produkti"
      products={products.map(toCardData)}
      categories={categories}
      currentCategory={null}
      totalCount={products.length}
    />
  );
}

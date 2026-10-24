import type { Metadata } from "next";
import { getVisibleProducts } from "@/server/catalog";
import { toCardData } from "@/lib/product-card";
import { ProductGrid } from "@/components/product/ProductCard";
import { CartView } from "@/components/cart/CartView";
import s from "./page.module.scss";

export const metadata: Metadata = {
  title: "Grozs",
  robots: { index: false },
};

export default async function CartPage() {
  const products = await getVisibleProducts();
  const lastMinute = products.filter((p) => p.badge === "Populārs").slice(0, 4).map(toCardData);

  return (
    <div className={s.page}>
      <CartView />

      {lastMinute.length > 0 && (
        <section className={s.lastMinute}>
          <h2 className={s.lastMinuteTitle}>Pēdējā brīža pirkumi</h2>
          <ProductGrid products={lastMinute} />
        </section>
      )}
    </div>
  );
}

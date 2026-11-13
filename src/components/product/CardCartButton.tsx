"use client";

import { useEffect, useState } from "react";
import { addToCart } from "@/lib/cart";
import type { ProductCardData } from "@/lib/product-card";
import { CheckIcon } from "@/components/icons";
import s from "./ProductCard.module.scss";

/** "Ielikt grozā" on a product card; only for products with a single size (`quickAdd`). */
export function CardCartButton({ product }: { product: ProductCardData & { quickAdd: NonNullable<ProductCardData["quickAdd"]> } }) {
  const [added, setAdded] = useState(false);

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 2000);
    return () => clearTimeout(t);
  }, [added]);

  const { quickAdd } = product;

  return (
    <button
      type="button"
      className={added ? `${s.cartButton} ${s.cartButtonAdded}` : s.cartButton}
      aria-label={`Ielikt grozā: ${product.name}, ${quickAdd.label}`}
      onClick={() => {
        addToCart(
          {
            productId: product.id,
            variantId: quickAdd.variantId,
            slug: product.slug,
            name: product.name,
            variantLabel: quickAdd.label,
            priceCents: quickAdd.priceCents,
            image: quickAdd.image,
            isAlcohol: product.isAlcohol,
          },
          1,
        );
        setAdded(true);
      }}
    >
      {added ? (
        <>
          <CheckIcon width={16} height={16} /> Ielikts grozā
        </>
      ) : (
        "Ielikt grozā"
      )}
    </button>
  );
}

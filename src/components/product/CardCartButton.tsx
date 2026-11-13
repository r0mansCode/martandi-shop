"use client";

import { addToCart, MAX_QTY, removeLine, setQty, useCart } from "@/lib/cart";
import type { ProductCardData } from "@/lib/product-card";
import { MinusIcon, PlusIcon } from "@/components/icons";
import s from "./ProductCard.module.scss";

/**
 * "Ielikt grozā" on a product card; only for products with a single size (`quickAdd`).
 * Once the product is in the cart the button turns into a − / count / + stepper;
 * going below 1 takes it out of the cart again.
 */
export function CardCartButton({ product }: { product: ProductCardData & { quickAdd: NonNullable<ProductCardData["quickAdd"]> } }) {
  const { quickAdd } = product;
  const qty = useCart().find((l) => l.variantId === quickAdd.variantId)?.qty ?? 0;

  const add = () =>
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

  if (qty === 0) {
    return (
      <button
        type="button"
        className={s.cartButton}
        aria-label={`Ielikt grozā: ${product.name}, ${quickAdd.label}`}
        onClick={add}
      >
        Ielikt grozā
      </button>
    );
  }

  return (
    <div className={s.stepper} role="group" aria-label={`${product.name} grozā`}>
      <button
        type="button"
        className={s.stepperButton}
        aria-label={qty === 1 ? "Izņemt no groza" : "Samazināt daudzumu"}
        onClick={() => (qty === 1 ? removeLine(quickAdd.variantId) : setQty(quickAdd.variantId, qty - 1))}
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span className={s.stepperCount} aria-live="polite">
        {qty}
        <span className={s.stepperUnit}> grozā</span>
      </span>
      <button
        type="button"
        className={s.stepperButton}
        aria-label="Palielināt daudzumu"
        disabled={qty >= MAX_QTY}
        onClick={add}
      >
        <PlusIcon width={16} height={16} />
      </button>
    </div>
  );
}

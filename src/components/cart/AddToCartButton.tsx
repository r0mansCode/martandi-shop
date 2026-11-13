"use client";

import { addToCart, MAX_QTY, removeLine, setQty, useCart, type CartLine } from "@/lib/cart";
import { MinusIcon, PlusIcon } from "@/components/icons";
import s from "./AddToCartButton.module.scss";

type Props = {
  /** The line to add; the cart snapshots these display fields. */
  line: Omit<CartLine, "qty">;
  /** "card" (outlined, compact) on product cards; "page" (filled, taller) on the product page. */
  size?: "card" | "page";
};

/**
 * "Ielikt grozā" button shared by product cards and the product page.
 * Once the variant is in the cart it turns into a − / count / + stepper;
 * going below 1 takes it out of the cart again.
 */
export function AddToCartButton({ line, size = "card" }: Props) {
  const qty = useCart().find((l) => l.variantId === line.variantId)?.qty ?? 0;
  const sizeClass = size === "page" ? s.page : s.card;
  const add = () => addToCart(line, 1);

  if (qty === 0) {
    return (
      <button
        type="button"
        className={`${s.button} ${sizeClass}`}
        aria-label={`Ielikt grozā: ${line.name}, ${line.variantLabel}`}
        onClick={add}
      >
        Ielikt grozā
      </button>
    );
  }

  return (
    <div className={`${s.stepper} ${sizeClass}`} role="group" aria-label={`${line.name}, ${line.variantLabel} grozā`}>
      <button
        type="button"
        className={s.stepperButton}
        aria-label={qty === 1 ? "Izņemt no groza" : "Samazināt daudzumu"}
        onClick={() => (qty === 1 ? removeLine(line.variantId) : setQty(line.variantId, qty - 1))}
      >
        <MinusIcon width={16} height={16} />
      </button>
      <span className={s.count} aria-live="polite">
        {qty}
        <span className={s.unit}> grozā</span>
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

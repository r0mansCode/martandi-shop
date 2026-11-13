import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import { formatAbv, plural } from "@/lib/format";
import type { ProductCardData } from "@/lib/product-card";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import cartButton from "@/components/cart/AddToCartButton.module.scss";
import s from "./ProductCard.module.scss";

type Props = {
  product: ProductCardData;
  /** Above-the-fold cards load eagerly. */
  eager?: boolean;
};

export function ProductCard({ product: p, eager }: Props) {
  const meta = [p.abv !== undefined && formatAbv(p.abv), p.country].filter(Boolean).join(" · ");
  const volume =
    p.singleVariantLabel ?? `${p.variantCount} ${plural(p.variantCount, "tilpums", "tilpumi")}`;
  const href = `/produkts/${p.slug}`;

  return (
    <article className={s.card}>
      <Link href={href} className={s.link}>
        <div className={s.tile}>
          {p.image && (
            <Image
              src={p.image.url}
              alt={p.image.alt}
              fill
              sizes="(min-width: 1024px) 18rem, (min-width: 768px) 25vw, 50vw"
              className={s.image}
              loading={eager ? "eager" : "lazy"}
            />
          )}
          {p.badge && <span className={s.badge}>{p.badge}</span>}
        </div>
        <p className={s.price}>
          {p.variantCount > 1 && <span className={s.from}>no </span>}
          {formatPrice(p.fromPriceCents)}
        </p>
        <p className={s.name}>{p.name}</p>
        <p className={s.meta}>
          {volume}
          {meta && ` · ${meta}`}
        </p>
      </Link>

      {/* One size: add straight from the card. Several: the size is picked on the product page. */}
      {p.quickAdd ? (
        <AddToCartButton
          line={{
            productId: p.id,
            variantId: p.quickAdd.variantId,
            slug: p.slug,
            name: p.name,
            variantLabel: p.quickAdd.label,
            priceCents: p.quickAdd.priceCents,
            depositCents: p.quickAdd.depositCents,
            image: p.quickAdd.image,
            isAlcohol: p.isAlcohol,
          }}
        />
      ) : (
        // Same destination as the card link above, so it's skipped by keyboard and screen readers.
        <Link href={href} className={`${cartButton.button} ${cartButton.card}`} tabIndex={-1} aria-hidden>
          Izvēlēties tilpumu
        </Link>
      )}
    </article>
  );
}

export function ProductGrid({ products, eagerCount = 0 }: { products: ProductCardData[]; eagerCount?: number }) {
  return (
    <ul className={s.grid}>
      {products.map((p, i) => (
        <li key={p.id}>
          <ProductCard product={p} eager={i < eagerCount} />
        </li>
      ))}
    </ul>
  );
}

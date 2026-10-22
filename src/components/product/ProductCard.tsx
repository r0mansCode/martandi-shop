import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/money";
import { formatAbv, plural } from "@/lib/format";
import type { ProductCardData } from "@/lib/product-card";
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

  return (
    <Link href={`/produkts/${p.slug}`} className={s.card}>
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

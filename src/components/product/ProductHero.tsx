"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useId, useState, type ReactNode } from "react";
import { addToCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import type { ProductBadge, ProductImage, Variant } from "@/lib/types";
import { pickup, site } from "@/config/site";
import { CheckIcon, IdIcon, StoreIcon } from "@/components/icons";
import s from "./ProductHero.module.scss";

type Props = {
  product: {
    id: string;
    slug: string;
    name: string;
    isAlcohol: boolean;
    badge?: ProductBadge;
    images: ProductImage[];
    /** Active variants only. */
    variants: Variant[];
  };
  /** Server-rendered details and description, shown under the buy box. */
  children: ReactNode;
};

const QTY_OPTIONS = Array.from({ length: 12 }, (_, i) => i + 1);

export function ProductHero({ product, children }: Props) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);
  const qtyId = useId();

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  // Selected variant's own image first, then the rest.
  const images = variant.image
    ? [
        ...product.images.filter((i) => i.url === variant.image),
        ...product.images.filter((i) => i.url !== variant.image),
      ]
    : product.images;

  useEffect(() => {
    if (!added) return;
    const t = setTimeout(() => setAdded(false), 3000);
    return () => clearTimeout(t);
  }, [added]);

  const onAdd = () => {
    addToCart(
      {
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.label,
        priceCents: variant.priceCents,
        image: variant.image ?? product.images[0]?.url ?? null,
        isAlcohol: product.isAlcohol,
      },
      qty,
    );
    setAdded(true);
  };

  return (
    <div className={s.hero}>
      <div className={images.length > 1 ? `${s.gallery} ${s.galleryMulti}` : s.gallery}>
        {images.map((img, i) => (
          <div key={img.url} className={s.frame}>
            <Image
              src={img.url}
              alt={img.alt}
              fill
              sizes={images.length > 1 ? "(min-width: 1024px) 30vw, 85vw" : "(min-width: 1024px) 55vw, 100vw"}
              className={s.image}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : undefined}
            />
          </div>
        ))}
      </div>

      <div className={s.info}>
        {product.badge && <p className={s.badge}>{product.badge}</p>}
        <h1 className={s.title}>{product.name}</h1>
        <p className={s.price}>{formatPrice(variant.priceCents)}</p>
        <p className={s.vat}>Cena ar PVN</p>

        {product.variants.length > 1 ? (
          <fieldset className={s.variants}>
            <legend className={s.label}>
              Tilpums: <strong>{variant.label}</strong>
            </legend>
            <div className={s.variantList}>
              {product.variants.map((v) => (
                <label key={v.id} className={v.id === variant.id ? `${s.variant} ${s.selected}` : s.variant}>
                  <input
                    type="radio"
                    name="variant"
                    value={v.id}
                    checked={v.id === variant.id}
                    onChange={() => setVariantId(v.id)}
                  />
                  {v.label}
                </label>
              ))}
            </div>
          </fieldset>
        ) : (
          <p className={s.label}>
            Tilpums: <strong>{variant.label}</strong>
          </p>
        )}

        <div className={s.qty}>
          <label htmlFor={qtyId} className={s.label}>
            Daudzums
          </label>
          <select id={qtyId} value={qty} onChange={(e) => setQty(Number(e.target.value))}>
            {QTY_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n} ({formatPrice(n * variant.priceCents)})
              </option>
            ))}
          </select>
        </div>

        <button type="button" className={s.add} onClick={onAdd}>
          {added ? (
            <>
              <CheckIcon width={18} height={18} /> Pievienots grozam
            </>
          ) : (
            "Pievienot grozam"
          )}
        </button>
        <p className={s.addedNote} aria-live="polite">
          {added && <Link href="/grozs">Skatīt grozu</Link>}
        </p>

        <div className={s.panel}>
          <div className={s.panelRow}>
            <StoreIcon className={s.panelIcon} />
            <div>
              <p className={s.panelTitle}>Saņemšana tikai veikalā</p>
              <p>{pickup.address}</p>
              <p className={s.panelMuted}>{pickup.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}</p>
            </div>
          </div>
          {product.isAlcohol && (
            <div className={s.panelRow}>
              <IdIcon className={s.panelIcon} />
              <div>
                <p className={s.panelTitle}>Tikai no {site.minimumAge} gadu vecuma</p>
                <p>Saņemot pasūtījumu, jāuzrāda personu apliecinošs dokuments.</p>
              </div>
            </div>
          )}
        </div>

        {children}
      </div>
    </div>
  );
}

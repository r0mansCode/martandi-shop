"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type ReactNode } from "react";
import { useCart } from "@/lib/cart";
import { formatPrice } from "@/lib/money";
import type { ProductBadge, ProductImage, Variant } from "@/lib/types";
import { pickup, site } from "@/config/site";
import { AddToCartButton } from "@/components/cart/AddToCartButton";
import { IdIcon, StoreIcon } from "@/components/icons";
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

export function ProductHero({ product, children }: Props) {
  const [variantId, setVariantId] = useState(product.variants[0].id);
  const galleryRef = useRef<HTMLDivElement>(null);

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];

  // Images keep their order; the selected variant's own image is outlined instead.
  const images = product.images;
  const highlight = images.length > 1 ? variant.image : undefined;

  const selectVariant = (v: Variant) => {
    setVariantId(v.id);
    // Mobile gallery is a swipe row: bring the outlined image into view without scrolling the page.
    const gallery = galleryRef.current;
    const frame = gallery?.querySelector<HTMLElement>(`[data-url="${CSS.escape(v.image ?? "")}"]`);
    if (gallery && frame && gallery.scrollWidth > gallery.clientWidth) {
      gallery.scrollTo({ left: frame.offsetLeft - gallery.offsetLeft, behavior: "smooth" });
    }
  };

  const inCart = useCart().some((l) => l.variantId === variant.id);

  return (
    <div className={s.hero}>
      <div ref={galleryRef} className={images.length > 1 ? `${s.gallery} ${s.galleryMulti}` : s.gallery}>
        {images.map((img, i) => (
          <div
            key={img.url}
            data-url={img.url}
            className={img.url === highlight ? `${s.frame} ${s.frameActive}` : s.frame}
          >
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
        <p className={s.vat}>
          Cena ar PVN
          {variant.depositCents ? ` + depozīts ${formatPrice(variant.depositCents)}` : ""}
        </p>

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
                    onChange={() => selectVariant(v)}
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

        <AddToCartButton
          size="page"
          line={{
            productId: product.id,
            variantId: variant.id,
            slug: product.slug,
            name: product.name,
            variantLabel: variant.label,
            priceCents: variant.priceCents,
            depositCents: variant.depositCents,
            image: variant.image ?? product.images[0]?.url ?? null,
            isAlcohol: product.isAlcohol,
          }}
        />
        <p className={s.addedNote}>{inCart && <Link href="/grozs">Skatīt grozu</Link>}</p>

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

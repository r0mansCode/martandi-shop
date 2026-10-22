import Image from "next/image";
import Link from "next/link";
import { getCategories, getVisibleProducts } from "@/server/catalog";
import { toCardData } from "@/lib/product-card";
import { ProductGrid } from "@/components/product/ProductCard";
import { pickup, site } from "@/config/site";
import s from "./page.module.scss";

export default async function Home() {
  const [categories, products] = await Promise.all([getCategories(), getVisibleProducts()]);

  // Category tile image: prefer a popular product, otherwise the first one.
  const tiles = categories
    .map((c) => {
      const inCategory = products.filter((p) => p.categoryId === c.id);
      const pick = inCategory.find((p) => p.badge === "Populārs") ?? inCategory[0];
      return { category: c, image: pick?.images[0] };
    })
    .filter((t) => t.image);

  const popular = products.filter((p) => p.badge === "Populārs").slice(0, 8).map(toCardData);
  const fresh = products.filter((p) => p.badge === "Jaunums").slice(0, 8).map(toCardData);

  return (
    <>
      <section className={s.hero}>
        <div className={s.heroInner}>
          <h1 className={s.heroTitle}>Laipni lūgti Martandi Veikalā</h1>
          <p className={s.heroLead}>Vīni, stiprie un bezalkoholiskie dzērieni ar saņemšanu veikalā Rīgā.</p>
          <ul className={s.tiles}>
            {tiles.map(({ category, image }, i) => (
              <li key={category.id}>
                <Link href={`/katalogs/${category.slug}`} className={s.tile}>
                  <span className={s.tileImage}>
                    <Image
                      src={image!.url}
                      alt=""
                      fill
                      sizes="10rem"
                      className={s.tileImg}
                      loading={i < 6 ? "eager" : "lazy"}
                    />
                  </span>
                  <span className={s.tileName}>{category.name}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className={s.section}>
        <div className={s.sectionHead}>
          <h2 className={s.sectionTitle}>Populārākie</h2>
          <Link href="/katalogs" className={s.more}>
            Skatīt visus produktus
          </Link>
        </div>
        <ProductGrid products={popular} />
      </section>

      <section className={s.promo}>
        <div className={s.promoInner}>
          <div>
            <h2 className={s.promoTitle}>Pasūti tiešsaistē – saņem veikalā</h2>
            <p className={s.promoText}>
              {pickup.address}
              <br />
              {pickup.hours.map((h) => `${h.days} ${h.time}`).join(" · ")}
            </p>
          </div>
          <ol className={s.steps}>
            <li>Noformē pasūtījumu un saņem rēķinu e-pastā.</li>
            <li>Apmaksā rēķinu ar bankas pārskaitījumu {site.paymentDueDays} dienu laikā.</li>
            <li>Saņem pasūtījumu veikalā, uzrādot personu apliecinošu dokumentu.</li>
          </ol>
        </div>
      </section>

      {fresh.length > 0 && (
        <section className={s.section}>
          <div className={s.sectionHead}>
            <h2 className={s.sectionTitle}>Jaunumi</h2>
          </div>
          <ProductGrid products={fresh} />
        </section>
      )}
    </>
  );
}

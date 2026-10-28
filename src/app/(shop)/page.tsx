import Image from "next/image";
import Link from "next/link";
import { getCategories, getVisibleProducts } from "@/server/catalog";
import { toCardData } from "@/lib/product-card";
import { ProductGrid } from "@/components/product/ProductCard";
import { pickup, site } from "@/config/site";
import { Carousel } from "@/components/ui/Carousel";
import { plural } from "@/lib/format";
import sparklingPhoto from "../../../public/images/home/dzirkstosais-vins.jpg";
import frogPhoto from "../../../public/images/home/varde-ar-pudelem.jpg";
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

  // Story sections: figures come from the live catalog so the copy never overpromises.
  const countryCount = new Set(products.flatMap((p) => p.country ?? [])).size;
  const sparkling = categories.find((c) => c.id === "c04");
  const topCategories = categories
    .map((c) => ({ ...c, count: products.filter((p) => p.categoryId === c.id).length }))
    .filter((c) => c.count > 0)
    .toSorted((a, b) => b.count - a.count)
    .slice(0, 6);

  return (
    <>
      <section className={s.hero}>
        <div className={s.heroInner}>
          <h1 className={s.heroTitle}>Laipni lūgti {site.name}</h1>
          <p className={s.heroLead}>Vīni, stiprie un bezalkoholiskie dzērieni ar saņemšanu veikalā Rīgā.</p>
          <Carousel label="Iepirkties pēc kategorijas" className={s.tilesCarousel} trackClassName={s.tiles}>
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
          </Carousel>
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

      <section className={s.story} aria-labelledby="par-veikalu">
        <div className={s.storyImage}>
          <Image
            src={sparklingPhoto}
            alt="Dzirkstošais vīns tiek ieliets glāzē svinību galdā"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            placeholder="blur"
            className={s.storyImg}
          />
        </div>
        <div className={s.storyText}>
          <p className={s.kicker}>Par veikalu</p>
          <h2 id="par-veikalu" className={s.storyTitle}>
            Labi dzērieni svētkiem un ikdienai – tepat Rīgā
          </h2>
          <p className={s.storyLead}>
            {site.name} ir dzērienu veikals Krustpils ielā. Izvēlieties mierīgi tiešsaistē – mēs sagatavosim pasūtījumu, un
            jūs to saņemsiet veikalā, kad jums ērti.
          </p>
          <ul className={s.benefits}>
            <li>
              <strong>
                {products.length} {plural(products.length, "dzēriens", "dzērieni")}
              </strong>
              <span>
                Vīni, stiprie un bezalkoholiskie dzērieni no {countryCount} {plural(countryCount, "valsts", "valstīm")}.
              </span>
            </li>
            <li>
              <strong>Bez piegādes maksas</strong>
              <span>Pasūtījumu izsniedzam veikalā – maksājat tikai par dzērieniem.</span>
            </li>
            <li>
              <strong>Apmaksa ar rēķinu</strong>
              <span>Rēķinu saņemat e-pastā, apmaksai {site.paymentDueDays} dienas.</span>
            </li>
          </ul>
          <div className={s.storyActions}>
            <Link href="/katalogs" className={s.buttonPrimary}>
              Skatīt visus dzērienus
            </Link>
            {sparkling && (
              <Link href={`/katalogs/${sparkling.slug}`} className={s.buttonSecondary}>
                Dzirkstošie vīni svētkiem
              </Link>
            )}
          </div>
        </div>
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

      <section className={`${s.story} ${s.storyReverse}`} aria-labelledby="atrodi-savu">
        <div className={s.storyImage}>
          <Image
            src={frogPhoto}
            alt="Varde ar vīna glāzi starp divām pudelēm ar dzērieniem"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            placeholder="blur"
            className={s.storyImg}
          />
        </div>
        <div className={s.storyText}>
          <p className={s.kicker}>Katram gadījumam</p>
          <h2 id="atrodi-savu" className={s.storyTitle}>
            Nezināt, ko izvēlēties? Sāciet šeit.
          </h2>
          <p className={s.storyLead}>
            Sarkanvīns vakariņām, baltvīns pie zivs, konjaks dāvanai vai bezalkoholisks dzēriens tiem, kas pie stūres.
            Katram produktam norādīts tilpums, stiprums un izcelsme, bet katalogā varat atlasīt pēc valsts un ražotāja.
          </p>
          <ul className={s.storyCategories}>
            {topCategories.map((c) => (
              <li key={c.id}>
                <Link href={`/katalogs/${c.slug}`} className={s.categoryPill}>
                  {c.name} <span>{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className={s.storyActions}>
            <Link href="/katalogs" className={s.buttonPrimary}>
              Atvērt katalogu
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}

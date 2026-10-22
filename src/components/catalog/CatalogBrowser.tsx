"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { ProductGrid } from "@/components/product/ProductCard";
import { plural } from "@/lib/format";
import { buildHaystack, matchesQuery } from "@/lib/search";
import type { ProductCardData } from "@/lib/product-card";
import s from "./CatalogBrowser.module.scss";

export type CategoryLink = { id: string; slug: string; name: string; count: number };

type Sort = "ieteicamie" | "cena-aug" | "cena-dilst" | "nosaukums";
type AbvBucket = "bez" | "lidz-15" | "15-30" | "virs-30";

type Filters = {
  q: string;
  country: string[];
  producer: string[];
  abv: AbvBucket[];
  sort: Sort;
};

const EMPTY: Filters = { q: "", country: [], producer: [], abv: [], sort: "ieteicamie" };

const SORTS: { value: Sort; label: string }[] = [
  { value: "ieteicamie", label: "Ieteicamie" },
  { value: "cena-aug", label: "Cena: no zemākās" },
  { value: "cena-dilst", label: "Cena: no augstākās" },
  { value: "nosaukums", label: "Nosaukums: A–Z" },
];

const ABV_BUCKETS: { value: AbvBucket; label: string; test: (abv?: number) => boolean }[] = [
  { value: "bez", label: "Bez alkohola", test: (a) => a === undefined },
  { value: "lidz-15", label: "Līdz 15%", test: (a) => a !== undefined && a <= 15 },
  { value: "15-30", label: "15–30%", test: (a) => a !== undefined && a > 15 && a <= 30 },
  { value: "virs-30", label: "Virs 30%", test: (a) => a !== undefined && a > 30 },
];

const PRODUCERS_COLLAPSED = 8;

function parse(search: string): Filters {
  const p = new URLSearchParams(search);
  const sort = p.get("kartot") as Sort | null;
  return {
    q: p.get("q") ?? "",
    country: p.getAll("valsts"),
    producer: p.getAll("razotajs"),
    abv: p.getAll("alkohols").filter((v): v is AbvBucket => ABV_BUCKETS.some((b) => b.value === v)),
    sort: sort && SORTS.some((x) => x.value === sort) ? sort : "ieteicamie",
  };
}

function serialize(f: Filters): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  f.country.forEach((v) => p.append("valsts", v));
  f.producer.forEach((v) => p.append("razotajs", v));
  f.abv.forEach((v) => p.append("alkohols", v));
  if (f.sort !== "ieteicamie") p.set("kartot", f.sort);
  const str = p.toString();
  return str ? `?${str}` : "";
}

/** Distinct values with counts, most common first. */
function facet(products: ProductCardData[], key: "country" | "producer") {
  const counts = new Map<string, number>();
  for (const p of products) {
    const v = p[key];
    if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "lv"));
}

/**
 * Reads filters from the URL. Isolated behind Suspense so useSearchParams
 * doesn't force the whole catalog to render client-side only.
 */
function UrlFilters({ onChange }: { onChange: (f: Filters) => void }) {
  const search = useSearchParams().toString();
  useEffect(() => onChange(parse(search)), [search, onChange]);
  return null;
}

type Props = {
  title: string;
  description?: string;
  products: ProductCardData[];
  categories: CategoryLink[];
  /** Slug of the current category, or null for "all products". */
  currentCategory: string | null;
  totalCount: number;
};

export function CatalogBrowser({ title, description, products, categories, currentCategory, totalCount }: Props) {
  // Start unfiltered so the server-rendered HTML lists every product (SEO),
  // then apply filters from the URL after hydration.
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [showAllProducers, setShowAllProducers] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const update = (patch: Partial<Filters>) => {
    const next = { ...filters, ...patch };
    setFilters(next);
    window.history.replaceState(null, "", `${window.location.pathname}${serialize(next)}`);
  };

  const toggle = <K extends "country" | "producer" | "abv">(key: K, value: Filters[K][number]) => {
    const list = filters[key] as string[];
    update({ [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value] });
  };

  const countries = useMemo(() => facet(products, "country"), [products]);
  const producers = useMemo(() => facet(products, "producer"), [products]);
  // Same fields as the header search index, so both find the same products.
  const haystacks = useMemo(() => {
    const categoryName = new Map(categories.map((c) => [c.id, c.name]));
    return new Map(products.map((p) => [p.id, buildHaystack(p, categoryName.get(p.categoryId))]));
  }, [products, categories]);
  const usedBuckets = ABV_BUCKETS.filter((b) => products.some((p) => b.test(p.abv)));

  const visible = useMemo(() => {
    const buckets = ABV_BUCKETS.filter((b) => filters.abv.includes(b.value));
    const list = products.filter(
      (p) =>
        (!filters.q || matchesQuery(haystacks.get(p.id)!, filters.q)) &&
        (!filters.country.length || (p.country && filters.country.includes(p.country))) &&
        (!filters.producer.length || (p.producer && filters.producer.includes(p.producer))) &&
        (!buckets.length || buckets.some((b) => b.test(p.abv))),
    );
    switch (filters.sort) {
      case "cena-aug":
        return list.toSorted((a, b) => a.fromPriceCents - b.fromPriceCents);
      case "cena-dilst":
        return list.toSorted((a, b) => b.fromPriceCents - a.fromPriceCents);
      case "nosaukums":
        return list.toSorted((a, b) => a.name.localeCompare(b.name, "lv"));
      default:
        return list;
    }
  }, [products, filters, haystacks]);

  const chips = [
    ...filters.abv.map((v) => ({
      key: `abv-${v}`,
      label: ABV_BUCKETS.find((b) => b.value === v)!.label,
      remove: () => toggle("abv", v),
    })),
    ...filters.country.map((v) => ({ key: `country-${v}`, label: v, remove: () => toggle("country", v) })),
    ...filters.producer.map((v) => ({ key: `producer-${v}`, label: v, remove: () => toggle("producer", v) })),
  ];
  const activeCount = chips.length + (filters.q ? 1 : 0);
  const shownProducers = showAllProducers ? producers : producers.slice(0, PRODUCERS_COLLAPSED);

  return (
    <div className={s.layout}>
      <Suspense fallback={null}>
        <UrlFilters onChange={setFilters} />
      </Suspense>
      <aside className={s.sidebar}>
        <nav aria-label="Kataloga kategorijas" className={s.categoryNav}>
          <h2 className={s.sideHeading}>Kategorijas</h2>
          <ul className={s.categoryList}>
            <li>
              <Link href="/katalogs" className={currentCategory === null ? s.current : undefined}>
                Visi produkti <span className={s.count}>{totalCount}</span>
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.slug}>
                <Link
                  href={`/katalogs/${c.slug}`}
                  className={currentCategory === c.slug ? s.current : undefined}
                  aria-current={currentCategory === c.slug ? "page" : undefined}
                >
                  {c.name} <span className={s.count}>{c.count}</span>
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <button
          type="button"
          className={s.filtersToggle}
          aria-expanded={filtersOpen}
          onClick={() => setFiltersOpen((o) => !o)}
        >
          Filtri{activeCount > 0 && ` (${activeCount})`}
        </button>

        <div className={filtersOpen ? `${s.filters} ${s.filtersOpen}` : s.filters}>
          {usedBuckets.length > 1 && (
            <fieldset className={s.group}>
              <legend className={s.sideHeading}>Alkohols</legend>
              {usedBuckets.map((b) => (
                <label key={b.value} className={s.check}>
                  <input
                    type="checkbox"
                    checked={filters.abv.includes(b.value)}
                    onChange={() => toggle("abv", b.value)}
                  />
                  {b.label}
                </label>
              ))}
            </fieldset>
          )}

          {countries.length > 1 && (
            <fieldset className={s.group}>
              <legend className={s.sideHeading}>Valsts</legend>
              {countries.map(([name, count]) => (
                <label key={name} className={s.check}>
                  <input
                    type="checkbox"
                    checked={filters.country.includes(name)}
                    onChange={() => toggle("country", name)}
                  />
                  {name} <span className={s.count}>{count}</span>
                </label>
              ))}
            </fieldset>
          )}

          {producers.length > 1 && (
            <fieldset className={s.group}>
              <legend className={s.sideHeading}>Ražotājs</legend>
              {shownProducers.map(([name, count]) => (
                <label key={name} className={s.check}>
                  <input
                    type="checkbox"
                    checked={filters.producer.includes(name)}
                    onChange={() => toggle("producer", name)}
                  />
                  {name} <span className={s.count}>{count}</span>
                </label>
              ))}
              {producers.length > PRODUCERS_COLLAPSED && (
                <button type="button" className={s.linkButton} onClick={() => setShowAllProducers((v) => !v)}>
                  {showAllProducers ? "Rādīt mazāk" : `Rādīt visus (${producers.length})`}
                </button>
              )}
            </fieldset>
          )}
        </div>
      </aside>

      <section className={s.content}>
        <div className={s.head}>
          <div>
            <h1 className={s.title}>{title}</h1>
            {description && <p className={s.description}>{description}</p>}
          </div>
          <label className={s.sort}>
            <span className={s.srOnly}>Kārtot</span>
            <select value={filters.sort} onChange={(e) => update({ sort: e.target.value as Sort })}>
              {SORTS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        {activeCount > 0 && (
          <div className={s.chips}>
            {filters.q && (
              <button type="button" className={s.chip} onClick={() => update({ q: "" })}>
                “{filters.q}” ✕
              </button>
            )}
            {chips.map((c) => (
              <button key={c.key} type="button" className={s.chip} onClick={c.remove}>
                {c.label} ✕
              </button>
            ))}
            <button type="button" className={s.linkButton} onClick={() => update({ ...EMPTY, sort: filters.sort })}>
              Notīrīt visus
            </button>
          </div>
        )}

        <p className={s.resultCount} aria-live="polite">
          {visible.length} {plural(visible.length, "produkts", "produkti")}
        </p>

        {visible.length > 0 ? (
          <ProductGrid products={visible} eagerCount={4} />
        ) : (
          <div className={s.empty}>
            <p>Neviens produkts neatbilst izvēlētajiem filtriem.</p>
            <button type="button" className={s.linkButton} onClick={() => update(EMPTY)}>
              Notīrīt filtrus
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

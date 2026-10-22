import { normalizeSearch } from "./format";

/** One entry of the static search index served by /api/search-index. */
export type SearchEntry = {
  slug: string;
  name: string;
  image: string | null;
  fromPriceCents: number;
  hasVariants: boolean;
  /** Normalized name + producer + country + category, for matching. */
  haystack: string;
};

/** Searchable text for a product; shared by the header search and the catalog filter. */
export function buildHaystack(
  p: { name: string; producer?: string; country?: string },
  categoryName?: string,
): string {
  return normalizeSearch([p.name, p.producer, p.country, categoryName].filter(Boolean).join(" "));
}

/** Every word of the query must appear somewhere in the haystack. */
export function matchesQuery(haystack: string, query: string): boolean {
  const words = normalizeSearch(query).split(/\s+/).filter(Boolean);
  return words.every((w) => haystack.includes(w));
}

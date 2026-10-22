import { site } from "@/config/site";

const abvFormat = new Intl.NumberFormat(site.locale, { maximumFractionDigits: 1 });

/** 13.5 → "13,5%" */
export function formatAbv(abv: number): string {
  return `${abvFormat.format(abv)}%`;
}

/** Latvian plural: 1, 21, 31… (not 11) take the singular form. */
export function plural(n: number, one: string, many: string): string {
  return n % 10 === 1 && n % 100 !== 11 ? one : many;
}

/** Lowercase and strip diacritics so "dzirkstošie" matches "dzirkstosie". */
export function normalizeSearch(s: string): string {
  return s.toLocaleLowerCase(site.locale).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

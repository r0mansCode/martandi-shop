import { site } from "@/config/site";

const abvFormat = new Intl.NumberFormat(site.locale, { maximumFractionDigits: 1 });

/** 13.5 → "13,5%" */
export function formatAbv(abv: number): string {
  return `${abvFormat.format(abv)}%`;
}

const dateFormat = new Intl.DateTimeFormat(site.locale, {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  timeZone: site.timeZone,
});

/** ISO timestamp → "11.11.2026." in Riga time. */
export function formatDate(iso: string): string {
  return dateFormat.format(new Date(iso));
}

const dayKeyFormat = new Intl.DateTimeFormat("en-CA", { timeZone: site.timeZone });

/** ISO timestamp → "2026-11-13", the calendar day in Riga (matches <input type="date"> values). */
export function toDayKey(iso: string | Date): string {
  return dayKeyFormat.format(new Date(iso));
}

const dateTimeFormat = new Intl.DateTimeFormat(site.locale, {
  timeZone: site.timeZone,
  dateStyle: "short",
  timeStyle: "short",
});

/** ISO timestamp → "13.11.26 14:05" in Riga time. */
export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

const timeFormat = new Intl.DateTimeFormat(site.locale, { timeZone: site.timeZone, timeStyle: "short" });

/** ISO timestamp → "14:05" in Riga time. */
export function formatTime(iso: string): string {
  return timeFormat.format(new Date(iso));
}

/** Latvian plural: 1, 21, 31… (not 11) take the singular form. */
export function plural(n: number, one: string, many: string): string {
  return n % 10 === 1 && n % 100 !== 11 ? one : many;
}

/** Lowercase and strip diacritics so "dzirkstošie" matches "dzirkstosie". */
export function normalizeSearch(s: string): string {
  return s.toLocaleLowerCase(site.locale).normalize("NFD").replace(/[̀-ͯ]/g, "");
}

import { z } from "zod";

// Shop opening hours (= pickup hours) and an optional closure notice, edited in the admin.
// Client-safe: the storefront formats these, the server stores and validates them.

/** Monday first, like the Latvian week. */
export const WEEKDAYS = [
  { short: "P", name: "Pirmdiena" },
  { short: "O", name: "Otrdiena" },
  { short: "T", name: "Trešdiena" },
  { short: "C", name: "Ceturtdiena" },
  { short: "Pk", name: "Piektdiena" },
  { short: "S", name: "Sestdiena" },
  { short: "Sv", name: "Svētdiena" },
] as const;

const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, "Laiks formātā HH:MM");
const day = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Nederīgs datums");

const dayHours = z
  .object({ closed: z.boolean(), open: time, close: time })
  .refine((d) => d.closed || d.open < d.close, { message: "Jāaizver vēlāk nekā jāatver", path: ["close"] });

export const shopHoursInput = z
  .object({
    week: z.array(dayHours).length(7),
    /** Closure notice, "YYYY-MM-DD"; `closedTo` empty means a single day. */
    closedFrom: day.or(z.literal("")),
    closedTo: day.or(z.literal("")),
  })
  .refine((h) => !h.closedTo || h.closedFrom, { message: "Norādiet sākuma datumu", path: ["closedFrom"] })
  .refine((h) => !h.closedTo || h.closedTo >= h.closedFrom, {
    message: "Beigām jābūt vēlākām par sākumu",
    path: ["closedTo"],
  });

export type ShopHours = z.infer<typeof shopHoursInput>;
export type DayHours = ShopHours["week"][number];

/** What the storefront shows: grouped hours rows and the closure sentence, if any. */
export type PickupInfo = {
  hours: { days: string; time: string }[];
  closure: string | null;
};

const dayTime = (d: DayHours) => (d.closed ? "Slēgts" : `${d.open}–${d.close}`);

/** Groups consecutive days with the same hours: P–Pk 10:00–20:00, S 10:00–18:00, Sv Slēgts. */
export function groupHours(week: DayHours[]): PickupInfo["hours"] {
  const rows: { from: number; to: number; time: string }[] = [];
  week.forEach((d, i) => {
    const t = dayTime(d);
    const last = rows.at(-1);
    if (last && last.time === t) last.to = i;
    else rows.push({ from: i, to: i, time: t });
  });
  return rows.map((r) => ({
    days: r.from === r.to ? WEEKDAYS[r.from].short : `${WEEKDAYS[r.from].short}–${WEEKDAYS[r.to].short}`,
    time: r.time,
  }));
}

export const hoursLine = (hours: PickupInfo["hours"], separator = " · ") =>
  hours.map((h) => `${h.days} ${h.time}`).join(separator);

/** "2026-12-24" → "24.12.2026." */
const lvDate = (key: string) => {
  const [y, m, d] = key.split("-");
  return `${d}.${m}.${y}.`;
};

/**
 * "24.12.2026. datumā būsim slēgti." or "24.12.–26.12.2026. datumos būsim slēgti.";
 * null when no closure is set or it has already ended (`today` is a Riga day key).
 */
export function closureText(h: Pick<ShopHours, "closedFrom" | "closedTo">, today: string): string | null {
  const from = h.closedFrom;
  const to = h.closedTo || from;
  if (!from || to < today) return null;
  if (to === from) return `${lvDate(from)} datumā būsim slēgti.`;
  const start = from.slice(0, 4) === to.slice(0, 4) ? lvDate(from).slice(0, 6) : lvDate(from);
  return `${start}–${lvDate(to)} datumos būsim slēgti.`;
}

export const site = {
  /** Shop brand. The legal seller on invoices is in config/seller.ts. */
  name: "TaviDzērieni.lv",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "lv-LV",
  /** Invoice dates and the invoice-number year use shop time, not UTC. */
  timeZone: "Europe/Riga",
  currency: "EUR",
  vatRate: 0.21,
  paymentDueDays: 14,
  invoicePrefix: "MRT",
  minimumAge: 18,
  /** Packaging deposit (depozīts) suggested when the admin turns it on for a variant; VAT-free. */
  defaultDepositCents: 10,
  /** Shop mailbox (Zoho); also the sender of invoices, so replies land here. */
  email: "veikals@tavidzerieni.lv",
  emailFrom: "TaviDzērieni.lv <veikals@tavidzerieni.lv>",
} as const;

const weekday = { closed: false, open: "10:00", close: "20:00" };

export const pickup = {
  address: "Krustpils iela 58, Rīga, LV-1057",
  /**
   * Opening (= pickup) hours until the admin saves their own in "Darba laiks".
   * Monday first; the stored hours live in the database (server/shop-hours.ts).
   */
  defaultWeek: [
    weekday,
    weekday,
    weekday,
    weekday,
    weekday,
    { closed: false, open: "10:00", close: "18:00" },
    { closed: true, open: "10:00", close: "18:00" },
  ],
};

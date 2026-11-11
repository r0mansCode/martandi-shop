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
  /** Shop mailbox (Zoho); also the sender of invoices, so replies land here. */
  email: "veikals@tavidzerieni.lv",
  emailFrom: "TaviDzērieni.lv <veikals@tavidzerieni.lv>",
} as const;

export const pickup = {
  address: "Krustpils iela 58, Rīga, LV-1057",
  hours: [
    { days: "P–Pk", time: "10:00–20:00" },
    { days: "S", time: "10:00–18:00" },
    { days: "Sv", time: "Slēgts" },
  ],
} as const;

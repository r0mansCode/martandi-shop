export const site = {
  name: "Martandi",
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000",
  locale: "lv-LV",
  currency: "EUR",
  vatRate: 0.21,
  paymentDueDays: 14,
  invoicePrefix: "MRT",
  minimumAge: 18,
  emailFrom: "Martandi <veikals@martandi.lv>",
} as const;

export const pickup = {
  address: "Jūrmalas gatve 16a, Rīga, LV-1083",
  hours: [
    { days: "P–Pk", time: "10:00–20:00" },
    { days: "S", time: "10:00–18:00" },
    { days: "Sv", time: "Slēgts" },
  ],
} as const;
